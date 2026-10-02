import type { Prisma, SystemDb } from "@khmer-micro-store/db";
import { adminExtendSchema, adminPlanChangeSchema, platformSettingsSaveSchema } from "@khmer-micro-store/shared";
import { Body, Controller, Get, HttpCode, Inject, NotFoundException, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { SYSTEM_DB } from "../db";
import { AppException } from "../errors";
import type { AdminIdentity } from "./admin-auth";
import { AdminGuard, AdminPermissionNeeded, CurrentAdmin } from "./admin.guard";
import { MAX_ATTEMPTS_FOR_ADMIN } from "./outbox-limits";
import { applyOverrideToDates, periodEnd } from "./subscription-override";

const DAY_MS = 24 * 60 * 60 * 1000;
const auditQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
  action: z.string().max(60).optional(),
  before: z.string().datetime().optional(),
});
const merchantsQuerySchema = z.object({ q: z.string().trim().max(60).optional() });
const PAGE = 100;

/**
 * The admin area's data (roadmap step 7). The admin sees every shop, so these
 * read and write as the owner database user (CLAUDE.md: SystemDb for admin);
 * AdminGuard checks the admin's role on every request instead, and every
 * change goes to the audit log with what it was before and after.
 */
@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(@Inject(SYSTEM_DB) private readonly db: SystemDb) {}

  @Get("overview")
  @AdminPermissionNeeded("audit_view")
  async overview() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const [shops, newThisWeek, paused, trialsEndingSoon, ordersToday, waitingOrders, messagesGaveUp] = await Promise.all([
      this.db.store.count(),
      this.db.store.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } } }),
      this.db.subscription.count({ where: { status: "paused" } }),
      this.db.subscription.count({ where: { status: "trialing", trialEndsAt: { gte: now, lte: new Date(now.getTime() + 3 * DAY_MS) } } }),
      this.db.order.count({ where: { createdAt: { gte: startOfDay } } }),
      this.db.order.count({ where: { status: { in: ["cod_pending", "paid"] } } }),
      this.db.outboxEvent.count({ where: { sentAt: null, attempts: { gte: MAX_ATTEMPTS_FOR_ADMIN }, kind: { not: "admin_alert" } } }),
    ]);
    return { shops, newThisWeek, paused, trialsEndingSoon, ordersToday, waitingOrders, messagesGaveUp };
  }

  @Get("merchants")
  @AdminPermissionNeeded("audit_view")
  async merchants(@Query() query: unknown) {
    const { q } = merchantsQuerySchema.parse(query);
    const where: Prisma.StoreWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { members: { some: { merchant: { identities: { some: { telegramUsername: { contains: q.replace(/^@/, ""), mode: "insensitive" } } } } } } },
          ],
        }
      : {};
    const stores = await this.db.store.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        slug: true,
        name: true,
        businessType: true,
        createdAt: true,
        subscription: { select: { plan: true, status: true, trialEndsAt: true, currentPeriodStart: true, currentPeriodEnd: true } },
        members: { where: { role: "owner" }, take: 1, select: { merchant: { select: { firstName: true, lastName: true, identities: { select: { telegramUsername: true } } } } } },
        _count: { select: { products: { where: { deletedAt: null } }, orders: true } },
      },
    });
    return stores.map((store) => ({
      id: store.id,
      slug: store.slug,
      name: store.name,
      businessType: store.businessType,
      createdAt: store.createdAt,
      owner: store.members[0]
        ? {
            name: [store.members[0].merchant.firstName, store.members[0].merchant.lastName].filter(Boolean).join(" "),
            telegramUsername: store.members[0].merchant.identities.find((identity) => identity.telegramUsername)?.telegramUsername ?? null,
          }
        : null,
      plan: store.subscription?.plan ?? null,
      status: store.subscription?.status ?? null,
      endsAt: store.subscription ? periodEnd(store.subscription) : null,
      products: store._count.products,
      orders: store._count.orders,
    }));
  }

  @Get("merchants/:storeId")
  @AdminPermissionNeeded("audit_view")
  async merchant(@Param("storeId", ParseUUIDPipe) storeId: string) {
    const store = await this.db.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        slug: true,
        name: true,
        businessType: true,
        phone: true,
        area: true,
        createdAt: true,
        deliveryConfiguredAt: true,
        subscription: { select: { plan: true, status: true, trialEndsAt: true, currentPeriodStart: true, currentPeriodEnd: true } },
        members: { select: { role: true, merchant: { select: { firstName: true, lastName: true, identities: { select: { method: true, telegramUsername: true } } } } } },
        _count: { select: { products: { where: { deletedAt: null } }, orders: true } },
      },
    });
    if (!store) throw new NotFoundException();
    const [lastOrder, audit] = await Promise.all([
      this.db.order.findFirst({ where: { storeId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      this.db.auditLog.findMany({ where: { storeId }, orderBy: { at: "desc" }, take: 30, select: { id: true, at: true, actorType: true, action: true, after: true } }),
    ]);
    const { members, _count, subscription, ...rest } = store;
    return {
      ...rest,
      subscription: subscription ? { ...subscription, endsAt: periodEnd(subscription) } : null,
      members: members.map((member) => ({
        role: member.role,
        name: [member.merchant.firstName, member.merchant.lastName].filter(Boolean).join(" "),
        telegramUsername: member.merchant.identities.find((identity) => identity.telegramUsername)?.telegramUsername ?? null,
      })),
      products: _count.products,
      orders: _count.orders,
      lastOrderAt: lastOrder?.createdAt ?? null,
      audit,
    };
  }

  /** "Unblock": adds days to the trial or period; a paused or overdue shop reopens for exactly those days. */
  @Post("merchants/:storeId/extend")
  @HttpCode(200)
  @AdminPermissionNeeded("merchants_manage")
  async extend(@CurrentAdmin() admin: AdminIdentity, @Param("storeId", ParseUUIDPipe) storeId: string, @Body() body: unknown) {
    const { days, note } = adminExtendSchema.parse(body);
    return this.changeSubscription(admin, storeId, { kind: "extend", days }, "subscription.extended", note);
  }

  @Post("merchants/:storeId/plan")
  @HttpCode(200)
  @AdminPermissionNeeded("merchants_manage")
  async plan(@CurrentAdmin() admin: AdminIdentity, @Param("storeId", ParseUUIDPipe) storeId: string, @Body() body: unknown) {
    const { plan, note } = adminPlanChangeSchema.parse(body);
    return this.changeSubscription(admin, storeId, { kind: "setPlan", plan }, "subscription.plan_changed", note);
  }

  @Get("audit-log")
  @AdminPermissionNeeded("audit_view")
  async auditLog(@Query() query: unknown) {
    const { storeId, action, before } = auditQuerySchema.parse(query);
    const rows = await this.db.auditLog.findMany({
      where: { ...(storeId ? { storeId } : {}), ...(action ? { action: { startsWith: action } } : {}), ...(before ? { at: { lt: new Date(before) } } : {}) },
      orderBy: { at: "desc" },
      take: PAGE,
    });
    // Names for the people and shops in this page, read once.
    const adminIds = rows.filter((row) => row.actorType === "admin" && row.actorId).map((row) => row.actorId!);
    const merchantIds = rows.filter((row) => row.actorType === "merchant" && row.actorId).map((row) => row.actorId!);
    const storeIds = rows.flatMap((row) => (row.storeId ? [row.storeId] : []));
    const [admins, merchants, stores] = await Promise.all([
      this.db.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } }),
      this.db.merchant.findMany({ where: { id: { in: merchantIds } }, select: { id: true, firstName: true } }),
      this.db.store.findMany({ where: { id: { in: storeIds } }, select: { id: true, name: true } }),
    ]);
    const names = new Map<string, string>([...admins.map((a) => [a.id, a.name] as const), ...merchants.map((m) => [m.id, m.firstName] as const)]);
    const storeNames = new Map(stores.map((s) => [s.id, s.name]));
    return {
      entries: rows.map((row) => ({
        id: row.id,
        at: row.at,
        actorType: row.actorType,
        actorName: row.actorId ? (names.get(row.actorId) ?? null) : null,
        storeId: row.storeId,
        storeName: row.storeId ? (storeNames.get(row.storeId) ?? null) : null,
        action: row.action,
        entity: row.entity,
        before: row.before,
        after: row.after,
      })),
      // For "older": pass the last entry's time as `before`.
      more: rows.length === PAGE,
    };
  }

  @Get("settings")
  @AdminPermissionNeeded("audit_view")
  async settings() {
    return this.readSettings();
  }

  @Put("settings")
  @AdminPermissionNeeded("settings_manage")
  async saveSettings(@CurrentAdmin() admin: AdminIdentity, @Body() body: unknown) {
    const input = platformSettingsSaveSchema.parse(body);
    const before = await this.readSettings();
    await this.db.$transaction([
      this.db.platformSettings.update({ where: { id: 1 }, data: input }),
      this.db.auditLog.create({ data: { actorType: "admin", actorId: admin.adminId, action: "platform.settings_saved", entity: "platform_settings", entityId: "1", before, after: input } }),
    ]);
    return this.readSettings();
  }

  private readSettings() {
    return this.db.platformSettings.findUniqueOrThrow({
      where: { id: 1 },
      select: { platformName: true, supportTelegram: true, usdToKhrMin: true, usdToKhrMax: true, alertChatId: true, betaAllBasic: true },
    });
  }

  private async changeSubscription(
    admin: AdminIdentity,
    storeId: string,
    override: { kind: "extend"; days: number } | { kind: "setPlan"; plan: "basic" | "pro" | "advance" },
    action: string,
    note: string,
  ) {
    const now = new Date();
    return this.db.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { storeId } });
      if (!sub) throw new NotFoundException();
      let next;
      try {
        next = applyOverrideToDates(sub, override, now);
      } catch {
        throw new AppException(409, "action_not_allowed");
      }
      const data = { plan: next.plan, status: next.status, trialEndsAt: next.trialEndsAt, currentPeriodStart: next.currentPeriodStart, currentPeriodEnd: next.currentPeriodEnd };
      // Only if nobody changed it meanwhile (another admin, the billing job later).
      const { count } = await tx.subscription.updateMany({ where: { id: sub.id, updatedAt: sub.updatedAt }, data });
      if (count === 0) throw new AppException(409, "action_not_allowed");
      const before = { plan: sub.plan, status: sub.status, endsAt: periodEnd(sub) };
      const after = { plan: next.plan, status: next.status, endsAt: periodEnd(next), note, ...override };
      await tx.auditLog.create({ data: { actorType: "admin", actorId: admin.adminId, storeId, action, entity: "subscription", entityId: sub.id, before, after } });
      return { plan: next.plan, status: next.status, endsAt: periodEnd(next) };
    });
  }
}

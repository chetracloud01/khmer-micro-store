import { Prisma, type SystemDb } from "@khmio/db";
import {
  adminExtendSchema,
  adminPlanChangeSchema,
  platformProductIdSchema,
  platformSettingsSaveSchema,
  type BackupFailure,
  type BackupKind,
  type BackupRunView,
  type BackupStatus,
} from "@khmio/shared";
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
const waitlistQuerySchema = z.object({ product: platformProductIdSchema.optional(), before: z.string().datetime().optional() });
const merchantsQuerySchema = z.object({ q: z.string().trim().max(60).optional() });
const backupsQuerySchema = z.object({ before: z.string().datetime().optional() });
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

  /** The website waitlist (docs/platform-launch-plan.md Stage 3): how many per product, and the sign-ups, newest first. */
  @Get("waitlist")
  @AdminPermissionNeeded("merchants_manage")
  async waitlist(@Query() query: unknown) {
    const { product, before } = waitlistQuerySchema.parse(query);
    const [counts, rows] = await Promise.all([
      this.db.waitlistSignup.groupBy({ by: ["product"], _count: { _all: true } }),
      this.db.waitlistSignup.findMany({
        where: { ...(product ? { product } : {}), ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
        orderBy: { createdAt: "desc" },
        take: PAGE,
        select: { id: true, product: true, name: true, phone: true, businessType: true, createdAt: true },
      }),
    ]);
    return {
      counts: Object.fromEntries(counts.map((row) => [row.product, row._count._all])),
      signups: rows,
      // For "older": pass the last sign-up's time as `before`.
      more: rows.length === PAGE,
    };
  }

  /** Admin A13: the backup runs, newest first, the newest good one, and when the full-restore test last passed. */
  @Get("backups")
  @AdminPermissionNeeded("backups_view")
  async backups(@Query() query: unknown) {
    const { before } = backupsQuerySchema.parse(query);
    const [rows, latestDone, settings] = await Promise.all([
      this.db.backupRun.findMany({ where: before ? { createdAt: { lt: new Date(before) } } : {}, orderBy: { createdAt: "desc" }, take: PAGE }),
      this.db.backupRun.findFirst({ where: { status: "done" }, orderBy: { finishedAt: "desc" } }),
      this.db.platformSettings.findUniqueOrThrow({ where: { id: 1 }, select: { restoreTestPassedAt: true } }),
    ]);
    const adminIds = [...rows, ...(latestDone ? [latestDone] : [])].flatMap((row) => (row.startedById ? [row.startedById] : []));
    const admins = await this.db.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } });
    const names = new Map(admins.map((a) => [a.id, a.name]));
    const view = (row: (typeof rows)[number]): BackupRunView => ({
      id: row.id,
      kind: row.kind as BackupKind,
      status: row.status as BackupStatus,
      startedByName: row.startedById ? (names.get(row.startedById) ?? null) : null,
      sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
      failure: row.failure as BackupFailure | null,
      createdAt: row.createdAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
      finishedAt: row.finishedAt?.toISOString() ?? null,
      fileDeletedAt: row.fileDeletedAt?.toISOString() ?? null,
    });
    return {
      runs: rows.map(view),
      latestDone: latestDone ? view(latestDone) : null,
      restoreTestPassedAt: settings.restoreTestPassedAt?.toISOString() ?? null,
      // For "older": pass the last run's createdAt as `before`.
      more: rows.length === PAGE,
    };
  }

  /** "Backup now": the worker picks it up within seconds. One at a time — the database refuses a second. */
  @Post("backups")
  @HttpCode(200)
  @AdminPermissionNeeded("backups_run")
  async backupNow(@CurrentAdmin() admin: AdminIdentity) {
    try {
      const run = await this.db.$transaction(async (tx) => {
        const created = await tx.backupRun.create({ data: { kind: "manual", status: "queued", startedById: admin.adminId }, select: { id: true } });
        await tx.auditLog.create({ data: { actorType: "admin", actorId: admin.adminId, action: "backup.started", entity: "backup_run", entityId: created.id } });
        return created;
      });
      return { id: run.id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppException(409, "backup_running");
      throw error;
    }
  }

  /** The monthly full-restore test passed (blueprint "The routine"): the owner records it here. */
  @Post("backups/restore-test")
  @HttpCode(200)
  @AdminPermissionNeeded("settings_manage")
  async restoreTestPassed(@CurrentAdmin() admin: AdminIdentity) {
    const at = new Date();
    await this.db.$transaction([
      this.db.platformSettings.update({ where: { id: 1 }, data: { restoreTestPassedAt: at } }),
      this.db.auditLog.create({ data: { actorType: "admin", actorId: admin.adminId, action: "backup.restore_test_passed", entity: "platform_settings", entityId: "1", after: { at: at.toISOString() } } }),
    ]);
    return { restoreTestPassedAt: at.toISOString() };
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

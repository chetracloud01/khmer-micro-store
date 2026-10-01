import { withContext, type AppDb } from "@khmer-micro-store/db";
import { orderActionRequestSchema } from "@khmer-micro-store/shared";
import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { APP_DB } from "../db";
import { assertStoreWritable } from "../merchant/plan";
import { CurrentStore, MerchantStoreGuard, type MerchantStore } from "../merchant/store.guard";
import { readOrderDetail, runSellerAction } from "./order-actions";

/** Most orders the list returns; older ones stay in the database. */
const ORDER_LIST_LIMIT = 200;

/** The seller's orders (roadmap steps 4 and 6): the list, one order in full, and moving it on. */
@Controller("orders")
@UseGuards(MerchantStoreGuard)
export class OrdersController {
  constructor(@Inject(APP_DB) private readonly app: AppDb) {}

  @Get()
  async list(@CurrentStore() context: MerchantStore) {
    return withContext(this.app, context, async (tx) => {
      const orders = await tx.order.findMany({
        orderBy: { createdAt: "desc" },
        take: ORDER_LIST_LIMIT,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentMethod: true,
          currency: true,
          totalMinor: true,
          buyerName: true,
          buyerPhone: true,
          fulfilment: true,
          area: true,
          districtId: true,
          provinceId: true,
          createdAt: true,
          items: { select: { quantity: true } },
        },
      });
      return orders.map(({ items, ...order }) => ({ ...order, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) }));
    });
  }

  @Get(":id")
  async get(@CurrentStore() context: MerchantStore, @Param("id", ParseUUIDPipe) id: string) {
    return withContext(this.app, context, (tx) => readOrderDetail(tx, id));
  }

  /** Confirm, pack, send, delivered, cash collected, failed, rebook or cancel — only the step that follows the order's status. */
  @Post(":id/actions")
  @HttpCode(200)
  async act(@CurrentStore() context: MerchantStore, @Param("id", ParseUUIDPipe) id: string, @Body() body: unknown) {
    const request = orderActionRequestSchema.parse(body);
    return withContext(this.app, context, async (tx) => {
      await assertStoreWritable(tx, context.storeId);
      return runSellerAction(tx, context, id, request);
    });
  }
}

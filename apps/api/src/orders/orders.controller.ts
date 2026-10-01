import { withContext, type AppDb } from "@khmer-micro-store/db";
import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { APP_DB } from "../db";
import { CurrentStore, MerchantStoreGuard, type MerchantStore } from "../merchant/store.guard";

/** Most orders the list returns; paging comes with step 6's order screens. */
const ORDER_LIST_LIMIT = 200;

/** The seller's orders, newest first — read-only in step 4 (actions and alerts arrive in step 6). */
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
}

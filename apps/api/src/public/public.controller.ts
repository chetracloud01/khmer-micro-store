import { withPublicOrder, withPublicStore, type AppDb } from "@khmer-micro-store/db";
import { canBuyerCancel, shopSlugSchema } from "@khmer-micro-store/shared";
import { Body, Controller, Get, HttpCode, Inject, NotFoundException, Param, Post, Res } from "@nestjs/common";
import { readDeliverySettings } from "../delivery/delivery";
import { AppException } from "../errors";
import { APP_DB } from "../db";
import { FILE_STORAGE, type FileStorage } from "../files/storage";
import { ORDER_TOKEN_PATTERN, parsePlaceOrder, placeOrder } from "../orders/place-order";
import { productInclude, toProductDto } from "../products/products";

interface StatusResponse {
  status(code: number): unknown;
}

/**
 * What a buyer reaches, with no login: the shop page's data, placing an
 * order, and the order page. Read and written as a buyer (withPublicStore,
 * withPublicOrder): the database itself shows only the store's public face,
 * its visible products and delivery zones, and the buyer's own order.
 */
@Controller("public")
export class PublicController {
  constructor(
    @Inject(APP_DB) private readonly app: AppDb,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  private url = (key: string) => this.storage.publicUrl(key);

  @Get("stores/:slug")
  async store(@Param("slug") slug: string) {
    if (!shopSlugSchema.safeParse(slug).success) throw new NotFoundException();
    const shop = await withPublicStore(this.app, slug, async (tx, storeId) => {
      const [store, categories, products, delivery] = await Promise.all([
        tx.store.findUniqueOrThrow({
          where: { id: storeId },
          select: {
            slug: true,
            name: true,
            businessType: true,
            phone: true,
            area: true,
            description: true,
            logoKey: true,
            defaultCurrency: true,
            usdToKhrRate: true,
            allowCod: true,
            vatPercent: true,
          },
        }),
        tx.category.findMany({ select: { id: true, nameKm: true, nameEn: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
        tx.product.findMany({ where: { deletedAt: null, isVisible: true }, include: productInclude, orderBy: { createdAt: "desc" } }),
        readDeliverySettings(tx, storeId),
      ]);
      const { logoKey, ...rest } = store;
      // Drivers are hidden from buyers by the database; only zones, pickup and provinces go out.
      const { zones, pickup, province } = delivery.settings;
      return {
        store: { ...rest, logoUrl: logoKey ? this.url(logoKey) : null },
        categories,
        // Wholesale prices are never shown to buyers.
        products: products.map((product) => toProductDto(product, this.url)),
        delivery: { zones, pickup, province },
        // Ordering needs delivery saved at least once; which payment methods fit is worked out per checkout
        // (packages/shared getAvailablePaymentMethods). KHQR joins in step 5.
        ordering: { deliveryConfigured: delivery.configured, khqrReady: false },
      };
    });
    if (!shop) throw new NotFoundException();
    return shop;
  }

  /** Places an order: 201 with its link token; 200 with the same token when this checkout was already placed. */
  @Post("stores/:slug/orders")
  @HttpCode(201)
  async order(@Param("slug") slug: string, @Body() body: unknown, @Res({ passthrough: true }) response: StatusResponse) {
    if (!shopSlugSchema.safeParse(slug).success) throw new NotFoundException();
    const request = parsePlaceOrder(body);
    const placed = await placeOrder(this.app, slug, request);
    if (!placed) throw new NotFoundException();
    if (!placed.created) response.status(200);
    return { token: placed.token, orderNumber: placed.orderNumber };
  }

  /** The buyer's order page. The link's token is the only key; the order number alone opens nothing. */
  @Get("orders/:token")
  async orderPage(@Param("token") token: string) {
    if (!ORDER_TOKEN_PATTERN.test(token)) throw new NotFoundException();
    const found = await withPublicOrder(this.app, token, async (tx, storeId) => {
      const [order, store] = await Promise.all([
        tx.order.findFirst({
          select: {
            orderNumber: true,
            status: true,
            paymentMethod: true,
            currency: true,
            subtotalMinor: true,
            discountMinor: true,
            deliveryFeeMinor: true,
            vatPercent: true,
            vatMinor: true,
            totalMinor: true,
            exchangeRateUsed: true,
            fulfilment: true,
            area: true,
            districtId: true,
            provinceId: true,
            landmark: true,
            pickupAddress: true,
            pickupHours: true,
            buyerName: true,
            cancelReason: true,
            createdAt: true,
            items: {
              select: { titleKm: true, titleEn: true, variantLabelKm: true, variantLabelEn: true, unitPriceMinor: true, quantity: true, lineTotalMinor: true },
              orderBy: { createdAt: "asc" },
            },
            events: { select: { status: true, at: true }, orderBy: { at: "asc" } },
            // How it was sent: the driver's name or the bus ticket — the driver's phone stays with the shop.
            dispatches: { select: { route: true, driverName: true, busCompany: true, ticketNumber: true, dispatchedAt: true }, orderBy: { dispatchedAt: "desc" }, take: 1 },
          },
        }),
        tx.store.findUniqueOrThrow({ where: { id: storeId }, select: { slug: true, name: true, phone: true, logoKey: true } }),
      ]);
      if (!order) return null;
      const { logoKey, ...shop } = store;
      const { dispatches, ...rest } = order;
      // The buyer's phone stays off this page: the link may be forwarded.
      return {
        ...rest,
        dispatch: dispatches[0] ?? null,
        canCancel: canBuyerCancel(order),
        store: { ...shop, logoUrl: logoKey ? this.url(logoKey) : null },
      };
    });
    if (!found) throw new NotFoundException();
    return found;
  }

  /** The buyer cancels their own order — only while no money has moved and nothing is packed (canBuyerCancel). */
  @Post("orders/:token/cancel")
  @HttpCode(200)
  async cancel(@Param("token") token: string) {
    if (!ORDER_TOKEN_PATTERN.test(token)) throw new NotFoundException();
    const result = await withPublicOrder(this.app, token, async (tx) => {
      const order = await tx.order.findFirst({ select: { status: true, paymentMethod: true, fulfilment: true, area: true } });
      if (!order) return "missing" as const;
      if (!canBuyerCancel(order)) return "refused" as const;
      // The database function cancels only from the status read here, records the history and tells the seller.
      const [row] = await tx.$queryRaw<{ cancelled: boolean }[]>`SELECT app_buyer_cancel_order(${order.status}::"OrderStatus") AS cancelled`;
      return row?.cancelled ? ("cancelled" as const) : ("refused" as const);
    });
    if (!result || result === "missing") throw new NotFoundException();
    if (result === "refused") throw new AppException(409, "action_not_allowed");
    return { cancelled: true };
  }
}

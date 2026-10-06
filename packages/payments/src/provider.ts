import type { Currency } from "@khmio/shared";

export type PaymentStatus = "pending" | "paid" | "failed" | "expired";

export interface StorePaymentConfig {
  storeId: string;
  bakongAccountId?: string;
  paywayMerchantId?: string;
  paywayApiKey?: string;
}

export interface CreatedPayment {
  providerRef: string;
  qrPayload?: string;
  redirectUrl?: string;
  expiresAt: Date;
}

export interface PaymentProvider {
  code: "bakong_khqr" | "aba_payway" | "cod";
  createPayment(input: {
    orderId: string;
    amountMinor: number;
    currency: Currency;
    store: StorePaymentConfig;
  }): Promise<CreatedPayment>;
  checkStatus(ref: string, store: StorePaymentConfig): Promise<PaymentStatus>;
  /** PayWay only: verify the callback signature before trusting it. */
  verifyCallback?(
    headers: Record<string, string>,
    body: unknown,
    store: StorePaymentConfig,
  ): boolean;
}

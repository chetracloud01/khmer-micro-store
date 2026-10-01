import { NotFoundException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { phoneLoginSchema } from "@khmer-micro-store/shared";
import { describe, expect, it } from "vitest";
import { toErrorResponse } from "./errors";
import { requestPath } from "./logger";

describe("API error shape", () => {
  it("names each bad field with the codes the screens translate", () => {
    const result = phoneLoginSchema.safeParse({ phone: "12" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(toErrorResponse(result.error)).toEqual({ status: 400, body: { error: "invalid_input", fields: { phone: "phone_invalid" } } });
  });

  it("gives known HTTP errors a short code", () => {
    expect(toErrorResponse(new NotFoundException())).toEqual({ status: 404, body: { error: "not_found" } });
    expect(toErrorResponse(new UnauthorizedException("token expired for user 855…"))).toEqual({ status: 401, body: { error: "unauthorized" } });
  });

  it("never sends the details of an unexpected error", () => {
    expect(toErrorResponse(new Error("connection string postgresql://user:secret@db"))).toEqual({ status: 500, body: { error: "internal" } });
    expect(toErrorResponse(new ServiceUnavailableException("db down"))).toEqual({ status: 503, body: { error: "internal" } });
  });
});

describe("request logging", () => {
  it("drops the query string, which can carry a phone number or a token", () => {
    expect(requestPath("/orders/SC-1?phone=85512345678&token=abc")).toBe("/orders/SC-1");
    expect(requestPath(undefined)).toBe("");
  });
});

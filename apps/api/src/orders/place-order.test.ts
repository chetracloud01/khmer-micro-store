import { describe, expect, it } from "vitest";
import { InvalidInputException } from "../errors";
import { newOrderToken, ORDER_TOKEN_PATTERN, parsePlaceOrder } from "./place-order";

describe("order links", () => {
  it("are 32 random URL-safe characters, different every time", () => {
    const tokens = new Set(Array.from({ length: 50 }, newOrderToken));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token).toMatch(ORDER_TOKEN_PATTERN);
  });

  it("never look like an order number", () => {
    expect(ORDER_TOKEN_PATTERN.test("1")).toBe(false);
    expect(ORDER_TOKEN_PATTERN.test("../../etc/passwd")).toBe(false);
  });
});

describe("parsePlaceOrder", () => {
  it("names the problem fields with the form's codes", () => {
    try {
      parsePlaceOrder({ idempotencyKey: "nope", lines: [], checkout: {} });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidInputException);
      expect((error as InvalidInputException).fields).toEqual({ idempotencyKey: "required", lines: "cart_empty" });
    }
  });
});

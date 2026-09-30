import { describe, expect, it } from "vitest";
import { formatKhr, formatUsd } from "./money";

describe("money formatting", () => {
  it("formats USD cents", () => {
    expect(formatUsd(850)).toBe("$8.50");
  });

  it("groups thousands in USD like KHR", () => {
    expect(formatUsd(190450)).toBe("$1,904.50");
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("formats KHR riel with the currency symbol", () => {
    expect(formatKhr(34850)).toBe("34,850៛");
  });
});

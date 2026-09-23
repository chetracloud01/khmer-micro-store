import { describe, expect, it } from "vitest";
import { formatKhr, formatUsd } from "./money";

describe("money formatting", () => {
  it("formats USD cents", () => {
    expect(formatUsd(850)).toBe("$8.50");
  });

  it("formats KHR riel with the currency symbol", () => {
    expect(formatKhr(34850)).toBe("34,850៛");
  });
});

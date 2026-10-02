import { describe, expect, it } from "vitest";
import { applyOverrideToDates, periodEnd, type SubscriptionDates } from "./subscription-override";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-02T03:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * DAY);

describe("applyOverrideToDates", () => {
  it("adds days to a running trial", () => {
    const trial: SubscriptionDates = { plan: "free", status: "trialing", trialEndsAt: days(5), currentPeriodStart: days(-9), currentPeriodEnd: null };
    const next = applyOverrideToDates(trial, { kind: "extend", days: 30 }, now);
    expect(next.status).toBe("trialing");
    expect(next.trialEndsAt).toEqual(days(35));
  });

  it("reopens a paused shop for exactly the days given, counted from now", () => {
    const paused: SubscriptionDates = { plan: "free", status: "paused", trialEndsAt: days(-20), currentPeriodStart: days(-34), currentPeriodEnd: null };
    const next = applyOverrideToDates(paused, { kind: "extend", days: 14 }, now);
    expect(next.status).toBe("trialing");
    expect(periodEnd(next)).toEqual(days(14));
  });

  it("reopens an overdue paid shop as active", () => {
    const grace: SubscriptionDates = { plan: "basic", status: "grace", trialEndsAt: null, currentPeriodStart: days(-33), currentPeriodEnd: days(-3) };
    const next = applyOverrideToDates(grace, { kind: "extend", days: 7 }, now);
    expect(next.status).toBe("active");
    expect(next.currentPeriodEnd).toEqual(days(7));
    expect(next.currentPeriodStart).toEqual(now);
  });

  it("starts a fresh 30-day period when a trial moves to a paid plan; only changes the plan when already paying", () => {
    const trial: SubscriptionDates = { plan: "free", status: "trialing", trialEndsAt: days(5), currentPeriodStart: days(-9), currentPeriodEnd: null };
    const paid = applyOverrideToDates(trial, { kind: "setPlan", plan: "pro" }, now);
    expect(paid).toMatchObject({ plan: "pro", status: "active", currentPeriodStart: now, currentPeriodEnd: days(30) });
    const active: SubscriptionDates = { plan: "basic", status: "active", trialEndsAt: null, currentPeriodStart: days(-10), currentPeriodEnd: days(20) };
    expect(applyOverrideToDates(active, { kind: "setPlan", plan: "advance" }, now)).toEqual({ ...active, plan: "advance" });
  });

  it("refuses Free and an extension out of range (the shared rule)", () => {
    const active: SubscriptionDates = { plan: "basic", status: "active", trialEndsAt: null, currentPeriodStart: days(-10), currentPeriodEnd: days(20) };
    expect(() => applyOverrideToDates(active, { kind: "setPlan", plan: "free" }, now)).toThrow();
    expect(() => applyOverrideToDates(active, { kind: "extend", days: 0 }, now)).toThrow();
    expect(() => applyOverrideToDates(active, { kind: "extend", days: 366 }, now)).toThrow();
  });
});

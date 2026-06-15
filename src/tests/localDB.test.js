import { describe, it, expect } from "vitest";
import { calcTotal, calcPaid, calcBalance, payLabel, validators } from "../../src/utils/finance";

// ── calcTotal ──────────────────────────────────────────────────────────────
describe("calcTotal", () => {
  it("sums prices correctly", () => {
    expect(calcTotal([{ price: "55.00" }, { price: "30.00" }])).toBe(85);
  });
  it("returns 0 for empty array", () => {
    expect(calcTotal([])).toBe(0);
  });
  it("returns 0 for null/undefined", () => {
    expect(calcTotal(null)).toBe(0);
    expect(calcTotal(undefined)).toBe(0);
  });
  it("ignores non-numeric prices", () => {
    expect(calcTotal([{ price: "abc" }, { price: "10" }])).toBe(10);
  });
  it("treats negative prices as 0", () => {
    expect(calcTotal([{ price: "-50" }, { price: "100" }])).toBe(100);
  });
  it("handles missing price field", () => {
    expect(calcTotal([{ description: "Labour" }])).toBe(0);
  });
});

// ── calcPaid ───────────────────────────────────────────────────────────────
describe("calcPaid", () => {
  it("sums payment amounts correctly", () => {
    expect(calcPaid([{ amount: "30" }, { amount: "55" }])).toBe(85);
  });
  it("returns 0 for empty payments", () => {
    expect(calcPaid([])).toBe(0);
  });
  it("returns 0 for null/undefined", () => {
    expect(calcPaid(null)).toBe(0);
    expect(calcPaid(undefined)).toBe(0);
  });
  it("ignores negative payments", () => {
    expect(calcPaid([{ amount: "-10" }, { amount: "50" }])).toBe(50);
  });
});

// ── calcBalance ────────────────────────────────────────────────────────────
describe("calcBalance", () => {
  it("returns total minus paid", () => {
    const lines    = [{ price: "100" }];
    const payments = [{ amount: "60" }];
    expect(calcBalance(lines, payments)).toBe(40);
  });
  it("returns 0 when fully paid", () => {
    expect(calcBalance([{ price: "100" }], [{ amount: "100" }])).toBe(0);
  });
  it("handles no payments", () => {
    expect(calcBalance([{ price: "75" }], [])).toBe(75);
  });
  it("handles overpayment (negative balance)", () => {
    expect(calcBalance([{ price: "50" }], [{ amount: "60" }])).toBe(-10);
  });
});

// ── payLabel ───────────────────────────────────────────────────────────────
describe("payLabel", () => {
  it('returns "Unpaid" when nothing paid', () => {
    expect(payLabel([{ price: "100" }], [])).toBe("Unpaid");
  });
  it('returns "Partial" when partially paid', () => {
    expect(payLabel([{ price: "100" }], [{ amount: "50" }])).toBe("Partial");
  });
  it('returns "Paid" when fully paid', () => {
    expect(payLabel([{ price: "100" }], [{ amount: "100" }])).toBe("Paid");
  });
  it('returns "Paid" when overpaid', () => {
    expect(payLabel([{ price: "100" }], [{ amount: "150" }])).toBe("Paid");
  });
  it('returns "Paid" when total is 0', () => {
    expect(payLabel([], [])).toBe("Paid");
  });
  it('returns "Paid" when lines total is 0', () => {
    expect(payLabel([{ price: "0" }], [])).toBe("Paid");
  });
});

// ── validators.customer ────────────────────────────────────────────────────
describe("validators.customer", () => {
  it("passes valid customer", () => {
    expect(validators.customer({ name: "Alice", phone: "+1 555" })).toBeNull();
  });
  it("fails empty name", () => {
    expect(validators.customer({ name: "", phone: "+1 555" })).toBeTruthy();
  });
  it("fails whitespace name", () => {
    expect(validators.customer({ name: "   ", phone: "+1 555" })).toBeTruthy();
  });
  it("fails empty phone", () => {
    expect(validators.customer({ name: "Alice", phone: "" })).toBeTruthy();
  });
  it("fails missing fields", () => {
    expect(validators.customer({})).toBeTruthy();
  });
});

// ── validators.car ─────────────────────────────────────────────────────────
describe("validators.car", () => {
  const valid = { customerId: "abc", plate: "XYZ-123", manufacturer: "Toyota", model: "Corolla" };
  it("passes valid car", () => {
    expect(validators.car(valid)).toBeNull();
  });
  it("fails missing owner", () => {
    expect(validators.car({ ...valid, customerId: "" })).toBeTruthy();
  });
  it("fails missing plate", () => {
    expect(validators.car({ ...valid, plate: "" })).toBeTruthy();
  });
  it("fails missing manufacturer", () => {
    expect(validators.car({ ...valid, manufacturer: "" })).toBeTruthy();
  });
  it("fails missing model", () => {
    expect(validators.car({ ...valid, model: "" })).toBeTruthy();
  });
});

// ── validators.job ─────────────────────────────────────────────────────────
describe("validators.job", () => {
  const valid = { customerId: "c1", carId: "car1", dateIn: "2026-06-01", dateOut: "" };
  it("passes valid job", () => {
    expect(validators.job(valid)).toBeNull();
  });
  it("fails missing customer", () => {
    expect(validators.job({ ...valid, customerId: "" })).toBeTruthy();
  });
  it("fails missing car", () => {
    expect(validators.job({ ...valid, carId: "" })).toBeTruthy();
  });
  it("fails missing dateIn", () => {
    expect(validators.job({ ...valid, dateIn: "" })).toBeTruthy();
  });
  it("fails when dateOut is before dateIn", () => {
    expect(validators.job({ ...valid, dateIn: "2026-06-10", dateOut: "2026-06-01" })).toBeTruthy();
  });
  it("passes when dateOut equals dateIn", () => {
    expect(validators.job({ ...valid, dateIn: "2026-06-10", dateOut: "2026-06-10" })).toBeNull();
  });
  it("passes when dateOut is after dateIn", () => {
    expect(validators.job({ ...valid, dateIn: "2026-06-01", dateOut: "2026-06-10" })).toBeNull();
  });
});

// ── validators.payment ─────────────────────────────────────────────────────
describe("validators.payment", () => {
  it("passes valid payment", () => {
    expect(validators.payment({ date: "2026-06-01", amount: "50" })).toBeNull();
  });
  it("fails missing date", () => {
    expect(validators.payment({ date: "", amount: "50" })).toBeTruthy();
  });
  it("fails zero amount", () => {
    expect(validators.payment({ date: "2026-06-01", amount: "0" })).toBeTruthy();
  });
  it("fails negative amount", () => {
    expect(validators.payment({ date: "2026-06-01", amount: "-10" })).toBeTruthy();
  });
  it("fails non-numeric amount", () => {
    expect(validators.payment({ date: "2026-06-01", amount: "abc" })).toBeTruthy();
  });
});

// ── validators.jobLine ─────────────────────────────────────────────────────
describe("validators.jobLine", () => {
  it("passes valid line", () => {
    expect(validators.jobLine({ description: "Oil change", price: "55" })).toBeNull();
  });
  it("passes zero price", () => {
    expect(validators.jobLine({ description: "Inspection", price: "0" })).toBeNull();
  });
  it("fails empty description", () => {
    expect(validators.jobLine({ description: "", price: "55" })).toBeTruthy();
  });
  it("fails negative price", () => {
    expect(validators.jobLine({ description: "Labour", price: "-10" })).toBeTruthy();
  });
  it("fails non-numeric price", () => {
    expect(validators.jobLine({ description: "Parts", price: "abc" })).toBeTruthy();
  });
});

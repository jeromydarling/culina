import { describe, it, expect } from 'vitest';
import { formatCents, platformFeeCents, feeBreakdown, computeCogs } from './money.js';

describe('money', () => {
  it('formats cents as USD', () => {
    expect(formatCents(12345)).toBe('$123.45');
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(null)).toBe('$0.00');
  });

  it('computes the 1.5% platform fee', () => {
    expect(platformFeeCents(10000)).toBe(150);
    expect(platformFeeCents(0)).toBe(0);
    expect(platformFeeCents(333)).toBe(5); // rounds
  });

  it('builds a transparent fee breakdown', () => {
    const fb = feeBreakdown(10000);
    expect(fb).toEqual({ subtotalCents: 10000, platformFeeCents: 150, totalCents: 10150, feePercent: 1.5 });
  });
});

describe('computeCogs', () => {
  it('sums ingredient cost, labor and overhead and derives price for a target margin', () => {
    const r = computeCogs({
      ingredients: [{ total_cost: 9 }, { total_cost: 1 }], // $10 ingredients
      laborMinutes: 60,
      laborHourlyRateCents: 2000, // $20/hr * 1hr = $20
      overheadPercent: 15, // 15% of (10+20)=30 -> $4.50
      targetMarginPercent: 35,
      yieldQuantity: 1,
    });
    expect(r.ingredientCostCents).toBe(1000);
    expect(r.laborCostCents).toBe(2000);
    expect(r.overheadCents).toBe(450);
    expect(r.cogsCents).toBe(3450);
    // price = cost / (1 - margin) = 3450 / 0.65
    expect(r.suggestedPriceCents).toBe(5308);
    expect(r.grossMarginPercent).toBeGreaterThan(34);
    expect(r.grossMarginPercent).toBeLessThan(36);
  });

  it('divides COGS across the yield', () => {
    const r = computeCogs({ ingredients: [{ total_cost: 12 }], yieldQuantity: 12, targetMarginPercent: 0 });
    expect(r.cogsPerUnitCents).toBe(100); // $12 / 12 = $1
  });
});

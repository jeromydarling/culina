import { PLATFORM_FEE_PERCENT } from './constants.js';

/** Format integer cents as a USD currency string. */
export function formatCents(cents: number | null | undefined): string {
  const value = (cents ?? 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/** Compute Culina's platform fee (in cents) for a given subtotal. */
export function platformFeeCents(subtotalCents: number, feePercent = PLATFORM_FEE_PERCENT): number {
  return Math.round(subtotalCents * (feePercent / 100));
}

/** Build a transparent fee breakdown for a subtotal. */
export interface FeeBreakdown {
  subtotalCents: number;
  platformFeeCents: number;
  totalCents: number;
  feePercent: number;
}

export function feeBreakdown(subtotalCents: number, feePercent = PLATFORM_FEE_PERCENT): FeeBreakdown {
  const fee = platformFeeCents(subtotalCents, feePercent);
  return {
    subtotalCents,
    platformFeeCents: fee,
    totalCents: subtotalCents + fee,
    feePercent,
  };
}

export interface CogsInput {
  ingredients: { total_cost: number }[]; // dollars
  laborMinutes?: number;
  laborHourlyRateCents?: number;
  overheadPercent?: number;
  targetMarginPercent?: number;
  yieldQuantity?: number;
}

export interface CogsResult {
  ingredientCostCents: number;
  laborCostCents: number;
  overheadCents: number;
  cogsCents: number;
  cogsPerUnitCents: number;
  suggestedPriceCents: number;
  grossMarginPercent: number;
}

/** Recipe cost-of-goods-sold + suggested pricing calculator (used by the Food Cost Lab). */
export function computeCogs(input: CogsInput): CogsResult {
  const ingredientCostCents = Math.round(
    input.ingredients.reduce((sum, i) => sum + (i.total_cost || 0) * 100, 0),
  );
  const laborCostCents = Math.round(
    ((input.laborMinutes ?? 0) / 60) * (input.laborHourlyRateCents ?? 0),
  );
  const baseCents = ingredientCostCents + laborCostCents;
  const overheadCents = Math.round(baseCents * ((input.overheadPercent ?? 0) / 100));
  const cogsCents = baseCents + overheadCents;

  const yieldQty = input.yieldQuantity && input.yieldQuantity > 0 ? input.yieldQuantity : 1;
  const cogsPerUnitCents = Math.round(cogsCents / yieldQty);

  const margin = (input.targetMarginPercent ?? 35) / 100;
  // price = cost / (1 - margin)
  const suggestedPriceCents = margin < 1 ? Math.round(cogsPerUnitCents / (1 - margin)) : cogsPerUnitCents;
  const grossMarginPercent =
    suggestedPriceCents > 0
      ? Math.round(((suggestedPriceCents - cogsPerUnitCents) / suggestedPriceCents) * 1000) / 10
      : 0;

  return {
    ingredientCostCents,
    laborCostCents,
    overheadCents,
    cogsCents,
    cogsPerUnitCents,
    suggestedPriceCents,
    grossMarginPercent,
  };
}

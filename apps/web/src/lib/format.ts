/** Title-case a snake_case or lowercase string: "food_safety" → "Food Safety". */
export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

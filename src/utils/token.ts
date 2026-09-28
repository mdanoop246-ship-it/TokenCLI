export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Fast local estimate. For exact provider billing, use the provider tokenizer.
  return Math.ceil(text.length / 4);
}

export function reductionPercent(before: number, after: number): number {
  if (before <= 0) return 0;
  return Number((((before - after) / before) * 100).toFixed(1));
}
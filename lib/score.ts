const KEYWORD_WEIGHTS: Record<string, number> = { required: 2, preferred: 1, unspecified: 0.5 };

function kwWeight(importance: Record<string, string>, kw: string): number {
  return KEYWORD_WEIGHTS[importance[kw]] ?? 0.5;
}

/**
 * Compute the adjusted match score after keyword strengthening.
 *
 * Required keywords are weighted 2×, preferred 1×, unspecified 0.5×, so closing
 * high-importance gaps moves the needle more than trivial keyword additions.
 * Skipped keywords are excluded from the denominator so users aren't penalised
 * for marking irrelevant keywords as not applicable.
 */
export function computeAdjustedScore(
  base: number | null,
  missingKeywords: string[],
  importance: Record<string, string>,
  strengthenedKeywords: string[],
  skippedKeywords: string[],
): number | null {
  if (base === null) return null;
  const skippedSet = new Set(skippedKeywords);
  const eligible = missingKeywords.filter(k => !skippedSet.has(k));
  const totalWeight = eligible.reduce((sum, k) => sum + kwWeight(importance, k), 0);
  if (totalWeight === 0) return base;
  const strengthenedSet = new Set(strengthenedKeywords);
  const gainedWeight = eligible
    .filter(k => strengthenedSet.has(k))
    .reduce((sum, k) => sum + kwWeight(importance, k), 0);
  return Math.min(100, Math.round(base + (gainedWeight / totalWeight) * (100 - base)));
}

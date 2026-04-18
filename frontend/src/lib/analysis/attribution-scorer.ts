export function computeContributionQualityScore(params: {
  owned_file_score: number
  diff_quality_score: number
  review_participation_count: number
}): number {
  const { owned_file_score, diff_quality_score, review_participation_count } = params

  const rawScore =
    0.5 * owned_file_score +
    0.3 * diff_quality_score +
    0.2 * Math.min(review_participation_count / 10, 1) * 100

  return Math.max(0, Math.min(100, Math.round(rawScore)))
}

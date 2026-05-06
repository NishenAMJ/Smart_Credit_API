/** @format */

export type ScoreRating = "Excellent" | "Good" | "Fair" | "Poor" | "Very Poor";

export function getScoreRating(score: number): ScoreRating {
  if (score >= 750) return "Excellent";
  if (score >= 700) return "Good";
  if (score >= 650) return "Fair";
  if (score >= 600) return "Poor";
  return "Very Poor";
}

export function getScoreColor(score: number): string {
  if (score >= 750) return "#1D9E75";
  if (score >= 700) return "#5DCAA5";
  if (score >= 650) return "#EF9F27";
  if (score >= 600) return "#BA7517";
  return "#E24B4A";
}

export function scoreToPercent(score: number): number {
  const percent = ((score - 300) / 550) * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

export function getScoreAdvice(rating: ScoreRating): string {
  switch (rating) {
    case "Excellent":
      return "Outstanding! You qualify for the best rates.";
    case "Good":
      return "Great score. Most lenders will approve your application.";
    case "Fair":
      return "Decent score. Paying on time will improve it further.";
    case "Poor":
      return "Below average. Focus on repaying loans on time.";
    default:
      return "Start building your score by completing KYC and repaying on time.";
  }
}

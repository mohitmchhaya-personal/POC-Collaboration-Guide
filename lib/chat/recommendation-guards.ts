import type {
  EvidenceQuality,
  Recommendation,
  RecommendationSource,
} from "./types";

const EVIDENCE_QUALITIES: ReadonlySet<string> = new Set([
  "high",
  "medium",
  "low",
  "unknown",
]);

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isRecommendationSource(
  value: unknown,
): value is RecommendationSource {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const source = value as Record<string, unknown>;
  return (
    isHttpUrl(source.url) &&
    (source.title === undefined || typeof source.title === "string")
  );
}

export function isEvidenceQuality(value: unknown): value is EvidenceQuality {
  return typeof value === "string" && EVIDENCE_QUALITIES.has(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isRecommendation(value: unknown): value is Recommendation {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const recommendation = value as Record<string, unknown>;
  return (
    typeof recommendation.name === "string" &&
    recommendation.name.trim().length > 0 &&
    (recommendation.score === undefined ||
      (typeof recommendation.score === "number" &&
        Number.isFinite(recommendation.score))) &&
    (recommendation.whyThisFits === undefined ||
      typeof recommendation.whyThisFits === "string") &&
    (recommendation.collaborationOpportunity === undefined ||
      typeof recommendation.collaborationOpportunity === "string") &&
    (recommendation.strengths === undefined ||
      isStringArray(recommendation.strengths)) &&
    (recommendation.considerations === undefined ||
      isStringArray(recommendation.considerations)) &&
    (recommendation.evidenceQuality === undefined ||
      isEvidenceQuality(recommendation.evidenceQuality)) &&
    (recommendation.sources === undefined ||
      (Array.isArray(recommendation.sources) &&
        recommendation.sources.every(isRecommendationSource)))
  );
}

export function pickRecommendation(value: unknown): Recommendation | null {
  if (!isRecommendation(value)) return null;
  const recommendation: Recommendation = value;
  const picked: Recommendation = { name: recommendation.name };
  if (recommendation.score !== undefined) {
    picked.score = recommendation.score;
  }
  if (recommendation.whyThisFits !== undefined) {
    picked.whyThisFits = recommendation.whyThisFits;
  }
  if (recommendation.collaborationOpportunity !== undefined) {
    picked.collaborationOpportunity = recommendation.collaborationOpportunity;
  }
  if (recommendation.strengths !== undefined) {
    picked.strengths = recommendation.strengths;
  }
  if (recommendation.considerations !== undefined) {
    picked.considerations = recommendation.considerations;
  }
  if (recommendation.evidenceQuality !== undefined) {
    picked.evidenceQuality = recommendation.evidenceQuality;
  }
  if (recommendation.sources !== undefined) {
    picked.sources = recommendation.sources;
  }
  return picked;
}

export function parseRecommendations(
  value: unknown,
): Recommendation[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const recommendations = value.map(pickRecommendation);
  return recommendations.every(
    (recommendation): recommendation is Recommendation =>
      recommendation !== null,
  )
    ? recommendations
    : undefined;
}

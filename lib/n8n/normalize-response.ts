import type {
  ChatResponse,
  EvidenceQuality,
  Recommendation,
  RecommendationSource,
} from "@/lib/chat/types";
import { N8nError } from "./errors";

const TEXT_KEYS = ["output", "text", "message", "response", "answer"] as const;
const RECOMMENDATION_KEYS = ["recommendations", "candidates"] as const;
const NAME_KEYS = ["name", "organization", "organizationName", "title"] as const;
const WHY_KEYS = ["whyThisFits", "why_this_fits", "rationale", "reason"] as const;
const OPPORTUNITY_KEYS = [
  "collaborationOpportunity",
  "collaboration_opportunity",
  "opportunity",
] as const;
const EVIDENCE_QUALITY_KEYS = ["evidenceQuality", "evidence_quality"] as const;
const SOURCE_KEYS = ["sources", "evidence", "links"] as const;
const EVIDENCE_QUALITIES: readonly EvidenceQuality[] = [
  "high",
  "medium",
  "low",
  "unknown",
];

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function firstString(obj: JsonObject, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const found = nonEmptyString(obj[key]);
    if (found !== undefined) return found;
  }
  return undefined;
}

function firstPresent(obj: JsonObject, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

function malformed(detail: string): N8nError {
  return new N8nError("malformed", `Unsupported n8n response: ${detail}`);
}

function parseHttpUrl(value: unknown): string | undefined {
  const raw = nonEmptyString(value);
  if (raw === undefined) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function parseSource(value: unknown): RecommendationSource | undefined {
  if (typeof value === "string") {
    const url = parseHttpUrl(value);
    return url ? { url } : undefined;
  }
  if (!isObject(value)) return undefined;
  const url = parseHttpUrl(firstPresent(value, ["url", "href", "link"]));
  if (!url) return undefined;
  const title = firstString(value, ["title", "name", "label"]);
  return title ? { title, url } : { url };
}

function parseStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => nonEmptyString(item))
    .filter((item): item is string => item !== undefined);
  return items.length > 0 ? items : undefined;
}

function parseEvidenceQuality(value: unknown): EvidenceQuality | undefined {
  const raw = nonEmptyString(value)?.toLowerCase();
  return EVIDENCE_QUALITIES.find((q) => q === raw);
}

export function parseRecommendation(value: unknown): Recommendation {
  if (!isObject(value)) {
    throw malformed("recommendation item is not an object");
  }
  const name = firstString(value, NAME_KEYS);
  if (name === undefined) {
    throw malformed("recommendation item is missing an organization name");
  }

  const recommendation: Recommendation = { name };

  const score = value.score;
  if (typeof score === "number" && Number.isFinite(score)) {
    recommendation.score = score;
  }

  const whyThisFits = firstString(value, WHY_KEYS);
  if (whyThisFits) recommendation.whyThisFits = whyThisFits;

  const opportunity = firstString(value, OPPORTUNITY_KEYS);
  if (opportunity) recommendation.collaborationOpportunity = opportunity;

  const strengths = parseStringList(value.strengths);
  if (strengths) recommendation.strengths = strengths;

  const considerations = parseStringList(value.considerations);
  if (considerations) recommendation.considerations = considerations;

  const evidenceQuality = parseEvidenceQuality(
    firstPresent(value, EVIDENCE_QUALITY_KEYS),
  );
  if (evidenceQuality) recommendation.evidenceQuality = evidenceQuality;

  const rawSources = firstPresent(value, SOURCE_KEYS);
  if (Array.isArray(rawSources)) {
    const sources = rawSources
      .map(parseSource)
      .filter((s): s is RecommendationSource => s !== undefined);
    if (sources.length > 0) recommendation.sources = sources;
  }

  return recommendation;
}

function parseRecommendations(value: unknown): Recommendation[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw malformed("recommendations is not an array");
  }
  if (value.length === 0) return undefined;
  return value.map(parseRecommendation);
}

function summarizeRecommendations(recommendations: Recommendation[]): string {
  return recommendations
    .map((r, i) => `${i + 1}. ${r.name}`)
    .join("\n");
}

type NormalizedBody = {
  content: string;
  recommendations?: Recommendation[];
};

function normalizeObject(obj: JsonObject, depth: number): NormalizedBody {
  const recommendations = parseRecommendations(
    firstPresent(obj, RECOMMENDATION_KEYS),
  );
  const content = firstString(obj, TEXT_KEYS);

  if (content !== undefined) {
    return recommendations ? { content, recommendations } : { content };
  }

  const nested = firstPresent(obj, TEXT_KEYS);
  if (isObject(nested) && depth === 0) {
    const inner = normalizeObject(nested, depth + 1);
    if (recommendations && !inner.recommendations) {
      return { ...inner, recommendations };
    }
    return inner;
  }

  if (recommendations) {
    return { content: summarizeRecommendations(recommendations), recommendations };
  }

  throw malformed("no recognized text or recommendation fields");
}

/**
 * Normalizes an n8n Chat Trigger response body into the stable browser
 * contract. Supported shapes are documented in docs/n8n-integration.md.
 * Throws N8nError("malformed") for anything unrecognized.
 */
export function normalizeN8nResponse(
  raw: unknown,
  sessionId: string,
): ChatResponse {
  let body: unknown = raw;

  if (Array.isArray(body)) {
    if (body.length === 0) throw malformed("empty array");
    body = body[0];
  }

  let normalized: NormalizedBody;
  if (typeof body === "string") {
    const content = nonEmptyString(body);
    if (content === undefined) throw malformed("empty string");
    normalized = { content };
  } else if (isObject(body)) {
    normalized = normalizeObject(body, 0);
  } else {
    throw malformed(`unexpected top-level type ${typeof body}`);
  }

  const response: ChatResponse = {
    sessionId,
    message: { role: "assistant", content: normalized.content },
  };
  if (normalized.recommendations) {
    response.recommendations = normalized.recommendations;
  }
  return response;
}

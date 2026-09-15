const MARKDOWN_PATTERNS = [
  /^#{1,6}\s/m,
  /^\s*([-*+]|\d+[.)])\s/m,
  /\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_/,
  /\[[^\]]+\]\(https?:\/\//,
  /^\|.*\|\s*$/m,
  /```/,
  /https?:\/\/\S+/,
];

export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_PATTERNS.some((pattern) => pattern.test(text));
}

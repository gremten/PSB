const sensitiveKeyPattern =
  /(value|clipboard|card.?number|cvv|cvc|expiry|email|phone|name|password|account|requisite|input|field.?text)/i;

export function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (sensitiveKeyPattern.test(key)) continue;
    if (["string", "number", "boolean"].includes(typeof item) || item === null) {
      result[key] = typeof item === "string" ? item.slice(0, 160) : item;
    }
  }
  return result;
}

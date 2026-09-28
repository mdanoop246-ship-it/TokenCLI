const patterns: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,

  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi,

  /(\b(?:API_KEY|API_SECRET|ACCESS_TOKEN|AUTH_TOKEN|JWT_SECRET|DATABASE_PASSWORD|DB_PASSWORD)\s*[:=]\s*)["']?[^"'\\s]+["']?/gi
];

export function redactSecrets(input: string): {
  text: string;
  count: number;
} {
  let text = input;
  let count = 0;

  for (const pattern of patterns) {
    text = text.replace(pattern, (match, prefix?: string) => {
      count++;

      if (prefix) {
        return `${prefix}[REDACTED]`;
      }

      return "[REDACTED]";
    });
  }

  return { text, count };
}
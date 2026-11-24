// Best-effort redaction of secrets and personal data before anything is written to disk.
// Regex redaction is NOT a guarantee: never paste real secrets or real personal data into prompts.

const RULES = [
  { type: 'private_key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, to: '[REDACTED:private_key]' },
  { type: 'jwt', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, to: '[REDACTED:jwt]' },
  {
    type: 'api_key',
    re: /\b(?:sk-ant-[A-Za-z0-9_-]{10,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[abpr]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|glpat-[A-Za-z0-9_-]{20,}|sk_(?:live|test)_[A-Za-z0-9]{16,})\b/g,
    to: '[REDACTED:api_key]',
  },
  {
    type: 'connection_password',
    re: /\b((?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|amqp):\/\/[^:\s/@]+:)([^@\s]+)(@)/gi,
    to: '$1[REDACTED]$3',
  },
  {
    type: 'secret_assignment',
    re: /\b([A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|APIKEY|PRIVATE_KEY|ACCESS_KEY)[A-Z0-9_]*\s*[=:]\s*)(["']?)([^\s"']{4,})\2/gi,
    to: '$1$2[REDACTED]$2',
  },
  { type: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, to: '[REDACTED:email]' },
  // Vietnamese mobile/landline: 0xxxxxxxxx or +84xxxxxxxxx, optional spaces/dots/dashes
  { type: 'phone', re: /(?<![\w\d])(?:\+?84|0)(?:[\s.-]?\d){9}(?![\w\d])/g, to: '[REDACTED:phone]' },
];

/**
 * @param {string} text
 * @returns {{ text: string, redactions: Record<string, number> }}
 */
export function redact(text) {
  let out = String(text ?? '');
  const redactions = {};
  for (const { type, re, to } of RULES) {
    out = out.replace(re, (...args) => {
      redactions[type] = (redactions[type] || 0) + 1;
      // Support $1/$2/$3 back-references in `to`
      return to.replace(/\$(\d)/g, (_, n) => args[Number(n)] ?? '');
    });
  }
  return { text: out, redactions };
}

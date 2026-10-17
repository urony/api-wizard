// פונקציות אבטחה: צנזור סודות וולידציה של מזהים. אין כאן גישה לרשת, לאחסון או ל־DOM.

export const REDACTED = '[מוסתר]';

const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._\-]{12,}/gi,
  // key=value / "api_key": "..."
  /(api[_-]?key|access[_-]?token|token|secret|authorization|password)["']?\s*[:=]\s*["']?[^\s"',}]+/gi,
  /\bsk-[A-Za-z0-9_\-]{12,}/g,
  /\bAIza[0-9A-Za-z_\-]{20,}/g,
  /\bgsk_[A-Za-z0-9]{12,}/g,
  /\bxai-[A-Za-z0-9]{12,}/g,
  /\b[A-Za-z0-9_\-]{32,}\b/g,
];

// הצנזור הוא מאמץ סביר ולא הבטחה: לא כל סוד אפשרי יזוהה.
export function redactSecrets(input) {
  let text = String(input ?? '');
  let found = false;
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, () => {
      found = true;
      return REDACTED;
    });
  }
  return { text, found };
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function isSafeId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

// מאשר רק כתובות https. משמש לפני יצירת קישור מתוך הנתונים.
export function isSafeHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

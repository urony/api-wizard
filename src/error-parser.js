import { redactSecrets } from './security.js';

const MAX_LENGTH = 4000;

function compile(pattern) {
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return null;
  }
}

// פענוח מקומי של הודעת שגיאה. אין רשת, אין שמירה, ואין AI.
// מחזיר את הטקסט המצונזר (להצגה ב־textContent בלבד) ואת כל ההתאמות האפשריות.
export function parseError(input, errorsData) {
  const raw = String(input ?? '').slice(0, MAX_LENGTH);
  const { text, found } = redactSecrets(raw);

  const matches = [];
  for (const entry of errorsData.errors) {
    const hit = entry.patterns.some((pattern) => {
      const regex = compile(pattern);
      return regex ? regex.test(text) : false;
    });
    if (hit) matches.push(entry);
  }

  return {
    redactedText: text,
    hadSecret: found,
    matches,
    fallback: matches.length === 0 ? errorsData.fallback : null,
    ambiguous: matches.length > 1,
  };
}

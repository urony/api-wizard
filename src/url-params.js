import { isSafeId } from './security.js';

const MAX_PROVIDERS = 10;

// קורא את ?tool= ו־?providers= ומחזיר רק מזהים תקינים שמוכרים במאגר.
// ערכים לא מוכרים נזרקים בשקט ומדווחים ב־ignored, בלי להציג אותם ב־HTML.
export function parseParams(search, { toolIds, providerIds }) {
  const params = new URLSearchParams(search);
  const ignored = [];

  let tool = null;
  const rawTool = params.get('tool');
  if (rawTool !== null) {
    if (isSafeId(rawTool) && toolIds.has(rawTool)) tool = rawTool;
    else ignored.push('tool');
  }

  const providers = [];
  const rawProviders = params.get('providers');
  if (rawProviders !== null) {
    for (const item of rawProviders.split(',').slice(0, MAX_PROVIDERS)) {
      const id = item.trim().toLowerCase();
      if (isSafeId(id) && providerIds.has(id)) {
        if (!providers.includes(id)) providers.push(id);
      } else if (id) {
        ignored.push('provider');
      }
    }
  }

  return { tool, providers, ignored };
}

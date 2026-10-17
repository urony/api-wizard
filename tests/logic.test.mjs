import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { redactSecrets, isSafeId, isSafeHttpsUrl } from '../src/security.js';
import { parseParams } from '../src/url-params.js';
import { recommend, rankProviders, isStale } from '../src/recommendations.js';
import { parseError } from '../src/error-parser.js';
import { validateAll } from '../scripts/validate-data.mjs';

const load = async (name) => JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const providers = (await load('providers')).providers;
const errorsData = await load('errors');

const known = { toolIds: new Set(['cardiac-simulator']), providerIds: new Set(providers.map((p) => p.id)) };

test('קובצי הנתונים תקינים', async () => {
  assert.deepEqual(await validateAll(), []);
});

test('צנזור מפתחות ידועים', () => {
  const samples = [
    'Incorrect API key provided: sk-abcdefghijklmnop1234',
    'key AIzaSyA1234567890abcdefghijklmnopqrstu',
    'Authorization: Bearer abcdefghijklmnop12345',
    'gsk_abcdefghijklmnop123456',
    'api_key=supersecretvalue',
  ];
  for (const sample of samples) {
    const { text, found } = redactSecrets(sample);
    assert.equal(found, true, sample);
    assert.ok(!/abcdefghijklmnop|supersecretvalue|1234567890abcdef/.test(text), `לא הוסתר: ${text}`);
  }
  assert.equal(redactSecrets('Error 429 rate limit').found, false);
});

test('ולידציה של מזהים וכתובות', () => {
  assert.equal(isSafeId('gemini'), true);
  assert.equal(isSafeId('<script>'), false);
  assert.equal(isSafeId('../x'), false);
  assert.equal(isSafeHttpsUrl('https://example.com'), true);
  assert.equal(isSafeHttpsUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpsUrl('http://example.com'), false);
});

test('פרמטרי URL: רק ערכים מוכרים ותקינים', () => {
  const ok = parseParams('?tool=cardiac-simulator', known);
  assert.equal(ok.tool, 'cardiac-simulator');
  const bad = parseParams('?tool=<img src=x>&providers=gemini,evil,<b>,groq,gemini', known);
  assert.equal(bad.tool, null);
  assert.deepEqual(bad.providers, ['gemini', 'groq']);
  assert.ok(bad.ignored.length >= 2);
});

test('המלצה: הצהרת providers מקבלת מצב declared', () => {
  const result = recommend({ providers, tools: [], params: { tool: null, providers: ['groq', 'gemini'] } });
  assert.equal(result.mode, 'declared');
  assert.deepEqual(result.ranked.map((p) => p.id).sort(), ['gemini', 'groq']);
});

test('המלצה: כלי מאומת מנצח', () => {
  const tools = [{ id: 't', name: 'T', supportedProviders: ['mistral'], compatibilityVerified: '2026-10-01' }];
  const result = recommend({ providers, tools, params: { tool: 't', providers: ['gemini'] } });
  assert.equal(result.mode, 'verified-tool');
  assert.deepEqual(result.ranked.map((p) => p.id), ['mistral']);
});

test('המלצה: כלי מוכר בלי תאימות מאומתת נופל להמלצה כללית', () => {
  const tools = [{ id: 't', name: 'T', supportedProviders: [], compatibilityVerified: null }];
  const result = recommend({ providers, tools, params: { tool: 't', providers: [] } });
  assert.equal(result.mode, 'general');
  assert.equal(result.tool.id, 't');
});

test('דירוג: ספק חינמי בלי כרטיס מדורג לפני ספק לא חינמי', () => {
  const ranked = rankProviders(providers);
  assert.ok(['gemini', 'groq'].includes(ranked[0].id));
  const lastIds = ranked.slice(-2).map((p) => p.id);
  assert.ok(lastIds.includes('openai') || lastIds.includes('xai'));
});

test('סינון "רק חינם" ללא אפשרויות מחזיר empty', () => {
  const paid = providers.filter((p) => p.freeTier === 'not_verified');
  const result = recommend({ providers: paid, tools: [], params: {}, freeOnly: true });
  assert.equal(result.empty, true);
});

test('שדות לא ידועים לא הופכים ל־false', () => {
  const unknown = providers.filter((p) => p.availableInIsrael === 'not_verified');
  assert.ok(unknown.length > 0);
  assert.ok(unknown.every((p) => p.availableInIsrael !== false));
});

test('פענוח שגיאות', () => {
  assert.equal(parseError('Error code: 401 invalid_api_key', errorsData).matches[0].id, 'invalid-key');
  const quota = parseError('429 You exceeded your current quota, insufficient_quota', errorsData);
  const ids = quota.matches.map((m) => m.id);
  assert.ok(ids.includes('quota') && ids.includes('rate-limit'));
  assert.equal(quota.ambiguous, true);
  const unknown = parseError('something weird', errorsData);
  assert.equal(unknown.matches.length, 0);
  assert.ok(unknown.fallback);
});

test('פענוח שגיאות מצנזר סודות ולא מחזיר HTML מפורש', () => {
  const result = parseError('401 <img src=x onerror=alert(1)> sk-abcdefghijklmnop1234', errorsData);
  assert.equal(result.hadSecret, true);
  assert.ok(!result.redactedText.includes('sk-abcdefghijklmnop1234'));
  // הטקסט מוחזר כמחרוזת רגילה; app.js מציג אותו ב־textContent בלבד.
  assert.equal(typeof result.redactedText, 'string');
});

test('חישוב התיישנות', () => {
  const now = new Date('2026-10-17');
  assert.equal(isStale('2026-10-01', now), false);
  assert.equal(isStale('2026-07-01', now), true);
  assert.equal(isStale('לא תאריך', now), true);
});

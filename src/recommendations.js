// מנגנון המלצה דטרמיניסטי. אין כאן AI ואין גישה לרשת.

const FREE_RANK = { yes: 0, partial: 1, not_verified: 2, no: 3 };
const CARD_RANK = { no: 0, not_verified: 1, yes: 2 };
const ISRAEL_RANK = { yes: 0, not_verified: 1, no: 2 };

function rank(table, value) {
  return table[value] ?? table.not_verified;
}

export function isFreeOption(provider) {
  return provider.freeTier === 'yes' || provider.freeTier === 'partial';
}

// סדר: ספק שחסום בישראל בסוף; אחר כך חינמיות, כרטיס אשראי, ישראל, קלות הרשמה, וסדר הקובץ.
export function rankProviders(providers) {
  return providers
    .map((provider, index) => ({ provider, index }))
    .sort((a, b) => {
      const keyA = sortKey(a);
      const keyB = sortKey(b);
      for (let i = 0; i < keyA.length; i += 1) {
        if (keyA[i] !== keyB[i]) return keyA[i] - keyB[i];
      }
      return 0;
    })
    .map((item) => item.provider);
}

function sortKey({ provider, index }) {
  return [
    provider.availableInIsrael === 'no' ? 1 : 0,
    rank(FREE_RANK, provider.freeTier),
    rank(CARD_RANK, provider.creditCardRequired),
    rank(ISRAEL_RANK, provider.availableInIsrael),
    Number.isFinite(provider.signupEase) ? provider.signupEase : 3,
    index,
  ];
}

function byIds(providers, ids) {
  return ids.map((id) => providers.find((p) => p.id === id)).filter(Boolean);
}

/**
 * מחזיר { mode, tool, ranked, empty }
 * mode:
 *  - verified-tool: כלי מוכר עם תאימות מאומתת
 *  - declared: הצהרת providers מהקישור (לא אומתה על ידינו)
 *  - user: בחירה מפורשת של המורה
 *  - general: אין מידע על תאימות
 *  tool: הכלי המוכר (גם כשהתאימות שלו לא ידועה), או null
 *  empty: true כשביקשו "רק חינם" ואין אפשרות חינמית מתאימה
 */
export function recommend({ providers, tools, params = {}, selectedProviderId = null, freeOnly = false }) {
  const tool = params.tool ? tools.find((t) => t.id === params.tool) ?? null : null;
  let mode = 'general';
  let pool = providers;

  if (tool && tool.compatibilityVerified && tool.supportedProviders.length > 0) {
    mode = 'verified-tool';
    pool = byIds(providers, tool.supportedProviders);
  } else if (params.providers && params.providers.length > 0) {
    mode = 'declared';
    pool = byIds(providers, params.providers);
  } else if (selectedProviderId) {
    mode = 'user';
    pool = byIds(providers, [selectedProviderId]);
  }

  if (pool.length === 0) {
    mode = 'general';
    pool = providers;
  }

  let ranked = rankProviders(pool);
  let empty = false;
  if (freeOnly) {
    const free = ranked.filter(isFreeOption);
    if (free.length === 0) empty = true;
    else ranked = free;
  }

  return { mode, tool, ranked, empty };
}

// ימים מאז הבדיקה האחרונה. null אם התאריך לא תקין.
export function daysSince(dateString, now = new Date()) {
  const time = Date.parse(dateString);
  if (Number.isNaN(time)) return null;
  return Math.floor((now.getTime() - time) / 86400000);
}

export const STALE_AFTER_DAYS = 60;

export function isStale(dateString, now = new Date()) {
  const days = daysSince(dateString, now);
  return days === null || days > STALE_AFTER_DAYS;
}

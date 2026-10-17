import { parseParams } from './url-params.js';
import { recommend, isFreeOption, isStale, daysSince } from './recommendations.js';
import { parseError } from './error-parser.js';
import { isSafeHttpsUrl } from './security.js';

const SUPPORTED_SCHEMA = 1;

const FREE_LABELS = {
  yes: 'כן, יש מסלול חינמי',
  partial: 'חלקי (מודלים או מכסה מוגבלים)',
  no: 'לא',
  not_verified: 'לא אומת',
};
const TRI_LABELS = { yes: 'כן', no: 'לא', not_verified: 'לא אומת' };
const IDENTITY_LABELS = { none: 'לא נדרש', phone: 'אימות טלפון', id: 'אימות זהות', not_verified: 'לא אומת' };

const appEl = document.getElementById('app');
const backButton = document.getElementById('back-button');
const homeButton = document.getElementById('home-button');
const footerLinks = document.getElementById('footer-links');

let data = null;
let params = { tool: null, providers: [], ignored: [] };
let state = { screen: 'intro', depth: 0 };

// ---------- עזרי DOM (בלי innerHTML) ----------

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key === 'class') el.className = value;
    else if (key === 'onclick') el.addEventListener('click', value);
    else if (key === 'onchange') el.addEventListener('change', value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

// טקסט עם [[מונחים באנגלית]] שמוצגים באיזולציה לכיוון שמאל־לימין
function rich(text) {
  const fragment = document.createDocumentFragment();
  const parts = String(text).split(/(\[\[.+?\]\])/g);
  for (const part of parts) {
    const match = part.match(/^\[\[(.+?)\]\]$/);
    if (match) fragment.append(h('bdi', { dir: 'ltr', class: 'en' }, match[1]));
    else fragment.append(document.createTextNode(part));
  }
  return fragment;
}

function show(value, labels) {
  if (value === undefined || value === null || value === 'not_verified') return 'לא אומת';
  return labels && labels[value] ? labels[value] : String(value);
}

function externalLink(href, label, cls = '') {
  if (!isSafeHttpsUrl(href)) return h('span', {}, label);
  return h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: cls }, label, ' ', h('span', { class: 'sr-only' }, '(נפתח בלשונית חדשה)'));
}

// ---------- ניווט ----------

function go(next, { replace = false } = {}) {
  const entry = { ...next, depth: replace ? state.depth : state.depth + 1 };
  state = entry;
  if (replace) history.replaceState(entry, '');
  else history.pushState(entry, '');
  render();
}

window.addEventListener('popstate', (event) => {
  if (event.state && event.state.screen) {
    state = event.state;
    render();
  }
});

backButton.addEventListener('click', () => history.back());
homeButton.addEventListener('click', () => go({ screen: 'intro' }));

function openAccountGuide() {
  go({ screen: 'guide', guideId: 'google-account', providerId: null, step: 0 });
}

function render() {
  appEl.replaceChildren();
  const screens = { intro, entry, toolPicker, providerPicker, recommendation, guide, done, troubleshoot };
  const view = (screens[state.screen] || intro)();
  appEl.append(view);
  backButton.hidden = state.depth === 0;
  homeButton.hidden = state.screen === 'intro';
  const title = appEl.querySelector('h1');
  if (title) {
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: false });
  }
  window.scrollTo({ top: 0 });
}

// ---------- מסכים ----------

function intro() {
  return h('section', {},
    h('h1', {}, 'צריכים מפתח API? נעזור לכם להשיג אחד.'),
    h('p', { class: 'lead' }, 'לא צריך לדעת תכנות. נלווה אתכם צעד אחר צעד.'),

    h('h2', {}, 'מה זה בכלל מפתח API?'),
    h('p', {}, rich('כלי הוראה שמשתמשים בבינה מלאכותית (למשל כלי שיוצר שאלות לתלמידים) לא מפעילים את הבינה המלאכותית בעצמם. הם מתחברים לחברה שמפעילה אותה, כמו [[Google]] או [[Groq]].')),
    h('p', {}, rich('מפתח [[API]] הוא סיסמה מיוחדת שמאפשרת לכלי להתחבר לחברה הזאת. יוצרים אותו פעם אחת באתר של החברה, ומדביקים אותו בכלי.')),

    h('h2', {}, 'איך זה עובד?'),
    h('ol', { class: 'steps' },
      h('li', {}, h('strong', {}, 'בוחרים ספק. '), 'נציע לכם את הספק הכי מתאים ונסביר מה כדאי לדעת עליו: האם יש מסלול חינמי, ומה צריך כדי להירשם.'),
      h('li', {}, h('strong', {}, 'יוצרים מפתח. '), 'האתר של הספק ייפתח בחלון נפרד, ואנחנו נראה לכם כאן מה ללחוץ, שלב אחרי שלב.'),
      h('li', {}, h('strong', {}, 'מדביקים בכלי. '), 'חוזרים לכלי ההוראה שלכם, מדביקים את המפתח, ומתחילים לעבוד.'),
    ),
    h('p', { class: 'notice' }, 'האתר הזה לא מבקש את המפתח שלכם ולא שומר אותו. המפתח נוצר רק באתר הספק.'),

    h('div', { class: 'tip', role: 'note' },
      h('h2', {}, 'המלצה לפני שמתחילים: חשבון Google נפרד'),
      h('p', {}, 'כדי ליצור מפתח אצל חלק מהספקים (למשל Gemini של Google) צריך חשבון Google. מומלץ לפתוח חשבון נפרד, שישמש רק לכלי הוראה, ולא להשתמש בחשבון האישי או בחשבון של בית הספר.'),
      h('p', {}, 'כך המידע האישי שלכם נשאר נפרד, ואם חשבון בית הספר חסום, זה לא מפריע. פתיחת החשבון לוקחת כמה דקות, ויש לנו מדריך מצולם.'),
      h('button', { type: 'button', class: 'btn btn-tip', onclick: openAccountGuide }, 'איך פותחים חשבון Google נפרד'),
    ),

    h('button', { type: 'button', class: 'btn', onclick: () => go({ screen: 'entry' }) }, 'בואו נתחיל'),
  );
}

function entry() {
  return h('section', {},
    h('h1', {}, 'לאיזה כלי אתם צריכים את המפתח?'),
    h('p', {}, 'אם הכלי שלכם הציג הוראה כמו "הדביקו מפתח Gemini", בחרו באפשרות השנייה. אם אתם לא בטוחים, בחרו באפשרות הראשונה.'),
    h('ul', { class: 'choice-list' },
      h('li', {}, h('button', { type: 'button', class: 'btn choice', onclick: () => go({ screen: 'recommendation', freeOnly: false }) },
        'אני לא יודע, עזרו לי לבחור', h('small', {}, 'נציג את האפשרות הנוחה ביותר'))),
      h('li', {}, h('button', { type: 'button', class: 'btn choice', onclick: () => go({ screen: 'providerPicker' }) },
        'אני יודע איזה ספק אני צריך', h('small', {}, 'למשל Gemini או Groq'))),
      h('li', {}, h('button', { type: 'button', class: 'btn choice', onclick: () => go({ screen: 'toolPicker' }) },
        'אני רוצה לבחור כלי מתוך הרשימה')),
    ),
  );
}

function toolPicker() {
  const list = h('ul', { class: 'choice-list' });
  for (const tool of data.tools.tools) {
    list.append(h('li', {}, h('button', {
      type: 'button',
      class: 'btn choice',
      onclick: () => {
        params = { ...params, tool: tool.id, providers: [] };
        go({ screen: 'recommendation', freeOnly: false });
      },
    }, tool.name, h('small', {}, tool.description))));
  }
  return h('section', {},
    h('h1', {}, 'בחרו כלי'),
    list,
    h('p', {}, 'הכלי שלכם לא ברשימה? חזרו אחורה ובחרו "אני יודע איזה ספק אני צריך", או בחרו "אני לא יודע".'),
  );
}

function providerPicker() {
  const list = h('ul', { class: 'choice-list' });
  for (const provider of data.providers.providers) {
    list.append(h('li', {}, h('button', {
      type: 'button',
      class: 'btn choice',
      onclick: () => go({ screen: 'recommendation', providerId: provider.id, freeOnly: false }),
    }, provider.name, h('small', {}, provider.summary))));
  }
  return h('section', {}, h('h1', {}, 'בחרו ספק'), list);
}

function recommendation() {
  const { providers } = data.providers;
  const result = recommend({
    providers,
    tools: data.tools.tools,
    params,
    selectedProviderId: state.providerId || null,
    freeOnly: Boolean(state.freeOnly),
  });

  const wrapper = h('section', {}, h('h1', {}, result.mode === 'user' ? 'הספק שבחרתם' : 'הספק המומלץ'));

  wrapper.append(compatibilityNote(result));

  wrapper.append(h('label', { class: 'check' },
    h('input', {
      type: 'checkbox',
      checked: state.freeOnly ? true : false,
      onchange: (event) => go({ ...state, freeOnly: event.target.checked, depth: state.depth }, { replace: true }),
    }),
    'הציגו רק מסלולים חינמיים'));

  if (result.empty) {
    wrapper.append(h('p', { class: 'warning' }, 'לא מצאנו מסלול חינמי מתאים. אפשר לבטל את הסינון ולראות גם מסלולים בתשלום.'));
    return wrapper;
  }

  const [top, ...others] = result.ranked;
  wrapper.append(providerCard(top, result.mode));
  wrapper.append(h('button', { type: 'button', class: 'btn', onclick: () => go({ screen: 'guide', providerId: top.id, step: 0 }) }, 'השיגו לי מפתח מהספק הזה'));

  const freeOthers = others.filter(isFreeOption);
  const paidOthers = others.filter((provider) => !isFreeOption(provider));
  if (freeOthers.length > 0) {
    wrapper.append(h('h2', {}, 'ספקים חינמיים נוספים'), providerChoices(freeOthers));
  }
  if (paidOthers.length > 0) {
    wrapper.append(h('details', { class: 'paid-providers' },
      h('summary', {}, `ספקים בתשלום (${paidOthers.length})`),
      h('p', {}, 'מתאים אם הכלי שלכם דורש במיוחד אחד מהספקים האלה. לא אומת שיש להם מסלול API חינמי.'),
      providerChoices(paidOthers),
    ));
  }
  return wrapper;
}

function providerChoices(items) {
  const list = h('ul', { class: 'choice-list' });
  for (const provider of items) {
    list.append(h('li', {}, h('button', {
      type: 'button',
      class: 'btn choice',
      onclick: () => go({ screen: 'guide', providerId: provider.id, step: 0 }),
    }, provider.name, h('small', {}, `${provider.summary} (${show(provider.freeTier, FREE_LABELS)})`))));
  }
  return list;
}

function compatibilityNote(result) {
  const { mode, tool } = result;
  if (mode === 'verified-tool') {
    return h('p', { class: 'notice' }, `הספקים האלה נבדקו כתואמים לכלי "${tool.name}" (נבדק ב־${tool.compatibilityVerified}).`);
  }
  if (mode === 'declared') {
    return h('p', { class: 'warning' }, 'מפתח הכלי הצהיר שהכלי עובד עם הספקים האלה. האתר שלנו לא בדק את התאימות, ולכן אין ודאות שהמפתח יעבוד.');
  }
  if (mode === 'user') {
    return h('p', { class: 'warning' }, 'האתר לא יודע אם הכלי שלכם תומך בספק הזה. בדקו בכלי אילו ספקים הוא תומך בהם.');
  }
  return h('p', { class: 'notice' }, 'זו המלצה כללית. לפני שמתחילים, כדאי לבדוק בכלי שלכם אילו ספקים הוא תומך בהם, כדי שהמפתח יתאים.');
}

function chip(text, tone) {
  const mark = { ok: '✓ ', warn: '! ', unknown: '? ' }[tone];
  return h('li', { class: `chip chip-${tone}` }, mark, text);
}

// שלוש עובדות שהמורה צריך מיד: עלות, כרטיס אשראי וזמינות בישראל.
function highlights(provider) {
  const free = { yes: ['חינמי', 'ok'], partial: ['חינמי חלקית', 'ok'], no: ['בתשלום', 'warn'], not_verified: ['חינם: לא אומת', 'unknown'] }[provider.freeTier] || ['חינם: לא אומת', 'unknown'];
  const card = { no: ['בלי כרטיס אשראי', 'ok'], yes: ['דורש כרטיס אשראי', 'warn'], not_verified: ['כרטיס אשראי: לא אומת', 'unknown'] }[provider.creditCardRequired] || ['כרטיס אשראי: לא אומת', 'unknown'];
  const israel = { yes: ['זמין בישראל', 'ok'], no: ['לא זמין בישראל', 'warn'], not_verified: ['זמינות בישראל: לא אומתה', 'unknown'] }[provider.availableInIsrael] || ['זמינות בישראל: לא אומתה', 'unknown'];
  return h('ul', { class: 'chips', 'aria-label': 'עיקרי הדברים' }, ...[free, card, israel].map(([text, tone]) => chip(text, tone)));
}

function providerCard(provider) {
  const stale = isStale(provider.lastVerified);
  const models = (provider.supportedModels || []).filter((m) => m !== 'not_verified');

  const card = h('article', { class: 'card' },
    h('h2', {}, provider.name),
    h('p', {}, provider.summary),
    highlights(provider),
  );

  if (provider.dataUsedForTrainingOnFree === 'yes') {
    card.append(h('p', { class: 'warning' }, 'במסלול החינמי הנתונים שאתם שולחים עשויים לשמש לשיפור או לאימון מודלים. אל תזינו מידע אישי או רפואי של תלמידים.'));
  } else if (provider.dataUsedForTrainingOnFree === 'not_verified') {
    card.append(h('p', { class: 'notice' }, 'לא אימתנו מה קורה לנתונים שנשלחים. כברירת מחדל, אל תזינו מידע אישי או רפואי של תלמידים.'));
  }

  if (provider.verificationLevel === 'manually_verified') {
    card.append(h('p', { class: 'small' }, `ההרשמה ויצירת המפתח נבדקו בפועל מישראל (${provider.lastVerified}).`));
  } else if (provider.verificationLevel === 'partially_verified') {
    card.append(h('p', { class: 'small' }, `ההרשמה נבדקה בפועל מישראל (${provider.lastVerified}). חלק מהפרטים עדיין לא אומתו.`));
  } else {
    card.append(h('p', { class: 'small' }, 'המידע נאסף מתיעוד ומאתרים ברשת, ועדיין לא נבדק בהרשמה אמיתית ולא מצולם. לפני החלטה חשובה, ודאו אצל הספק.'));
  }
  if (stale) card.append(h('p', { class: 'small' }, h('span', { class: 'badge' }, 'דורש בדיקה מחדש')));

  const details = h('details', { class: 'more' }, h('summary', {}, 'כל הפרטים: מכסות, פרטיות ומקורות'));
  if (provider.freeTierNote) details.append(h('p', {}, provider.freeTierNote));
  details.append(h('dl', { class: 'facts' },
    fact('מסלול חינמי', show(provider.freeTier, FREE_LABELS)),
    fact('אימות נוסף', show(provider.requiresIdentityVerification, IDENTITY_LABELS)),
    fact('מכסות', show(provider.rateLimits)),
    fact('מודלים', models.length ? models.join(', ') : 'לא אומת'),
    fact('הגבלות גיל', show(provider.ageRestrictions)),
  ));
  if (provider.privacyNotes && provider.privacyNotes !== 'not_verified') {
    details.append(h('p', {}, h('strong', {}, 'פרטיות: '), provider.privacyNotes));
  }
  details.append(h('p', { class: 'small' }, `נבדק לאחרונה: ${provider.lastVerified}`));
  const sources = (provider.officialSources || []).filter(isSafeHttpsUrl);
  if (sources.length) {
    const list = h('ul', { class: 'tips' });
    sources.forEach((src, i) => list.append(h('li', {}, externalLink(src, `מקור ${i + 1}`))));
    details.append(h('p', {}, h('strong', {}, 'מקורות רשמיים ותנאי שימוש:')), list);
  }
  card.append(details);
  return card;
}

function fact(label, value) {
  return h('div', {}, h('dt', {}, label), h('dd', {}, value));
}

const IMAGE_PATH = /^assets\/img\/[a-z0-9-]+\.(png|jpg|webp)$/;

function guide() {
  const guides = data.guides.guides;
  const provider = state.providerId ? data.providers.providers.find((p) => p.id === state.providerId) : null;
  const guideData = state.guideId
    ? guides.find((g) => g.id === state.guideId)
    : provider && guides.find((g) => g.id === provider.guideId);
  if (!guideData) return h('section', {}, h('h1', {}, 'המדריך לא נמצא'), h('p', {}, 'חזרו אחורה ובחרו ספק אחר.'));

  const isHelper = !provider;
  const steps = guideData.steps;
  const index = Math.min(Math.max(Number(state.step) || 0, 0), steps.length - 1);
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const guideName = isHelper ? guideData.title : provider.name;

  const view = h('section', {},
    h('p', { class: 'progress-label' }, `${guideName} · שלב ${index + 1} מתוך ${steps.length}`),
    h('progress', { max: steps.length, value: index + 1, 'aria-label': 'התקדמות במדריך' }),
    h('h1', {}, step.title),
    h('p', {}, rich(step.text)),
  );

  if (step.image && IMAGE_PATH.test(step.image.src)) {
    view.append(h('figure', { class: 'shot' },
      h('img', { src: step.image.src, alt: step.image.alt, loading: 'lazy' }),
      h('figcaption', {}, `צילום מסך מתאריך ${step.image.captured}. ייתכן שהמסך אצלכם שונה במעט.`),
    ));
  }

  const defaultLink = !isHelper && index === 0 && !guideData.noDefaultLink
    ? { url: provider.apiKeyUrl, label: `פתחו את עמוד המפתחות של ${provider.name}` }
    : null;
  const stepLink = step.link || defaultLink;
  if (stepLink) {
    view.append(h('p', {}, externalLink(stepLink.url, stepLink.label, 'btn')));
    const firstLinkIndex = guideData.noDefaultLink ? steps.findIndex((s) => s.link) : 0;
    if (index === firstLinkIndex) {
      view.append(h('p', { class: 'notice' }, 'האתר ייפתח בחלון נפרד. כדי לראות אותו לצד ההסברים כאן, הצמידו כל חלון לצד אחד של המסך (במקלדת של Windows: מקש Windows וחץ ימינה או שמאלה).'));
    }
  }
  if (step.skip) {
    view.append(h('button', {
      type: 'button',
      class: 'btn btn-secondary',
      onclick: () => go({ ...state, step: step.skip.to, depth: state.depth }, { replace: true }),
    }, step.skip.label));
  }
  if (!isHelper && index === 0) {
    if (provider.requiresIdentityVerification === 'phone') {
      view.append(h('p', { class: 'notice' }, 'שימו לב: אצל ספק זה נדרש אימות טלפון.'));
    }
    if (provider.creditCardRequired === 'yes') {
      view.append(h('p', { class: 'notice' }, 'שימו לב: אצל ספק זה נדרש אמצעי תשלום.'));
    }
  }
  if (isHelper && guideData.link && index === (guideData.linkStep ?? 1)) {
    view.append(h('p', {}, externalLink(guideData.link.url, guideData.link.label, 'btn')));
  }
  if (step.helper) {
    view.append(h('button', {
      type: 'button',
      class: 'btn btn-secondary',
      onclick: () => go({ screen: 'guide', guideId: step.helper.guideId, providerId: null, step: 0 }),
    }, step.helper.label));
  }

  const prev = h('button', {
    type: 'button',
    class: 'btn btn-secondary',
    disabled: index === 0,
    onclick: () => go({ ...state, step: index - 1, depth: state.depth }, { replace: true }),
  }, 'הקודם');
  const finishLabel = isHelper ? 'סיימתי, חזרה' : 'סיימתי';
  const next = h('button', {
    type: 'button',
    class: 'btn',
    onclick: () => {
      if (!isLast) go({ ...state, step: index + 1, depth: state.depth }, { replace: true });
      else if (isHelper) history.back();
      else go({ screen: 'done', providerId: provider.id });
    },
  }, isLast ? finishLabel : 'הבא');
  view.append(h('div', { class: 'nav-row' }, next, prev));
  return view;
}

function done() {
  const tool = params.tool ? data.tools.tools.find((t) => t.id === params.tool) : null;
  const view = h('section', {},
    h('h1', {}, 'מצוין! עכשיו אפשר להשתמש במפתח.'),
    h('p', {}, 'חזרו לכלי שלכם והדביקו את המפתח בשדה המיועד לכך.'),
  );
  if (tool && tool.pasteInstructions) view.append(h('p', { class: 'notice' }, rich(tool.pasteInstructions)));
  view.append(h('p', { class: 'warning' }, 'מפתח API הוא סוד. לא מפרסמים אותו ב־GitHub, לא מעבירים אותו לתלמידים ולא מדביקים אותו באתרים שאינם מהימנים.'));
  if (tool && isSafeHttpsUrl(tool.officialUrl)) {
    view.append(externalLink(tool.officialUrl, `חזרה לכלי "${tool.name}"`, 'btn'));
  }
  view.append(h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => go({ screen: 'troubleshoot' }) }, 'המפתח לא עובד, עזרו לי'));
  return view;
}

function troubleshoot() {
  const input = h('textarea', {
    id: 'error-input',
    rows: 6,
    maxlength: 4000,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    dir: 'auto',
  });
  const output = h('div', { 'aria-live': 'polite' });

  const run = () => {
    const result = parseError(input.value, data.errors);
    output.replaceChildren();
    if (!input.value.trim()) return;
    if (result.hadSecret) {
      output.append(h('p', { class: 'warning' }, 'זיהינו משהו שנראה כמו מפתח או סוד, והסתרנו אותו. מומלץ ליצור מפתח חדש אם הדבקתם מפתח אמיתי במקום אחר.'));
    }
    output.append(h('h2', {}, 'ההודעה שהדבקתם (אחרי הסתרת סודות)'));
    output.append(h('div', { class: 'result-box' }, result.redactedText));
    if (result.fallback) {
      output.append(resultCard(result.fallback));
    } else {
      if (result.ambiguous) output.append(h('p', { class: 'notice' }, 'ההודעה מתאימה ליותר מאפשרות אחת. הנה האפשרויות, ואיננו בטוחים איזו מהן נכונה.'));
      result.matches.forEach((match) => output.append(resultCard(match)));
    }
  };

  const clear = () => {
    input.value = '';
    output.replaceChildren();
    input.focus();
  };

  return h('section', {},
    h('h1', {}, 'המפתח לא עובד? נבדוק יחד'),
    h('p', { class: 'warning' }, 'הדביקו כאן את הודעת השגיאה בלבד. לעולם לא את המפתח עצמו.'),
    h('p', {}, 'הבדיקה מתבצעת בדפדפן שלכם בלבד. שום דבר לא נשלח ולא נשמר.'),
    h('label', { for: 'error-input' }, 'הודעת שגיאה'),
    input,
    h('button', { type: 'button', class: 'btn', onclick: run }, 'מה המשמעות?'),
    h('button', { type: 'button', class: 'btn btn-secondary', onclick: clear }, 'נקו הכול'),
    output,
  );
}

function resultCard(entry) {
  return h('article', { class: 'card' },
    h('h2', {}, entry.title),
    h('p', {}, entry.explanation),
    h('ul', { class: 'tips' }, entry.suggestions.map((s) => h('li', {}, s))),
  );
}

// ---------- אתחול ----------

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  const json = await response.json();
  if (json.schemaVersion !== SUPPORTED_SCHEMA) throw new Error(`${path}: schemaVersion`);
  return json;
}

function renderFooter() {
  footerLinks.replaceChildren();
  const url = data.tools.submissionUrl;
  if (isSafeHttpsUrl(url)) {
    footerLinks.append(externalLink(url, 'רוצים להוסיף כלי שלכם?'), ' · ');
  }
  footerLinks.append(
    h('a', { href: '#', onclick: (event) => { event.preventDefault(); openAccountGuide(); } }, 'פתיחת חשבון Google נפרד'),
    ' · ',
    h('a', { href: '#', onclick: (event) => { event.preventDefault(); go({ screen: 'troubleshoot' }); } }, 'המפתח לא עובד?'),
  );
}

async function init() {
  try {
    const [providers, guides, tools, errors] = await Promise.all([
      loadJson('data/providers.json'),
      loadJson('data/guides.json'),
      loadJson('data/tools.json'),
      loadJson('data/errors.json'),
    ]);
    data = { providers, guides, tools, errors };
  } catch (error) {
    appEl.replaceChildren(h('p', { class: 'warning' }, 'לא הצלחנו לטעון את נתוני האתר. נסו לרענן את הדף.'));
    return;
  }

  params = parseParams(window.location.search, {
    toolIds: new Set(data.tools.tools.map((t) => t.id)),
    providerIds: new Set(data.providers.providers.map((p) => p.id)),
  });
  renderFooter();

  const direct = params.tool || params.providers.length > 0;
  state = { screen: direct ? 'recommendation' : 'intro', depth: 0, freeOnly: false };
  history.replaceState(state, '');
  render();
}

init();

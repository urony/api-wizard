// בדיקת קובצי הנתונים מול הסכמות, ובדיקת קשרים בין הקבצים.
// ולידטור קטן שתומך בקבוצת המילות המפתח שבה משתמשות הסכמות שלנו (בלי תלויות חיצוניות).
// הרצה: node scripts/validate-data.mjs
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), 'utf8'));
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

export function validate(value, schema, path = '$') {
  const errors = [];
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: הערך "${value}" אינו אחד מ־${schema.enum.join(', ')}`);
    return errors;
  }
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(value);
    if (!allowed.includes(actual)) {
      errors.push(`${path}: צפוי ${allowed.join('/')}, התקבל ${actual}`);
      return errors;
    }
  }
  if (typeof value === 'string' && schema.pattern && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${path}: "${value}" לא תואם ל־${schema.pattern}`);
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => errors.push(...validate(item, schema.items, `${path}[${i}]`)));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${path}: חסר שדה ${key}`);
    }
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      if (key in value) errors.push(...validate(value[key], sub, `${path}.${key}`));
    }
  }
  return errors;
}

export async function validateAll() {
  const names = ['providers', 'guides', 'tools', 'errors'];
  const errors = [];
  const data = {};
  for (const name of names) {
    data[name] = await readJson(`data/${name}.json`);
    const schema = await readJson(`schemas/${name}.schema.json`);
    errors.push(...validate(data[name], schema, name).map((e) => e));
  }

  const providerIds = new Set();
  for (const p of data.providers.providers) {
    if (providerIds.has(p.id)) errors.push(`providers: מזהה כפול ${p.id}`);
    providerIds.add(p.id);
  }
  const guideIds = new Set(data.guides.guides.map((g) => g.id));
  for (const p of data.providers.providers) {
    if (!guideIds.has(p.guideId)) errors.push(`providers.${p.id}: guideId "${p.guideId}" לא קיים ב־guides.json`);
  }
  for (const g of data.guides.guides) {
    if (g.providerId !== null && !providerIds.has(g.providerId)) errors.push(`guides.${g.id}: providerId "${g.providerId}" לא קיים`);
    for (const step of g.steps) {
      if (step.skip && !(step.skip.to >= 0 && step.skip.to < g.steps.length)) errors.push(`guides.${g.id}: skip.to מחוץ לטווח`);
      if (step.helper && !guideIds.has(step.helper.guideId)) errors.push(`guides.${g.id}: מדריך עזר "${step.helper.guideId}" לא קיים`);
      if (step.image && !existsSync(new URL(step.image.src, root))) errors.push(`guides.${g.id}: התמונה ${step.image.src} לא קיימת`);
    }
  }
  const toolIds = new Set();
  for (const t of data.tools.tools) {
    if (toolIds.has(t.id)) errors.push(`tools: מזהה כפול ${t.id}`);
    toolIds.add(t.id);
    for (const pid of t.supportedProviders) {
      if (!providerIds.has(pid)) errors.push(`tools.${t.id}: ספק "${pid}" לא קיים`);
    }
    if (t.compatibilityVerified && t.supportedProviders.length === 0) {
      errors.push(`tools.${t.id}: מסומן כמאומת אבל אין ספקים`);
    }
  }
  for (const e of data.errors.errors) {
    for (const pattern of e.patterns) {
      try { new RegExp(pattern, 'i'); } catch { errors.push(`errors.${e.id}: ביטוי לא תקין ${pattern}`); }
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = await validateAll();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('קובצי הנתונים תקינים.');
}

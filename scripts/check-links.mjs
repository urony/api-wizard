// בדיקת קישורים תקופתית. מדווח על קישורים שבורים (404/410/שגיאת רשת).
// תגובות 401/403/429 נחשבות "כנראה תקין" כי אתרים רבים חוסמים בוטים.
// קישור חי אינו הוכחה שמחירים או מכסות לא השתנו.
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const providers = JSON.parse(await readFile(new URL('data/providers.json', root), 'utf8')).providers;

const urls = new Set();
for (const p of providers) {
  [p.officialUrl, p.apiKeyUrl, ...p.officialSources].forEach((u) => urls.add(u));
}

let broken = 0;
for (const url of urls) {
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(20000) });
    const ok = response.ok || [401, 403, 429].includes(response.status);
    if (!ok) {
      broken += 1;
      console.log(`שבור (${response.status}): ${url}`);
    }
  } catch (error) {
    broken += 1;
    console.log(`שגיאת רשת: ${url} (${error.message})`);
  }
}
console.log(broken === 0 ? 'כל הקישורים נראים תקינים.' : `${broken} קישורים דורשים בדיקה.`);
process.exit(broken === 0 ? 0 : 1);

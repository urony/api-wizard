# נתוני ספקים ראשוניים — נאספו ב-17.10.2026

**חשוב:** נאסף מחיפוש ברשת (תיעוד רשמי כשאפשר, אתרי צד שלישי כשצוין). לא נבדקה הרשמה חיה מישראל. `not_verified` = לא הצלחתי לאמת.
המספרים משתנים הרבה, לכן כל שורה צריכה בדיקה אנושית לפני פרסום.

## Google Gemini API
- קישור למפתח: https://aistudio.google.com/apikey (מקובל, לא נבדק בדף רשמי בסבב זה)
- חינם: **כן**, מסלול Free ללא תשלום. מקור: https://ai.google.dev/gemini-api/docs/pricing
- כרטיס אשראי: לא נדרש להתחלה. חשבון חדש מתחיל במסלול Free. מקור: https://ai.google.dev/gemini-api/docs/billing
- ישראל: **כן**, ישראל ברשימת האזורים הנתמכים. מקור: https://ai.google.dev/gemini-api/docs/available-regions
- גיל: נדרש 18+ ואימות גיל בחשבון Google (מקור: אותו עמוד אזורים). **משמעות: תלמידים קטינים לא יכולים ליצור מפתח בעצמם.**
- פרטיות: **במסלול החינמי התוכן משמש לשיפור מוצרי Google, ובודקים אנושיים עשויים לקרוא אותו.** לא להזין מידע אישי או רפואי של תלמידים. מקור: https://ai.google.dev/gemini-api/terms
- מכסות: משתנות לפי מודל, מוצגות ב-AI Studio. הנתונים שמצאתי באתרי צד שלישי סותרים (למשל 10 בקשות לדקה, 20 ביום למודלי Flash). `not_verified` למספרים מדויקים.
- פרוטוקול: native, ובנוסף שכבת תאימות ל-OpenAI (לא אומת בסבב זה).

## Groq Cloud (לא Grok)
- קישור למפתח: https://console.groq.com/keys
- חינם: **כן**, Free plan. מקור: https://console.groq.com/docs/rate-limits
- מכסות לפי אתר צד שלישי מ-4.10.2026: למודלים gpt-oss-120b, gpt-oss-20b ו-Qwen: 30 בקשות לדקה, 1,000 ליום, 200,000 טוקנים ליום. Groq עצמה אומרת שהטבלה סיכום והמכסה המדויקת בעמוד Limits בקונסול. `partially_verified`.
- כרטיס אשראי: `not_verified`
- ישראל: `not_verified` (עמוד האזורים לא נטען)
- פרוטוקול: openai-compatible, כולל chat/completions ו-responses. כתובת: https://api.groq.com/openai/v1. מקור: https://console.groq.com/docs/overview
- פרטיות: שמירת לוגים עד 30 יום לצורכי אמינות ואבטחה, אחסון בארה"ב, אפשר להפעיל Zero Data Retention בהגדרות. מקור: https://console.groq.com/docs/your-data

## OpenRouter
- קישור למפתח: https://openrouter.ai/settings/keys
- חינם: **חלקי.** מודלים עם סיומת `:free` וגם `openrouter/free`. מקור: https://openrouter.ai/docs/api/reference/limits
- מכסות: 20 בקשות לדקה. עד 50 בקשות ליום בחשבון שרכש פחות מ-10 קרדיטים; 1,000 ליום אחרי רכישת 10 קרדיטים לפחות. **משמעות: 50 בקשות ליום מעט לכיתה שלמה.**
- כרטיס אשראי: לא נדרש להרשמה; `not_verified` האם נדרש להפקת מפתח
- ישראל: `not_verified`
- פרוטוקול: openai-compatible (chat completions). כתובת: https://openrouter.ai/api/v1
- פרטיות: פרומפטים לא נשמרים כברירת מחדל. מקור: https://openrouter.ai/docs/faq. **אבל מודלים חינמיים מופעלים אצל ספקים חיצוניים עם מדיניות משלהם: `not_verified`.**

## Mistral AI
- קישור למפתח: https://console.mistral.ai (לאחר בחירת Experiment plan, תפריט API Keys)
- חינם: **כן**, Experiment plan. מקור: https://help.mistral.ai/en/articles/455206-how-can-i-try-the-api-for-free-with-the-experiment-plan (דרך תוצאות חיפוש)
- כרטיס אשראי: לא. **נדרש אימות טלפון** (טלפון אחד לכל חשבון).
- פרטיות: **בקשות במסלול הניסוי עשויות לשמש לאימון מודלים של Mistral.** לא להזין מידע אישי או רפואי.
- מכסות: נמוכות ("conservative"), למטרות הערכה בלבד. הערכה לא רשמית: בקשה אחת בשנייה, כמיליארד טוקנים בחודש. `not_verified`
- ישראל: `not_verified`
- פרוטוקול: openai-compatible. כתובת: https://api.mistral.ai/v1

## OpenAI API
- קישור למפתח: https://platform.openai.com/api-keys
- חינם: **לא אומת.** לא מצאתי במקור רשמי מסלול API חינמי. להציג כמסלול בתשלום.
- ישראל: **כן**, ישראל ברשימת המדינות הנתמכות. מקור: https://developers.openai.com/api/docs/supported-countries
- כרטיס אשראי / סכום מינימלי: `not_verified`

## xAI / Grok API
- קישור למפתח: https://console.x.ai
- חינם: **לא אומת.** המחיר הרשמי מתחיל בכ-2 דולר למיליון טוקנים. מקור: https://docs.x.ai/developers/pricing
- חיוב: קרדיטים בתשלום מראש, בלי החזר. מקור: https://docs.x.ai/console/billing
- פרוטוקול: openai-compatible, כתובת https://api.x.ai/v1
- ישראל: `not_verified`

## מה שחסר ודורש בדיקה שלך
1. הרשמה חיה מישראל בכל ספק: כרטיס אשראי, אימות טלפון, חסימות.
2. מכסות מדויקות מהקונסולים עצמם.
3. עמוד האזורים של Groq, Mistral, OpenRouter, xAI.

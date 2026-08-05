/** Localized strings for the SCAN screen — 20+ global languages. */

export const SCAN_STRINGS = {
  scan_desc: {
    uz: "Matn aniqlanadi, so'z ustiga bossangiz tarjima chiqadi",
    ru: "Текст распознается, нажмите на слово для перевода",
    ar: "سيتم التعرف على النص، اضغط على الكلمة للترجمة",
    kr: "텍스트가 인식됩니다. 단어를 누르면 번역이 나옵니다",
    en: "Text is recognized, tap any word to translate instantly",
    tr: "Metin tanınır, çeviri için kelimeye dokunun",
    es: "El texto se reconoce, toca una palabra para traducir",
    pt: "O texto é reconhecido, toque em uma palavra para traduzir",
    de: "Text wird erkannt, tippen Sie auf ein Wort zum Übersetzen",
    fr: "Le texte est reconnu, appuyez sur un mot pour traduire",
    it: "Il testo viene riconosciuto, tocca una parola per tradurre",
    ja: "テキストが認識されます。単語をタップすると翻訳が表示されます",
    zh: "文本自动识别，点击单词即可翻译",
    vi: "Văn bản được nhận dạng, chạm vào từ để dịch ngay",
    id: "Teks dikenali, ketuk kata untuk menerjemahkan",
    kk: "Мәтін танылады, аударма үшін сөзге басыңыз",
    tg: "Матн шинохта мешавад, барои тарҷума калимаро пахш кунед",
    ky: "Текст таанылат, котормо үчүн сөздү басыңыз",
    az: "Mətn tanınır, tərcümə üçün sözün üzərinə vurun",
    fa: "متن تشخیص داده می‌شود، برای ترجمه روی کلمه کلیک کنید",
    hi: "टेक्स्ट की पहचान की जाएगी, अनुवाद के लिए शब्द पर टैप करें",
  },
} as const;

export type ScanKey = keyof typeof SCAN_STRINGS;

/** Maps app language codes (incl. variants like uzc, ko, tk) to dictionary keys. */
const ALIAS: Record<string, string> = {
  uzc: "uz",
  ko: "kr",
  tk: "tr",
  fas: "fa",
  in: "id",
  "zh-cn": "zh",
  "pt-br": "pt",
};

export function scanText(key: ScanKey, userLang: string | undefined | null): string {
  const raw = (userLang ?? "uz").toLowerCase();
  const code = ALIAS[raw] ?? raw.split("-")[0];
  const dict = SCAN_STRINGS[key] as Record<string, string>;
  return dict[code] ?? dict[ALIAS[code] ?? ""] ?? dict.en;
}

const toxicPatterns = [
  /(kill|die)\s+(you|him|her|them)/i,
  /(i\s+hate\s+you)/i,
  /(you\s+are\s+(stupid|dumb|idiot))/i,
  /(go\s+to\s+hell)/i,
];

let cachedToxicWords = null;

const normalizeText = (text) =>
  text
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[1!]/g, "i")
    .replace(/3/g, "e")
    .replace(/0/g, "o");

const buildSpacedRegex = (word) =>
  new RegExp(word.split("").join("[\\s\\W_]*"), "i");

export const loadToxicWords = async () => {
  if (cachedToxicWords) return cachedToxicWords;

  const languages = ["ar","cs", "da","de","en","eo","es","fa","fi","fil","fr", "hi","hu","it","ja","ko","kab","nl","no","pl","pt", "ru", "sv", "th", "tlh", "tr", "zh"];
  const allWords = [];

  await Promise.all(
    languages.map(async (lang) => {
      try {
        const res = await fetch(`/toxic/${lang}.txt`);
        if (!res.ok) return;
        const text = await res.text();
        const words = text
          .split("\n")
          .map((w) => w.trim())
          .filter((w) => w.length > 0);
        allWords.push(...words);
      } catch {
        console.warn(`Could not load toxic words for: ${lang}`);
      }
    })
  );

  cachedToxicWords = [...new Set(allWords)];
  console.log(`✅ Loaded ${cachedToxicWords.length} toxic words`);
  return cachedToxicWords;
};

export const isToxicMessage = (text, toxicWords = []) => {
  const normalized = normalizeText(text);
  if (toxicPatterns.some((p) => p.test(normalized))) return true;
  return toxicWords.some((word) => buildSpacedRegex(word).test(normalized));
};

export const maskToxicWords = (text, toxicWords = []) => {
  let masked = text;
  toxicWords.forEach((word) => {
    const regex = new RegExp(
      word.split("").join("[\\s\\W_]*"),
      "gi"
    );
    masked = masked.replace(regex, (match) =>
      "*".repeat(match.replace(/\s+/g, "").length)
    );
  });
  return masked;
};

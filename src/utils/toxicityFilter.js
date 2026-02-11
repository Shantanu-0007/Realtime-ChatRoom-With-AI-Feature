// src/utils/toxicityFilter.js

const toxicWords = [
  "idiot", "stupid", "dumb", "moron", "fool",
  "hate", "kill", "die",
  "bastard", "shit", "loser"
];

const toxicPatterns = [
  /(kill|die)\s+(you|him|her|them)/i,
  /(i\s+hate\s+you)/i,
  /(you\s+are\s+(stupid|dumb|idiot))/i,
  /(go\s+to\s+hell)/i,
];

// normalize leetspeak
const normalizeText = (text) =>
  text
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[1!]/g, "i")
    .replace(/3/g, "e")
    .replace(/0/g, "o");

// 🔑 builds regex like: s[\s\W_]*t[\s\W_]*u...
const buildSpacedRegex = (word) =>
  new RegExp(word.split("").join("[\\s\\W_]*"), "i");

export const isToxicMessage = (text) => {
  const normalized = normalizeText(text);

  if (toxicPatterns.some((p) => p.test(normalized))) return true;

  return toxicWords.some((word) =>
    buildSpacedRegex(word).test(normalized)
  );
};

// PARTIAL MASKING (handles spaced words)
export const maskToxicWords = (text) => {
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

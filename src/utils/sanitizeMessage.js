// src/utils/sanitizeMessage.js

import { isToxicMessage, maskToxicWords } from "./toxicityFilter";

export const sanitizeMessage = (text) => {
  const toxic = isToxicMessage(text);

  return {
    cleanText: toxic ? maskToxicWords(text) : text,
    isToxic: toxic,
  };
};

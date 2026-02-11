// src/utils/aiToxicity.js
// Later we can replace this with TensorFlow.js / ML model

import { isToxicMessage } from "./toxicityFilter";

export const detectToxicityAI = async (text) => {
  // Simulate async AI call
  return {
    isToxic: isToxicMessage(text),
    confidence: isToxicMessage(text) ? 0.85 : 0.05,
  };
};

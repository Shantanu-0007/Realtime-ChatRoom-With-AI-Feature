export const checkAIToxicity = async (text) => {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a toxicity detector. Reply with ONLY a JSON object like: {"toxic": true} or {"toxic": false}. A message is toxic if it contains hate speech, threats, insults, abuse, or profanity. No explanation, no extra text — only JSON.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    const data = await response.json();
    const raw = data.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);
    return parsed.toxic === true;

  } catch (error) {
    console.error("AI toxicity error:", error);
    return false;
  }
};

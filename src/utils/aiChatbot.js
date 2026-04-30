export const getAIResponse = async (prompt) => {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // free model
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant in a chat app. Be concise and clear.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Groq error:", err);
      return `⚠️ AI error: ${err.error?.message || "Unknown error"}`;
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error("AI fetch error:", error);
    return "🚫 Could not reach AI. Check your API key.";
  }
};

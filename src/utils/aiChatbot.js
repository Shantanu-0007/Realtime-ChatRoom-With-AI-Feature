export const getAIResponse = async (prompt) => {

  try {

    const response = await fetch(
      "https://api-inference.huggingface.co/models/google/flan-t5-base",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer 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"
        },
        body: JSON.stringify({
          inputs: prompt
        })
      }
    );

    const data = await response.json();

    console.log("AI RAW RESPONSE:", data);

    if (Array.isArray(data) && data.length > 0) {
      return data[0].generated_text;
    }

    if (data.error) {
      return "AI model is loading. Please try again.";
    }

    return "AI could not generate a response.";

  } catch (error) {

    console.error("AI error:", error);
    return "AI service unavailable.";

  }

};
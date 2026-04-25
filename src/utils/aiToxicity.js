export const checkAIToxicity = async (text) => {

  try {

    const response = await fetch(
      "https://api-inference.huggingface.co/models/unitary/toxic-bert",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          //(better performance)
          Authorization: "Bearer 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"
        },
        body: JSON.stringify({
          inputs: text
        })
      }
    );

    const data = await response.json();

    if (!Array.isArray(data)) return false;

    const toxicLabel = data.find(
      (item) => item.label === "toxic"
    );

    return toxicLabel && toxicLabel.score > 0.7;

  } catch (error) {

    console.error("AI toxicity error:", error);
    return false;

  }
};

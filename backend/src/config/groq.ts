import Groq from "groq-sdk";

let client: Groq | null = null;

export const getGroqClient = (): Groq => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  if (!client) {
    client = new Groq({
      apiKey,
      timeout: 30000,
      maxRetries: 0,
    });
  }

  return client;
};

export const getGroqModel = (): string => {
  return process.env.GROQ_MODEL || "openai/gpt-oss-20b";
};
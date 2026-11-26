import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export const getGeminiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (!client) {
    client = new GoogleGenAI({
      apiKey,
    });
  }

  return client;
};

export const getGeminiModel = (): string => {
  return process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
};
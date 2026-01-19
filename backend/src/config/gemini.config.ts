export function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    fastModel: process.env.GEMINI_FAST_MODEL ?? 'gemini-2.5-pro',
    advancedModel: process.env.GEMINI_ADVANCED_MODEL ?? 'gemini-2.0-flash-exp',
  };
}

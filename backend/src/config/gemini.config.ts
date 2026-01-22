/**
 * Gemini API configuration
 *
 * Dual-agent architecture:
 * - Fast Model: Quick intent/entity extraction (~85% of requests)
 * - Advanced Model: Complex reasoning, disambiguation (~15% of requests)
 */
export function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    // Fast agent for quick intent extraction (Gemini 2.0 Flash)
    fastModel: process.env.GEMINI_FAST_MODEL ?? 'gemini-2.0-flash-exp',
    // Advanced agent for complex reasoning (Gemini 1.5 Pro)
    advancedModel: process.env.GEMINI_ADVANCED_MODEL ?? 'gemini-1.5-pro',
  };
}

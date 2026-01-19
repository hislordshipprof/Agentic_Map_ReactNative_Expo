import { HttpException, HttpStatus } from '@nestjs/common';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function generateContent(
  apiKey: string,
  model: string,
  systemInstruction: string,
  userText: string,
): Promise<string> {
  const url = `${BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generation_config: { temperature: 0.1, max_output_tokens: 1024 },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) {
      throw new HttpException(
        {
          error: {
            code: 'API_QUOTA_EXCEEDED',
            message: 'Gemini API quota exceeded.',
            suggestions: ['Retry later', 'Check your quota at https://aistudio.google.com'],
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    throw new Error(`Gemini API error: ${res.status} ${t}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text;
}

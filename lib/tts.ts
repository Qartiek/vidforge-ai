export type TTSParams = { text: string; voice?: string; model?: string };

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const { default: OpenAI } = await import("openai");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_TTS_MODEL || "tts-1";
  const voice = (process.env.OPENAI_TTS_VOICE || "alloy") as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  const response = await client.audio.speech.create({
    model,
    voice,
    input: text,
  });
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

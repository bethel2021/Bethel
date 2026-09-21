import { GoogleGenAI } from '@google/genai';

/**
 * Server-side Gemini AI Service
 *
 * CRITICAL SECURITY & ARCHITECTURAL MANDATES:
 * 1. GEMINI_API_KEY is used EXCLUSIVELY on the server side (Node.js / Vercel Serverless Function).
 * 2. NEVER expose GEMINI_API_KEY to the browser, HTML, localStorage, or client bundles.
 * 3. NEVER use VITE_GEMINI_API_KEY or inject the key into any frontend assets.
 * 4. All AI capabilities follow the strict path:
 *    Browser Client -> Vercel Serverless API (/api/ai/*) -> Gemini API
 */

let geminiClient: GoogleGenAI | null = null;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  if (!geminiClient) {
    try {
      geminiClient = new GoogleGenAI({ apiKey: apiKey.trim() });
    } catch (err) {
      console.error('[Gemini Service] Error initializing GoogleGenAI:', err);
      return null;
    }
  }

  return geminiClient;
}

/**
 * Generates an inspiring weekly devotional thought, prayer, or attendance report summary
 * using server-side Gemini 3.8 Flash model.
 */
export async function generateDevotionalOrSummary(prompt: string, context?: string): Promise<{ text: string; success: boolean; error?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      text: '',
      success: false,
      error: 'GEMINI_API_KEY 未在服务器环境变量中配置。请在服务器端或部署平台配置 GEMINI_API_KEY。'
    };
  }

  try {
    const fullPrompt = context 
      ? `【教会背景信息】\n${context}\n\n【生成任务】\n${prompt}`
      : prompt;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: '你是一位温和、敬虔、严谨的基督教教会主日学同工助手。请根据圣经真理，提供富有爱心、鼓励性、造就信徒的祷告词、金句解析、课堂引导或出勤鼓励。文字请使用规范中文，语言亲切温和。',
        temperature: 0.7,
      }
    });

    const generatedText = response.text || '';
    return {
      text: generatedText.trim(),
      success: true
    };
  } catch (err: any) {
    console.error('[Gemini Service] Error generating content:', err);
    return {
      text: '',
      success: false,
      error: err?.message || '生成失败，请稍后重试'
    };
  }
}

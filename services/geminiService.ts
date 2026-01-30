import { GoogleGenAI } from "@google/genai";
import { User, DaySummary } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function getWorkPerformanceInsight(user: User, summaries: DaySummary[]): Promise<string> {
  if (!ai) {
    return "Configure VITE_GEMINI_API_KEY no .env.local para usar os insights com IA.";
  }

  const prompt = `
    Analise o desempenho do funcionário ${user.name} (Cargo: ${user.position}).
    Dados dos últimos dias: ${JSON.stringify(summaries.map(s => ({
      data: s.date,
      horasTrabalhadas: s.totalHours.toFixed(2),
      metaBatida: s.isGoalMet
    })))}

    Forneça um resumo curto e motivacional em português (PT-BR) sobre o banco de horas e produtividade dele.
    Se houver muitas metas não batidas, sugira ajustes de forma amigável.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "Você é um consultor de RH inteligente e motivador da empresa Kronus.",
        temperature: 0.7,
      },
    });
    return response.text ?? "Não foi possível gerar o texto.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível gerar insights no momento. Verifique sua chave de API.";
  }
}

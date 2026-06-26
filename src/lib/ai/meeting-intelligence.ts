import { createHash } from "node:crypto";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";

export const meetingIntelligenceSchema = z.object({
  executiveSummary: z.string().min(1),
  strategicSummary: z.string().min(1),
  decisions: z.array(z.object({
    title: z.string().min(1),
    description: z.string().default(""),
  })),
  tasks: z.array(z.object({
    title: z.string().min(1),
    description: z.string().default(""),
    priority: z.enum(["urgent", "high", "medium", "low"]).default("medium"),
    area: z.string().default("Geral"),
  })),
  risks: z.array(z.object({
    title: z.string().min(1),
    description: z.string().default(""),
    severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  })),
  opportunities: z.array(z.object({
    title: z.string().min(1),
    description: z.string().default(""),
  })),
  nextSteps: z.array(z.string()),
  nextAgenda: z.array(z.string()),
  productInsights: z.array(z.string()),
  marketingInsights: z.array(z.string()),
  operationsInsights: z.array(z.string()),
  pendingQuestions: z.array(z.string()),
});

export type MeetingIntelligence = z.infer<typeof meetingIntelligenceSchema>;

export async function generateMeetingIntelligence(input: {
  title: string;
  transcript: string;
}) {
  const startedAt = Date.now();
  const inputHash = createHash("sha256").update(input.transcript).digest("hex");
  const modelName = process.env.AI_MODEL || "gpt-5-mini";

  if (!process.env.OPENAI_API_KEY) {
    const result = fallbackIntelligence(input);
    return {
      result,
      provider: "local",
      model: "deterministic-fallback",
      inputHash,
      latencyMs: Date.now() - startedAt,
      usage: { inputTokens: null, outputTokens: null },
    };
  }

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await generateText({
    model: openai(modelName),
    output: Output.object({ schema: meetingIntelligenceSchema }),
    system: [
      "Você é o analista estratégico interno da Triade Saúde e Performance.",
      "Use apenas fatos presentes na transcrição.",
      "Não invente responsáveis, datas, métricas ou decisões.",
      "Escreva em português do Brasil, de forma executiva e objetiva.",
      "Transforme somente compromissos explícitos em tarefas.",
    ].join("\n"),
    prompt: `Reunião: ${input.title}\n\nTranscrição:\n${input.transcript}`,
  });

  return {
    result: response.output,
    provider: "openai",
    model: modelName,
    inputHash,
    latencyMs: Date.now() - startedAt,
    usage: {
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
    },
  };
}

function fallbackIntelligence(input: { title: string; transcript: string }): MeetingIntelligence {
  const normalized = input.transcript.replace(/\s+/g, " ").trim();
  const excerpt = normalized.slice(0, 700);
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const actionSentences = sentences
    .filter((sentence) =>
      /\b(precisa|vamos|deve|definir|criar|corrigir|subir|publicar|configurar|validar|revisar|implementar|integrar|finalizar)\b/i.test(
        sentence,
      ),
    )
    .slice(0, 6);
  const decisionSentences = sentences
    .filter((sentence) => /\b(decid|defin|alinh|aprov|prioriz)\w*/i.test(sentence))
    .slice(0, 4);
  const riskSentences = sentences
    .filter((sentence) => /\b(risco|bloque|depend|erro|falha|problema|pendente)\w*/i.test(sentence))
    .slice(0, 4);

  return {
    executiveSummary: excerpt || `A reunião "${input.title}" ainda não possui transcrição suficiente.`,
    strategicSummary: "Análise local gerada sem provedor externo. Configure OPENAI_API_KEY para uma leitura estratégica completa.",
    decisions: decisionSentences.map((sentence) => ({
      title: sentence.slice(0, 140),
      description: sentence,
    })),
    tasks: (actionSentences.length ? actionSentences : sentences.slice(0, 3)).map((sentence) => ({
      title: sentence.replace(/^(vamos|precisa|deve|definir|criar|corrigir)\s+/i, "").slice(0, 120),
      description: sentence,
      priority: /urgente|hoje|imediat|bloque/i.test(sentence) ? "high" : "medium",
      area: /api|deploy|vercel|github|banco|supabase/i.test(sentence) ? "Tecnologia" : "Operação",
    })),
    risks: riskSentences.map((sentence) => ({
      title: sentence.slice(0, 140),
      description: sentence,
      severity: /grave|crítico|critico|bloque/i.test(sentence) ? "high" : "medium",
    })),
    opportunities: [],
    nextSteps: sentences.slice(0, 3),
    nextAgenda: [],
    productInsights: [],
    marketingInsights: [],
    operationsInsights: [],
    pendingQuestions: [],
  };
}

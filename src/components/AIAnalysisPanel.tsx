"use client";

import { AlertTriangle, CheckCircle2, Lightbulb, ListTodo } from "lucide-react";
import { Badge } from "@/components/page-parts";

type Insight = { kind: "risk" | "opportunity" | "action" | "insight"; title: string; description?: string; priority?: string };

export function AIAnalysisPanel({ insights, decisions }: { insights?: Insight[]; decisions?: any[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-lg font-bold">Decisões Extraídas</h2>
        {decisions && decisions.length > 0 ? (
          <div className="space-y-3">
            {decisions.map((d, i) => (
              <div key={i} className="panel border-l-4 border-emerald-500 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{d.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{d.description}</p>
                  </div>
                  <Badge tone="green">Aberta</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nenhuma decisão extraída</p>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold">Riscos & Oportunidades</h2>
        {insights && insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((i, idx) => {
              const Icon = i.kind === "risk" ? AlertTriangle : i.kind === "opportunity" ? Lightbulb : i.kind === "action" ? ListTodo : CheckCircle2;
              const color = i.kind === "risk" ? "text-red-500" : i.kind === "opportunity" ? "text-blue-500" : "text-emerald-500";

              return (
                <div key={idx} className="panel flex gap-3 p-4">
                  <Icon className={`size-5 flex-shrink-0 ${color}`} />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{i.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{i.description}</p>
                    {i.priority && <Badge tone="amber" className="mt-2">{i.priority}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nenhum insight disponível</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo } from "react";
import type { Lead, LeadStage } from "@/models/lead";
import LeadCard from "@/components/LeadCard";

const STAGES: { key: LeadStage; title: string }[] = [
  { key: "novo", title: "Novo contato" },
  { key: "conversando", title: "Conversando" },
  { key: "qualificando", title: "Qualificando" },
  { key: "interessado", title: "Interessado" },
  { key: "fechado", title: "Fechado" },
  { key: "pos_venda", title: "Pós-venda" },
  { key: "perdido", title: "Perdido" },
];

export default function KanbanBoard({
  leads,
  onMove,
}: {
  leads: Lead[];
  onMove: (leadId: string, nextStage: LeadStage) => Promise<void>;
}) {
  const byStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of STAGES) map[s.key] = [];
    for (const l of leads) (map[l.stage] ??= []).push(l);
    return map;
  }, [leads]);

  async function handleDragEnd(e: DragEndEvent) {
    const activeId = e.active?.id as string | undefined;
    const overId = e.over?.id as string | undefined;
    if (!activeId || !overId) return;

    // overId vem como "stage:interessado"
    if (!overId.startsWith("stage:")) return;
    const nextStage = overId.replace("stage:", "") as LeadStage;

    await onMove(activeId, nextStage);
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div style={{
        display:"grid",
        gap:12,
        gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))"
      }}>
        {STAGES.map((s) => (
          <div key={s.key} className="card" style={{ minHeight: 240 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ fontWeight: 800 }}>{s.title}</div>
              <div className="badge">{(byStage[s.key] ?? []).length}</div>
            </div>

            <div
              id={`stage:${s.key}`}
              style={{
                border:"1px dashed var(--border)",
                borderRadius: 12,
                padding: 10,
                minHeight: 170
              }}
            >
              <SortableContext
                items={(byStage[s.key] ?? []).map(l => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ display:"grid", gap:10 }}>
                  {(byStage[s.key] ?? []).map((l) => (
                    <LeadCard key={l.id} lead={l} />
                  ))}
                </div>
              </SortableContext>
            </div>
          </div>
        ))}
      </div>
    </DndContext>
  );
}

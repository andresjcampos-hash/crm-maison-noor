"use client";

import { useEffect, useState } from "react";
import KanbanBoard from "@/components/KanbanBoard";
import { listLeads, moveLeadStage } from "@/lib/db/leads";
import type { Lead, LeadStage } from "@/models/lead";

export default function KanbanView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    setLeads(await listLeads());
    setLoading(false);
  }

  async function onMove(leadId: string, nextStage: LeadStage) {
    await moveLeadStage(leadId, nextStage);
    await refresh();
  }

  return (
    <div>
      <h1 className="h1">Kanban</h1>
      <div className="muted" style={{ marginBottom: 10 }}>
        Arraste o lead para mudar o status.
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
        <button className="btn" onClick={refresh}>Atualizar</button>
      </div>

      {loading ? <div className="muted">Carregando...</div> : (
        <KanbanBoard leads={leads} onMove={onMove} />
      )}
    </div>
  );
}

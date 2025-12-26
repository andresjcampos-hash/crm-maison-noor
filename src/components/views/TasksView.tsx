"use client";

import { useEffect, useState } from "react";
import { listOpenTasks, updateTask } from "@/lib/db/tasks";
import type { Task } from "@/models/task";
import { getLead } from "@/lib/db/leads";
import CopyMessageButton from "@/components/CopyMessageButton";
import OpenWhatsAppButton from "@/components/OpenWhatsAppButton";

function taskTitle(t: Task) {
  switch (t.type) {
    case "followup_24h": return "Follow-up 24h";
    case "followup_48h": return "Follow-up 48h";
    case "post_sale_3d": return "Pós-venda 3 dias";
    case "winback_30d": return "Reativar 30 dias";
    default: return t.type;
  }
}

export default function TasksView() {
  const [items, setItems] = useState<Task[]>([]);
  const [leadCache, setLeadCache] = useState<Record<string, any>>({});

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const tasks = await listOpenTasks();
    setItems(tasks);

    const cache: Record<string, any> = {};
    for (const t of tasks) {
      const lead = await getLead(t.leadId);
      if (lead) cache[t.leadId] = lead;
    }
    setLeadCache(cache);
  }

  async function done(id: string) {
    await updateTask(id, { status: "done" });
    await refresh();
  }

  const defaultMsg = "Passando só pra te dar retorno 😊 Quer algo mais doce ou mais amadeirado?";

  return (
    <div className="card">
      <h1 className="h1">Tarefas</h1>
      <div className="muted" style={{ marginBottom: 10 }}>
        (MVP) As tarefas automáticas entram na próxima fase com Cloud Functions. Aqui você já consegue executar as ações.
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Lead</th>
            <th>Vencimento</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map(t => {
            const lead = leadCache[t.leadId];
            return (
              <tr key={t.id}>
                <td style={{ fontWeight: 800 }}>{taskTitle(t)}</td>
                <td className="muted">{lead ? lead.name : t.leadId}</td>
                <td className="muted">{new Date(t.dueAt).toLocaleString()}</td>
                <td>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    <OpenWhatsAppButton phone={lead?.whatsapp} text={defaultMsg} />
                    <CopyMessageButton text={defaultMsg} />
                    <button className="btn" onClick={() => done(t.id)}>Concluir</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {items.length === 0 ? <div className="muted">Sem tarefas abertas.</div> : null}
    </div>
  );
}

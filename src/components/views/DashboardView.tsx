"use client";

import { useEffect, useMemo, useState } from "react";
import { listLeads } from "@/lib/db/leads";
import { listOrders } from "@/lib/db/orders";

export default function DashboardView() {
  const [leads, setLeads] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLeads(await listLeads());
      setOrders(await listOrders());
    })();
  }, []);

  const kpis = useMemo(() => {
    const now = Date.now();
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const ordersMonth = orders.filter(o => (o.createdAt ?? 0) >= monthStart.getTime());
    const revenueMonth = ordersMonth.reduce((acc, o) => acc + (o.total ?? 0), 0);

    const newLeads = leads.filter(l => (now - (l.createdAt ?? now)) <= 7*24*60*60*1000);
    const late = leads.filter(l => {
      const last = l.lastInteractionAt ?? l.createdAt ?? now;
      return (now - last) > 24*60*60*1000 && !["fechado","perdido"].includes(l.stage);
    });

    return { revenueMonth, ordersMonth: ordersMonth.length, leadsTotal: leads.length, newLeads: newLeads.length, late: late.length };
  }, [leads, orders]);

  return (
    <div>
      <h1 className="h1">Dashboard</h1>
      <div className="row" style={{ marginBottom: 14 }}>
        <div className="card kpi">
          <div className="h2">Vendas (mês)</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>R$ {kpis.revenueMonth.toFixed(2)}</div>
          <div className="muted">{kpis.ordersMonth} pedidos</div>
        </div>
        <div className="card kpi">
          <div className="h2">Leads</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{kpis.leadsTotal}</div>
          <div className="muted">{kpis.newLeads} novos em 7 dias</div>
        </div>
        <div className="card kpi">
          <div className="h2">Sem resposta</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{kpis.late}</div>
          <div className="muted">+24h sem interação</div>
        </div>
      </div>

      <div className="card">
        <div className="h2">Atalhos</div>
        <div className="row">
          <a className="btn primary" href="/kanban">Abrir Kanban</a>
          <a className="btn" href="/leads">Gerenciar Leads</a>
          <a className="btn" href="/tasks">Tarefas</a>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="card">
      <h1 className="h1">Bem-vindo ao Maison Noor CRM</h1>
      <p className="muted">
        Este é o MVP do seu CRM para organizar leads, vendas e pós-venda.
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <Link className="btn primary" href="/dashboard">Ir para Dashboard</Link>
        <Link className="btn" href="/kanban">Abrir Kanban</Link>
        <Link className="btn" href="/leads">Ver Leads</Link>
      </div>
      <div className="muted" style={{ marginTop: 14, fontSize: 13 }}>
        Dica: configure o Firebase e crie seu usuário admin em <code>users/&lt;uid&gt;</code>.
      </div>
    </div>
  );
}

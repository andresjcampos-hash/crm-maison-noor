"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        padding: "40px",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 600,
          width: "100%",
          textAlign: "center",
          padding: 24,
        }}
      >
        <h1 className="h1" style={{ marginBottom: 12 }}>
          Bem-vindo ao Maison Noor CRM
        </h1>

        <p className="muted" style={{ opacity: 0.8 }}>
          Este é o MVP do seu CRM para organizar leads, vendas e pós-venda.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 18,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link className="btn primary" href="/crm/dashboard">
            Ir para Dashboard
          </Link>

          <Link className="btn" href="/crm/kanban">
            Abrir Kanban
          </Link>

          <Link className="btn" href="/crm/leads">
            Ver Leads
          </Link>

          <Link className="btn" href="/crm/pedidos">
            Ver Pedidos
          </Link>

          <Link className="btn" href="/crm/financeiro">
            Financeiro
          </Link>

          <Link className="btn" href="/crm/produtos">
            Produtos
          </Link>

          <Link className="btn" href="/crm/tarefas">
            Tarefas
          </Link>
        </div>

        <p className="muted" style={{ marginTop: 20, fontSize: 13 }}>
          Dica: configure o Firebase e crie seu usuário admin em{" "}
          <code>users/&lt;uid&gt;</code>.
        </p>
      </div>
    </main>
  );
}

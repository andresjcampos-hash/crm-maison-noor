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
          {/** 👉 Todos agora levam ao LOGIN */}
          <Link className="btn primary" href="/login">
            Ir para Dashboard
          </Link>

          <Link className="btn" href="/login">
            Abrir Kanban
          </Link>

          <Link className="btn" href="/login">
            Ver Leads
          </Link>

          <Link className="btn" href="/login">
            Ver Pedidos
          </Link>

          <Link className="btn" href="/login">
            Financeiro
          </Link>

          <Link className="btn" href="/login">
            Produtos
          </Link>

          <Link className="btn" href="/login">
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

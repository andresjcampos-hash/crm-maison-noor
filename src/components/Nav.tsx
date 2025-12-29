"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

type NavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 4h7v7H4V4zm9 0h7v5h-7V4zM4 13h7v7H4v-7zm9 7v-9h7v9h-7z"
      />
    </svg>
  );
}
function IconLeads() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"
      />
    </svg>
  );
}
function IconKanban() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 5h6v14H4V5Zm10 0h6v8h-6V5Zm0 10h6v4h-6v-4Z"
      />
    </svg>
  );
}
function IconPedidos() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 7V6a5 5 0 0 1 10 0v1h3v14H4V7h3Zm2 0h6V6a3 3 0 0 0-6 0v1Z"
      />
    </svg>
  );
}
function IconFinanceiro() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 4h14v2H5zm0 4h14v2H5zm0 4h8v2H5zm0 4h8v2H5zm10 0l2.5-2.5l1.4 1.4L16.4 19l2.5 2.5l-1.4 1.4L15 20.4l-2.5 2.5l-1.4-1.4L13.6 19l-2.5-2.5l1.4-1.4z"
      />
    </svg>
  );
}
function IconProdutos() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3h6v2h-1v2l2 2v12a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V9l2-2V5H9V3Zm2 7h2V8.8L12 8l-1 0.8V10Z"
      />
    </svg>
  );
}

const links: NavLink[] = [
  { href: "/crm/dashboard", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/crm/leads", label: "Leads", icon: <IconLeads /> },
  { href: "/crm/kanban", label: "Kanban", icon: <IconKanban /> },
  { href: "/crm/pedidos", label: "Pedidos", icon: <IconPedidos /> },
  { href: "/crm/financeiro", label: "Financeiro", icon: <IconFinanceiro /> },
  { href: "/crm/produtos", label: "Produtos", icon: <IconProdutos /> },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (!pathname) return false;
    if (href === "/crm/dashboard") return pathname === "/crm/dashboard";
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    try {
      await signOut(auth);
    } finally {
      router.replace("/login");
    }
  }

  return (
    <nav className="nav" aria-label="Menu do CRM">
      <div className="sectionTitle">Menu</div>

      <div className="list">
        {links.map((l) => {
          const active = isActive(l.href);

          return (
            <Link
              key={l.href}
              href={l.href}
              className={`item ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="rail" aria-hidden />
              <span className="icon" aria-hidden>
                {l.icon}
              </span>
              <span className="label">{l.label}</span>
              <span className="chev" aria-hidden>
                ›
              </span>
            </Link>
          );
        })}
      </div>

      {/* Botão de sair – compacto, estilo “link de menu” */}
      <button
        type="button"
        className="logoutButton"
        onClick={handleLogout}
      >
        Sair
      </button>

      <style jsx>{`
        .nav {
          display: grid;
          gap: 10px;
          align-content: start;
        }

        .sectionTitle {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.7;
          font-weight: 900;
          margin-top: 6px;
        }

        .list {
          display: grid;
          gap: 8px;
        }

        .item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 12px 12px 10px;
          border-radius: 14px;
          text-decoration: none;
          color: #f2f2f2;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.14);
          transition: transform 0.08s ease, border 0.12s ease, background 0.12s ease;
        }

        .item:hover {
          transform: translateY(-1px);
          border-color: rgba(200, 162, 106, 0.32);
          background: rgba(200, 162, 106, 0.08);
        }

        .item:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px rgba(200, 162, 106, 0.18);
          border-color: rgba(200, 162, 106, 0.45);
        }

        .rail {
          width: 3px;
          height: 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: rgba(200, 162, 106, 0.06);
          color: rgba(200, 162, 106, 0.95);
          flex-shrink: 0;
        }

        .label {
          flex: 1;
          font-weight: 900;
          letter-spacing: 0.01em;
          font-size: 16px;
        }

        .chev {
          opacity: 0.5;
          font-size: 18px;
          line-height: 1;
          transform: translateY(-1px);
        }

        .active {
          border-color: rgba(200, 162, 106, 0.55);
          background: rgba(200, 162, 106, 0.12);
          box-shadow: 0 0 0 3px rgba(200, 162, 106, 0.1);
        }
        .active .rail {
          background: rgba(200, 162, 106, 0.95);
        }
        .active .label {
          color: rgba(200, 162, 106, 0.98);
        }
        .active .icon {
          border-color: rgba(200, 162, 106, 0.35);
          background: rgba(200, 162, 106, 0.1);
          color: rgba(200, 162, 106, 0.98);
        }
        .active .chev {
          opacity: 0.85;
          color: rgba(200, 162, 106, 0.98);
        }

        /* --- Botão Sair compacto --- */
        .logoutButton {
          margin-top: 14px;
          align-self: flex-start;   /* não ocupa a largura toda */
          padding: 7px 18px;
          border-radius: 999px;
          border: 1px solid rgba(200, 162, 106, 0.4);
          background: rgba(200, 162, 106, 0.08);
          color: rgba(255, 220, 170, 0.98);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          text-align: center;
          transition:
            background 0.16s ease,
            border-color 0.16s ease,
            transform 0.1s ease,
            box-shadow 0.16s ease,
            opacity 0.12s ease;
        }

        .logoutButton:hover {
          background: rgba(200, 162, 106, 0.22);
          border-color: rgba(200, 162, 106, 0.8);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45);
          transform: translateY(-1px);
        }

        .logoutButton:active {
          transform: translateY(0);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
        }

        .logoutButton:disabled {
          opacity: 0.6;
          cursor: default;
          box-shadow: none;
        }

        /* Mobile: mantém menu em coluna, só aproxima o botão */
        @media (max-width: 900px) {
          .sectionTitle {
            font-size: 10px;
          }
          .icon {
            width: 30px;
            height: 30px;
          }
          .label {
            font-size: 15px;
          }
          .logoutButton {
            margin-top: 10px;
            padding: 6px 16px;
            font-size: 10px;
          }
        }
      `}</style>
    </nav>
  );
}

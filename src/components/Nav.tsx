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
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 4h7v7H4V4zm9 0h7v5h-7V4zM4 13h7v7H4v-7zm9 7v-9h7v9h-7z"
      />
    </svg>
  );
}
function IconLeads() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"
      />
    </svg>
  );
}
function IconKanban() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 5h6v14H4V5Zm10 0h6v8h-6V5Zm0 10h6v4h-6v-4Z"
      />
    </svg>
  );
}
function IconPedidos() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 7V6a5 5 0 0 1 10 0v1h3v14H4V7h3Zm2 0h6V6a3 3 0 0 0-6 0v1Z"
      />
    </svg>
  );
}
function IconFinanceiro() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 4h14v2H5zm0 4h14v2H5zm0 4h8v2H5zm0 4h8v2H5zm10 0l2.5-2.5l1.4 1.4L16.4 19l2.5 2.5l-1.4 1.4L15 20.4l-2.5 2.5l-1.4-1.4L13.6 19l-2.5-2.5l1.4-1.4z"
      />
    </svg>
  );
}
function IconProdutos() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
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
    <nav className="crmNavRoot" aria-label="Menu do CRM">
      <div className="crmNav">
        <div className="crmNavSectionTitle">Menu</div>

        <div className="crmNavList">
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`crmNavItem ${active ? "crmNavItemActive" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {/* linha em grid: ícone + label */}
                <div className="crmNavItemInner">
                  <span className="crmNavIcon" aria-hidden>
                    {l.icon}
                  </span>
                  <span className="crmNavLabel">{l.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          className="crmNavLogoutButton"
          onClick={handleLogout}
        >
          Sair
        </button>
      </div>

      <style jsx>{`
        .crmNavRoot {
          height: 100%;
          overflow-y: auto;
        }

        .crmNav {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .crmNavSectionTitle {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.7;
          font-weight: 900;
          margin-top: 6px;
        }

        .crmNavList {
          display: grid;
          gap: 6px;
        }

        .crmNavItem {
          border-radius: 999px;
          text-decoration: none;
          color: #f2f2f2;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.16);
          padding: 6px 10px;
          transition:
            transform 0.08s ease,
            border 0.12s ease,
            background 0.12s ease,
            box-shadow 0.12s ease;
        }

        .crmNavItemInner {
          display: grid !important;
          grid-template-columns: auto 1fr !important;
          align-items: center !important;
          column-gap: 10px !important;
        }

        .crmNavItem:hover {
          transform: translateY(-1px);
          border-color: rgba(200, 162, 106, 0.28);
          background: rgba(200, 162, 106, 0.08);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        }

        .crmNavItem:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px rgba(200, 162, 106, 0.18);
          border-color: rgba(200, 162, 106, 0.45);
        }

        .crmNavIcon {
          width: 26px;
          height: 26px;
          min-width: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(200, 162, 106, 0.24);
          background: rgba(200, 162, 106, 0.08);
          color: rgba(200, 162, 106, 0.95);
        }

        .crmNavLabel {
          font-weight: 600;
          letter-spacing: 0.01em;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .crmNavItemActive {
          border-color: rgba(200, 162, 106, 0.55);
          background: rgba(200, 162, 106, 0.12);
          box-shadow: 0 0 0 3px rgba(200, 162, 106, 0.1);
        }
        .crmNavItemActive .crmNavLabel {
          color: rgba(200, 162, 106, 0.98);
        }
        .crmNavItemActive .crmNavIcon {
          border-color: rgba(200, 162, 106, 0.45);
          background: rgba(200, 162, 106, 0.18);
          color: rgba(255, 240, 205, 0.98);
        }

        .crmNavLogoutButton {
          margin-top: 10px;
          align-self: stretch;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(200, 162, 106, 0.4);
          background: rgba(200, 162, 106, 0.12);
          color: rgba(255, 230, 190, 0.98);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
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

        .crmNavLogoutButton:hover {
          background: rgba(200, 162, 106, 0.24);
          border-color: rgba(200, 162, 106, 0.9);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.45);
          transform: translateY(-1px);
        }

        .crmNavLogoutButton:active {
          transform: translateY(0);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .crmNavLogoutButton:disabled {
          opacity: 0.6;
          cursor: default;
          box-shadow: none;
        }

        @media (max-width: 900px) {
          .crmNavList {
            gap: 8px;
          }
          .crmNavLabel {
            font-size: 13px;
          }
          .crmNavIcon {
            width: 24px;
            height: 24px;
            min-width: 24px;
          }
        }
      `}</style>
    </nav>
  );
}

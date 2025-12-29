"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/crm/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/crm/leads", label: "Leads", icon: "🧾" },
  { href: "/crm/kanban", label: "Kanban", icon: "📌" },
  { href: "/crm/pedidos", label: "Pedidos", icon: "🛒" },
  { href: "/crm/produtos", label: "Produtos", icon: "📦" },
  { href: "/crm/financeiro", label: "Financeiro", icon: "💸" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mn-mobile-nav">
      {navItems.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mn-mobile-nav-item ${active ? "active" : ""}`}
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

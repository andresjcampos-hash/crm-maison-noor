// app/crm/SidebarMenu.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarMenu() {
  const pathname = usePathname();

  const menu = [
    { label: "Dashboard", href: "/crm", icon: "🏠" },
    { label: "Leads", href: "/crm/leads", icon: "👤" },
    { label: "Kanban", href: "/crm/kanban", icon: "📊" },
    { label: "Pedidos", href: "/crm/pedidos", icon: "🛍️" },
    { label: "Financeiro", href: "/crm/financeiro", icon: "💰" },
    { label: "Produtos", href: "/crm/produtos", icon: "🧴" },
  ];

  return (
    <nav className="mt-6 flex flex-col gap-1">
      {menu.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/crm" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition
              ${
                active
                  ? "bg-amber-500/15 border border-amber-500/40 text-amber-300"
                  : "text-zinc-300 hover:bg-white/5 hover:text-amber-300 border border-transparent"
              }
            `}
          >
            {/* Ícone */}
            <span
              className={`
                h-7 w-7 flex items-center justify-center rounded-md text-sm
                ${
                  active
                    ? "bg-amber-500/20 border border-amber-500/60"
                    : "bg-black/40 border border-amber-500/20 text-amber-200"
                }
              `}
            >
              {item.icon}
            </span>

            {/* Texto */}
            <span className="text-[15px] font-medium tracking-wide">
              {item.label}
            </span>

            {/* Bolinha ativa à direita */}
            {active && (
              <span className="ml-auto h-2 w-2 rounded-full bg-amber-400" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

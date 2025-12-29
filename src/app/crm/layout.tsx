// src/app/crm/layout.tsx
"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Nav from "@/components/Nav";
import { AuthGuard } from "@/components/AuthGuard";

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="crmShell">
        <aside className="crmNav" aria-label="Navegação CRM">
          <div className="crmNavInner">
            <div className="brand">
              <div className="brandTop">
                <div className="brandLogoWrap">
                  <Image
                    src="/logo-maison-noor.png"
                    alt="Logo Maison Noor"
                    width={40}
                    height={40}
                    className="brandLogo"
                  />
                </div>

                <div className="brandText">
                  <div className="kicker">Maison Noor</div>
                  <div className="title">CRM</div>
                </div>
              </div>

              <div className="brandLine" aria-hidden />
              <div className="brandHint">
                Vendas • Leads • Estoque • Financeiro
              </div>
            </div>

            {/* Sidebar / Menu */}
            <Nav />

            <div className="navFooter">
              <div className="navFooterLine" aria-hidden />
              <div className="navFooterText">
                <span className="dot" aria-hidden />
                <span className="muted">Ambiente: Produção</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="crmMain">
          <div className="crmMainInner">{children}</div>
        </main>

        <style jsx>{`
          .crmShell {
            min-height: 100vh;
            display: grid;
            grid-template-columns: 300px minmax(0, 1fr);
            background:
              radial-gradient(
                1200px 600px at 20% -10%,
                rgba(200, 162, 106, 0.14),
                transparent 60%
              ),
              radial-gradient(
                900px 500px at 90% 10%,
                rgba(200, 162, 106, 0.1),
                transparent 55%
              ),
              rgba(8, 8, 12, 1);
            color: #f2f2f2;
            overflow-x: hidden;
          }

          /* Sidebar (Glass) */
          .crmNav {
            position: relative; /* deixa de ser sticky/fixo */
            height: 100%;
            border-right: 1px solid rgba(200, 162, 106, 0.16);
            background:
              radial-gradient(
                900px 380px at 20% 0%,
                rgba(200, 162, 106, 0.1),
                transparent 60%
              ),
              linear-gradient(
                180deg,
                rgba(255, 255, 255, 0.06),
                rgba(255, 255, 255, 0.02)
              );
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            overflow: hidden;
          }

          .crmNav::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: linear-gradient(
              90deg,
              rgba(200, 162, 106, 0.08),
              transparent 35%,
              transparent 65%,
              rgba(255, 255, 255, 0.02)
            );
          }

          .crmNavInner {
            position: relative;
            height: 100%;
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            align-items: stretch;
            /* ❌ sem overflow aqui – menu rola junto com a página */
          }

          .brand {
            padding: 14px;
            border-radius: 18px;
            border: 1px solid rgba(200, 162, 106, 0.18);
            background:
              radial-gradient(
                700px 220px at 10% 0%,
                rgba(200, 162, 106, 0.14),
                transparent 55%
              ),
              rgba(0, 0, 0, 0.2);
            box-shadow:
              0 10px 30px rgba(0, 0, 0, 0.35),
              inset 0 1px 0 rgba(255, 255, 255, 0.04);
          }

          .brandTop {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .brandLogoWrap {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            padding: 3px;
            background: radial-gradient(
              circle at 30% 0,
              rgba(255, 255, 255, 0.2),
              rgba(200, 162, 106, 0.06)
            );
            border: 1px solid rgba(200, 162, 106, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            overflow: hidden; /* garante círculo perfeito */
          }

          .brandLogo {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
            display: block;
          }

          .brandText {
            display: grid;
            gap: 4px;
          }

          .kicker {
            font-size: 11px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: rgba(200, 162, 106, 0.95);
            font-weight: 900;
          }

          .title {
            font-size: 20px;
            font-weight: 950;
            letter-spacing: 0.02em;
            line-height: 1.1;
            background: linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.98),
              rgba(200, 162, 106, 0.92)
            );
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }

          .brandLine {
            margin-top: 12px;
            height: 1px;
            background: linear-gradient(
              90deg,
              rgba(200, 162, 106, 0.35),
              rgba(255, 255, 255, 0.06),
              rgba(200, 162, 106, 0.2)
            );
            opacity: 0.8;
          }

          .brandHint {
            margin-top: 10px;
            font-size: 12px;
            opacity: 0.75;
            letter-spacing: 0.02em;
          }

          .navFooter {
            margin-top: auto;
            padding: 10px 6px 2px;
            display: grid;
            gap: 10px;
          }
          .navFooterLine {
            height: 1px;
            background: rgba(255, 255, 255, 0.06);
          }
          .navFooterText {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
          }
          .dot {
            width: 8px;
            height: 8px;
            border-radius: 999px;
            background: rgba(200, 162, 106, 0.75);
            box-shadow: 0 0 0 3px rgba(200, 162, 106, 0.12);
          }
          .muted {
            opacity: 0.7;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-size: 10px;
          }

          .crmMain {
            min-width: 0;
            display: block;
          }

          .crmMainInner {
            padding: 22px;
            max-width: 1120px;
            margin: 0 auto;
            box-sizing: border-box;
          }

          @media (max-width: 900px) {
            .crmShell {
              grid-template-columns: 1fr;
            }

            .crmNav {
              position: relative; /* não fica grudado, rola junto no mobile */
              height: auto;
              border-right: none;
              border-bottom: 1px solid rgba(200, 162, 106, 0.16);
              z-index: 20;
            }

            .crmNavInner {
              padding: 14px;
            }

            .brand {
              padding: 12px;
              border-radius: 16px;
            }

            .brandLogoWrap {
              width: 34px;
              height: 34px;
            }

            .crmMainInner {
              padding: 16px 12px 80px;
            }
          }
        `}</style>
      </div>
    </AuthGuard>
  );
}

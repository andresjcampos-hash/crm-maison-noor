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
            
            {/* ----------- LOGO + TÍTULO ----------- */}
            <div className="brand">
              <div className="brandTop">
                <div className="brandLogoWrap">
                  <Image
                    src="/logo-maison-noor.png"
                    alt="Logo Maison Noor"
                    width={38}
                    height={38}
                    className="brandLogo"
                  />
                </div>

                <div className="brandText">
                  <div className="kicker">Maison Noor</div>
                  <div className="title">CRM</div>
                </div>
              </div>

              <div className="brandLine" aria-hidden />
              <div className="brandHint">Vendas • Leads • Estoque • Financeiro</div>
            </div>


            {/* ----------- MENU PRINCIPAL ----------- */}
            <Nav />


            {/* ----------- RODAPÉ / STATUS DO SISTEMA ----------- */}
            <div className="navFooter">
              <div className="navFooterLine" aria-hidden />
              <div className="navFooterText">
                <span className="dot" aria-hidden />
                <span className="muted">Ambiente: Produção</span>
              </div>
            </div>
          </div>
        </aside>


        {/* ----------- CONTEÚDO PRINCIPAL ----------- */}
        <main className="crmMain">
          <div className="crmMainInner">{children}</div>
        </main>


        {/* ----------- ESTILOS ----------- */}
        <style jsx>{`
          .crmShell {
            min-height: 100vh;
            display: grid;
            grid-template-columns: 300px 1fr;
            background:
              radial-gradient(1200px 600px at 20% -10%, rgba(200,162,106,0.14), transparent 60%),
              radial-gradient(900px 500px at 90% 10%, rgba(200,162,106,0.1), transparent 55%),
              #08080c;
            color: #f2f2f2;
          }

          .crmNav {
            position: sticky;
            top: 0;
            height: 100vh;
            border-right: 1px solid rgba(200, 162, 106, 0.16);
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
            backdrop-filter: blur(10px);
          }

          .crmNavInner {
            height: 100%;
            padding: 18px;
            display: grid;
            gap: 14px;
            overflow-y: auto;
          }

          /* ----- LOGO REDONDA ----- */
          .brandTop {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .brandLogoWrap {
            width: 42px;
            height: 42px;
            border-radius: 999px;
            overflow: hidden;
            border: 1px solid rgba(200,162,106,0.55);
            background: radial-gradient(circle at 30% 0, rgba(255,255,255,0.2), rgba(200,162,106,0.06));
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .brandLogo {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 999px;
          }

          .brandText { display: grid; gap: 4px; }

          .kicker {
            font-size: 11px;
            text-transform: uppercase;
            color: rgba(200,162,106,0.95);
            font-weight: 900;
            letter-spacing: .14em;
          }

          .title {
            font-size: 20px;
            font-weight: 900;
            background: linear-gradient(180deg,#fff,rgba(200,162,106,0.92));
            -webkit-background-clip: text;
            color: transparent;
          }

          .brandLine {
            margin-top: 10px;
            height: 1px;
            background: linear-gradient(90deg, rgba(200,162,106,0.35), rgba(255,255,255,0.06), rgba(200,162,106,0.2));
          }

          .brandHint {
            font-size: 12px;
            opacity: .75;
            margin-top: 10px;
          }

          /* ----- RODAPÉ ----- */
          .navFooter {
            margin-top: auto;
            padding-top: 8px;
          }
          .navFooterText {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            opacity: .8;
          }
          .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(200, 162, 106, .75);
          }

          /* ----- CONTEÚDO ----- */
          .crmMainInner {
            padding: 22px;
            max-width: 1120px;
            margin: 0 auto;
          }

          /* ----- MOBILE ----- */
          @media (max-width: 900px) {
            .crmShell { grid-template-columns: 1fr; }
            .crmNav { height: auto; }
            .brandLogoWrap { width: 36px; height: 36px; }
            .crmMainInner { padding-bottom: 90px; }
          }
        `}</style>
      </div>
    </AuthGuard>
  );
}

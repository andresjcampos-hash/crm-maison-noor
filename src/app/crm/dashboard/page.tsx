"use client";

import { useEffect, useMemo, useState } from "react";

type Origem = "instagram" | "whatsapp" | "indicacao" | "site" | "outros";
type Status =
  | "novo"
  | "chamou_no_whatsapp"
  | "negociacao"
  | "pagou"
  | "enviado"
  | "finalizado"
  | "perdido";

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  origem: Origem;
  valorEstimado: number;
  perfumes: string[];
  status: Status;
  createdAt: string;
  updatedAt: string;
  observacoes?: string;
  historico?: any[];
};

type LeadQuente = Lead & { _score: number };

const STORAGE_KEY = "maison_noor_crm_leads_v1";

const STATUS_META: { v: Status; label: string }[] = [
  { v: "novo", label: "Novo" },
  { v: "chamou_no_whatsapp", label: "WhatsApp" },
  { v: "negociacao", label: "Negociação" },
  { v: "pagou", label: "Pagou" },
  { v: "enviado", label: "Enviado" },
  { v: "finalizado", label: "Finalizado" },
  { v: "perdido", label: "Perdido" },
];

const ORIGEM_LABEL: Record<Origem, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  indicacao: "Indicação",
  site: "Site",
  outros: "Outros",
};

const ORIGENS_VALIDAS = [
  "instagram",
  "whatsapp",
  "indicacao",
  "site",
  "outros",
] as const;

// type-guard para não cair em "any index"
function isOrigem(v: unknown): v is Origem {
  return ORIGENS_VALIDAS.includes(v as Origem);
}

function origemLabel(v: unknown) {
  return isOrigem(v) ? ORIGEM_LABEL[v] : ORIGEM_LABEL.outros;
}

function formatBRL(n: number) {
  return Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [msg, setMsg] = useState("");

  // filtros
  const [range, setRange] = useState<"hoje" | "7d" | "30d" | "tudo">("30d");
  const [origemFiltro, setOrigemFiltro] = useState<Origem | "todas">("todas");

  function loadFromStorage(): Lead[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Lead[]) : [];
    } catch {
      return [];
    }
  }

  useEffect(() => {
    setLeads(loadFromStorage());
  }, []);

  function refresh() {
    setLeads(loadFromStorage());
    setMsg("🔄 Atualizado!");
    window.setTimeout(() => setMsg(""), 1500);
  }

  function inRange(iso: string) {
    if (range === "tudo") return true;

    const d = new Date(iso);
    const now = new Date();

    if (range === "hoje") {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }

    const days = range === "7d" ? 7 : 30;
    const start = new Date();
    start.setDate(now.getDate() - days);
    return d >= start;
  }

  function openWhatsApp(telefone: string, nome?: string) {
    const digits = onlyDigits(telefone);
    const number =
      digits.length >= 12 && digits.startsWith("55")
        ? digits
        : digits.length >= 10
        ? `55${digits}`
        : digits;

    const text = nome ? `Olá ${nome}! Tudo bem?` : "Olá! Tudo bem?";
    const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  async function copyPhone(telefone: string) {
    const digits = onlyDigits(telefone);
    try {
      await navigator.clipboard.writeText(digits);
      setMsg("📋 Telefone copiado!");
      window.setTimeout(() => setMsg(""), 1500);
    } catch {
      setMsg("⚠️ Não consegui copiar. Copie manualmente.");
      window.setTimeout(() => setMsg(""), 1800);
    }
  }

  function goKanban(status?: Status) {
    const params = new URLSearchParams();
    if (origemFiltro !== "todas") params.set("origem", origemFiltro);
    if (status) params.set("status", status);
    params.set("range", range);
    window.location.href = `/crm/kanban?${params.toString()}`;
  }

  function goLead(id: string) {
    window.location.href = `/crm/leads?focus=${encodeURIComponent(id)}`;
  }

  const metrics = useMemo(() => {
    const totalLeadsRaw = leads.length;

    const filtered = leads.filter((l) => {
      const baseDate = l.updatedAt || l.createdAt;
      if (!inRange(baseDate)) return false;
      if (origemFiltro !== "todas" && l.origem !== origemFiltro) return false;
      return true;
    });

    const totalLeads = filtered.length;

    const totalEstimado = filtered.reduce(
      (acc, l) => acc + (Number(l.valorEstimado) || 0),
      0,
    );

    const byStatusCount: Record<Status, number> = {
      novo: 0,
      chamou_no_whatsapp: 0,
      negociacao: 0,
      pagou: 0,
      enviado: 0,
      finalizado: 0,
      perdido: 0,
    };

    const byStatusValue: Record<Status, number> = {
      novo: 0,
      chamou_no_whatsapp: 0,
      negociacao: 0,
      pagou: 0,
      enviado: 0,
      finalizado: 0,
      perdido: 0,
    };

    const byOrigemCount: Record<Origem, number> = {
      instagram: 0,
      whatsapp: 0,
      indicacao: 0,
      site: 0,
      outros: 0,
    };

    const perfumeCount = new Map<string, number>();

    for (const l of filtered) {
      byStatusCount[l.status] = (byStatusCount[l.status] || 0) + 1;
      byStatusValue[l.status] =
        (byStatusValue[l.status] || 0) + (Number(l.valorEstimado) || 0);
      byOrigemCount[l.origem] = (byOrigemCount[l.origem] || 0) + 1;

      for (const p of l.perfumes || []) {
        const key = String(p).trim();
        if (!key) continue;
        perfumeCount.set(key, (perfumeCount.get(key) || 0) + 1);
      }
    }

    const paidCount = byStatusCount.pagou;
    const finalizedCount = byStatusCount.finalizado;

    const conversaoPagou = totalLeads ? paidCount / totalLeads : 0;
    const conversaoFinalizado = totalLeads ? finalizedCount / totalLeads : 0;

    const ticketMedioEstimado = totalLeads ? totalEstimado / totalLeads : 0;
    const ticketMedioPagou = paidCount
      ? byStatusValue.pagou / paidCount
      : 0;

    const topPerfumes = [...perfumeCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([nome, qtd]) => ({ nome, qtd }));

    const maxStatusCount = Math.max(1, ...Object.values(byStatusCount));

    // Leads Quentes
    const now = Date.now();
    const score = (l: Lead) => {
      const baseDate = new Date(l.updatedAt || l.createdAt).getTime();
      const recencyDays = Math.max(
        0,
        (now - baseDate) / (1000 * 60 * 60 * 24),
      );
      const recencyScore = Math.max(0, 20 - recencyDays);

      const statusScore =
        l.status === "negociacao"
          ? 35
          : l.status === "chamou_no_whatsapp"
          ? 25
          : l.status === "novo"
          ? 18
          : l.status === "pagou" || l.status === "enviado"
          ? 6
          : l.status === "finalizado"
          ? 2
          : -10;

      const value = Number(l.valorEstimado) || 0;
      const valueScore = Math.min(40, value / 25);

      return statusScore + valueScore + recencyScore;
    };

    const leadsQuentes: LeadQuente[] = filtered
      .filter((l) => !["perdido", "finalizado"].includes(l.status))
      .slice()
      .sort((a, b) => score(b) - score(a))
      .slice(0, 10)
      .map((l) => ({ ...l, _score: score(l) }));

    return {
      totalLeads,
      totalLeadsRaw,
      totalEstimado,
      byStatusCount,
      byStatusValue,
      byOrigemCount,
      topPerfumes,
      paidCount,
      finalizedCount,
      conversaoPagou,
      conversaoFinalizado,
      ticketMedioEstimado,
      ticketMedioPagou,
      maxStatusCount,
      filtered,
      leadsQuentes,
    };
  }, [leads, range, origemFiltro]);

  return (
    <main className="page">
      <header className="head">
        <div>
          <div className="kicker">Maison Noor</div>
          <h1 className="title">CRM • Dashboard</h1>
          <p className="sub">
            Período + origem + funil + top perfumes + leads quentes.
          </p>
        </div>

        <div className="headRight">
          <div className="seg">
            <button
              className={`segBtn ${range === "hoje" ? "on" : ""}`}
              onClick={() => setRange("hoje")}
              type="button"
            >
              Hoje
            </button>
            <button
              className={`segBtn ${range === "7d" ? "on" : ""}`}
              onClick={() => setRange("7d")}
              type="button"
            >
              7 dias
            </button>
            <button
              className={`segBtn ${range === "30d" ? "on" : ""}`}
              onClick={() => setRange("30d")}
              type="button"
            >
              30 dias
            </button>
            <button
              className={`segBtn ${range === "tudo" ? "on" : ""}`}
              onClick={() => setRange("tudo")}
              type="button"
            >
              Tudo
            </button>
          </div>

          <div className="filterBox">
            <label>Origem</label>
            <select
              value={origemFiltro}
              onChange={(e) => {
                const v = e.target.value;
                setOrigemFiltro(v === "todas" ? "todas" : (v as Origem));
              }}
              className="selectSmall"
            >
              <option value="todas">Todas</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="indicacao">Indicação</option>
              <option value="site">Site</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <button className="btn" onClick={refresh} type="button">
            Atualizar
          </button>
        </div>
      </header>

      {msg ? <div className="toast">{msg}</div> : null}

      <section className="stats">
        <div className="stat">
          <div className="statLabel">Leads no período</div>
          <div className="statValue">{metrics.totalLeads}</div>
          <div className="statHint">
            Total geral: {metrics.totalLeadsRaw}
          </div>
        </div>

        <div className="stat">
          <div className="statLabel">Valor estimado (período)</div>
          <div className="statValue">
            {metrics.totalLeads
              ? formatBRL(metrics.totalEstimado)
              : "—"}
          </div>
        </div>

        <div className="stat">
          <div className="statLabel">Ticket médio (estimado)</div>
          <div className="statValue">
            {metrics.totalLeads
              ? formatBRL(metrics.ticketMedioEstimado)
              : "—"}
          </div>
        </div>

        <div className="stat">
          <div className="statLabel">Conversão para “Pagou”</div>
          <div className="statValue">
            {(metrics.conversaoPagou * 100).toFixed(0)}%
          </div>
          <div className="statHint">
            {metrics.paidCount} de {metrics.totalLeads}
          </div>
        </div>

        <div className="stat">
          <div className="statLabel">Ticket médio (Pagou)</div>
          <div className="statValue">
            {metrics.paidCount
              ? formatBRL(metrics.ticketMedioPagou)
              : "—"}
          </div>
        </div>
      </section>

      <section className="grid">
        {/* 🔥 Leads quentes */}
        <div className="card wide">
          <div className="cardTitle">
            🔥 Leads quentes (prioridade)
          </div>
          <div className="hint">
            Ações rápidas: WhatsApp, copiar telefone, abrir lead, ver no
            Kanban.
          </div>

          <div className="hotTopActions">
            <button
              className="btn"
              onClick={() => goKanban()}
              type="button"
            >
              Ver no Kanban (com filtro)
            </button>
          </div>

          <div className="hotGrid">
            {metrics.leadsQuentes.length ? (
              metrics.leadsQuentes.map((l) => (
                <div key={l.id} className="hotItem">
                  <div className="hotTop">
                    <div>
                      <div className="hotName">{l.nome}</div>
                      <div className="hotMeta">
                        {origemLabel(l.origem)} •{" "}
                        <span className="chip">
                          {
                            STATUS_META.find(
                              (s) => s.v === l.status,
                            )?.label || l.status
                          }
                        </span>
                      </div>
                    </div>

                    <div className="hotValue">
                      {formatBRL(Number(l.valorEstimado || 0))}
                    </div>
                  </div>

                  <div className="hotPerf">
                    {(l.perfumes || [])
                      .slice(0, 4)
                      .map((p: string) => (
                        <span className="chip" key={p}>
                          {p}
                        </span>
                      ))}
                    {(l.perfumes || []).length > 4 ? (
                      <span className="more">
                        +{(l.perfumes || []).length - 4}
                      </span>
                    ) : null}
                  </div>

                  {l.observacoes ? (
                    <div className="obsMini">
                      📝 {String(l.observacoes).slice(0, 90)}…
                    </div>
                  ) : null}

                  <div className="hotActions">
                    <button
                      className="btnPrimarySmall"
                      onClick={() =>
                        openWhatsApp(l.telefone, l.nome)
                      }
                      type="button"
                    >
                      Abrir WhatsApp
                    </button>
                    <button
                      className="btn"
                      onClick={() => copyPhone(l.telefone)}
                      type="button"
                    >
                      Copiar telefone
                    </button>
                    <button
                      className="btn"
                      onClick={() => goLead(l.id)}
                      type="button"
                    >
                      Abrir Lead
                    </button>

                    <div className="score">
                      Prioridade:{" "}
                      <strong>{Math.round(l._score)}</strong>
                    </div>
                  </div>

                  <div className="hotFoot">
                    Atualizado:{" "}
                    {new Date(
                      l.updatedAt || l.createdAt,
                    ).toLocaleString("pt-BR")}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">
                Nenhum lead quente no filtro atual.
              </div>
            )}
          </div>
        </div>

        {/* Funil */}
        <div className="card">
          <div className="cardTitle">Funil por status</div>

          <div className="funnel">
            {STATUS_META.map((s) => {
              const count = metrics.byStatusCount[s.v] || 0;
              const value = metrics.byStatusValue[s.v] || 0;
              const w = Math.round(
                (count / metrics.maxStatusCount) * 100,
              );

              return (
                <button
                  key={s.v}
                  className="fRowBtn"
                  onClick={() => goKanban(s.v)}
                  type="button"
                  title="Abrir Kanban neste status"
                >
                  <div className="fRow">
                    <div className="fLeft">
                      <div className="fLabel">{s.label}</div>
                      <div className="fMeta">
                        <span className="pill">{count}</span>
                        <span className="fValue">
                          {count ? formatBRL(value) : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="barWrap">
                      <div
                        className="bar"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="hint">
            Clique em um status para abrir o Kanban filtrado. Filtro:{" "}
            <strong>{range.toUpperCase()}</strong> •{" "}
            <strong>
              {origemFiltro === "todas"
                ? "Todas origens"
                : ORIGEM_LABEL[origemFiltro]}
            </strong>
          </div>
        </div>

        {/* Origens */}
        <div className="card">
          <div className="cardTitle">Origens (no filtro)</div>

          <div className="origens">
            {(Object.keys(metrics.byOrigemCount) as Origem[]).map(
              (o) => {
                const c = metrics.byOrigemCount[o] || 0;
                const pct = metrics.totalLeads
                  ? (c / metrics.totalLeads) * 100
                  : 0;
                return (
                  <div key={o} className="origemItem">
                    <div className="origemTop">
                      <div className="origemName">
                        {ORIGEM_LABEL[o]}
                      </div>
                      <div className="origemCount">{c}</div>
                    </div>
                    <div className="origemBarWrap">
                      <div
                        className="origemBar"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="origemPct">
                      {pct.toFixed(0)}%
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>

        {/* Top perfumes */}
        <div className="card wide">
          <div className="cardTitle">Perfumes mais pedidos</div>

          <div className="tops">
            {metrics.topPerfumes.length ? (
              metrics.topPerfumes.map((p) => (
                <div key={p.nome} className="topItem">
                  <div className="topName">{p.nome}</div>
                  <div className="topPill">{p.qtd}</div>
                </div>
              ))
            ) : (
              <div className="empty">
                Ainda sem dados de perfumes.
              </div>
            )}
          </div>

          <div className="hint">
            Top 8 perfumes dentro dos filtros selecionados.
          </div>
        </div>

        {/* Últimos leads */}
        <div className="card wide">
          <div className="cardTitle">Últimos leads</div>

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Origem</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th>Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {metrics.filtered
                  .slice()
                  .sort((a, b) =>
                    (b.updatedAt || "").localeCompare(
                      a.updatedAt || "",
                    ),
                  )
                  .slice(0, 8)
                  .map((l) => (
                    <tr key={l.id}>
                      <td>
                        <div className="name">{l.nome}</div>
                        <div className="meta mono">
                          {l.telefone}
                        </div>
                      </td>
                      <td>{origemLabel(l.origem)}</td>
                      <td>
                        <span className="chip">
                          {
                            STATUS_META.find(
                              (s) => s.v === l.status,
                            )?.label || l.status
                          }
                        </span>
                      </td>
                      <td className="mono">
                        {formatBRL(
                          Number(l.valorEstimado || 0),
                        )}
                      </td>
                      <td className="meta">
                        {new Date(
                          l.updatedAt || l.createdAt,
                        ).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}

                {!metrics.filtered.length ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      Nenhum lead nesse filtro. Troque o
                      período/origem ou use “Tudo”.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <style jsx>{`
        .page {
          padding: 24px;
        }
        .kicker {
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(200, 162, 106, 0.95);
          font-weight: 800;
        }
        .title {
          margin: 6px 0 0;
          font-size: 28px;
          letter-spacing: 0.01em;
        }
        .sub {
          margin: 8px 0 0;
          opacity: 0.75;
        }
        .head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          align-items: flex-end;
          padding: 16px;
          border-radius: 18px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.03),
            rgba(255, 255, 255, 0.01)
          );
        }
        .headRight {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .btn {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.25);
          background: rgba(200, 162, 106, 0.08);
          cursor: pointer;
          font-weight: 800;
          color: #f2f2f2;
        }
        .btnPrimarySmall {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.4);
          background: linear-gradient(
            180deg,
            rgba(200, 162, 106, 0.18),
            rgba(200, 162, 106, 0.08)
          );
          cursor: pointer;
          font-weight: 900;
          color: #f2f2f2;
        }

        .seg {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding: 8px;
          border-radius: 16px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: rgba(0, 0, 0, 0.14);
        }
        .segBtn {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #f2f2f2;
          cursor: pointer;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.04em;
        }
        .segBtn.on {
          border-color: rgba(200, 162, 106, 0.55);
          background: rgba(200, 162, 106, 0.14);
          color: rgba(200, 162, 106, 0.98);
        }

        .filterBox {
          display: grid;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 16px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: rgba(0, 0, 0, 0.14);
        }
        .filterBox label {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.75;
          font-weight: 900;
        }
        .selectSmall {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(15, 15, 22, 0.9);
          color: #f2f2f2;
          outline: none;
        }

        .toast {
          margin-top: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.08);
          font-weight: 700;
          max-width: 820px;
        }

        .stats {
          margin-top: 16px;
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
        @media (min-width: 720px) {
          .stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (min-width: 1100px) {
          .stats {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
        }
        .stat {
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(200, 162, 106, 0.16);
          background: rgba(200, 162, 106, 0.06);
        }
        .statLabel {
          font-size: 12px;
          opacity: 0.8;
        }
        .statValue {
          margin-top: 8px;
          font-size: 18px;
          font-weight: 900;
        }
        .statHint {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.75;
        }

        .grid {
          margin-top: 14px;
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1100px) {
          .grid {
            grid-template-columns: 1.2fr 0.8fr;
            align-items: start;
          }
        }

        .card {
          border-radius: 18px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.03),
            rgba(255, 255, 255, 0.01)
          );
          padding: 14px;
        }
        .wide {
          grid-column: 1 / -1;
        }
        .cardTitle {
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.85;
          margin-bottom: 12px;
          font-weight: 800;
        }
        .hint {
          margin-top: 12px;
          font-size: 12px;
          opacity: 0.75;
        }

        .hotTopActions {
          margin-top: 10px;
          display: flex;
          justify-content: flex-end;
        }

        .hotGrid {
          margin-top: 12px;
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
        @media (min-width: 900px) {
          .hotGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1200px) {
          .hotGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        .hotItem {
          border-radius: 18px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: rgba(0, 0, 0, 0.16);
          padding: 12px;
        }
        .hotTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }
        .hotName {
          font-weight: 900;
          font-size: 16px;
        }
        .hotMeta {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.8;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .hotValue {
          font-weight: 900;
          color: rgba(200, 162, 106, 0.95);
          white-space: nowrap;
        }
        .hotPerf {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        .more {
          font-size: 12px;
          opacity: 0.75;
        }
        .obsMini {
          margin-top: 10px;
          font-size: 12px;
          opacity: 0.86;
          border-left: 3px solid rgba(200, 162, 106, 0.55);
          padding-left: 10px;
        }
        .hotActions {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .score {
          font-size: 12px;
          opacity: 0.8;
          margin-left: auto;
        }
        .hotFoot {
          margin-top: 10px;
          font-size: 12px;
          opacity: 0.7;
        }

        .funnel {
          display: grid;
          gap: 10px;
        }
        .fRowBtn {
          border: none;
          background: transparent;
          padding: 0;
          text-align: left;
          cursor: pointer;
        }
        .fRowBtn:hover .barWrap {
          border-color: rgba(200, 162, 106, 0.35);
        }
        .fRow {
          display: grid;
          gap: 10px;
          grid-template-columns: 260px 1fr;
          align-items: center;
        }
        @media (max-width: 900px) {
          .fRow {
            grid-template-columns: 1fr;
          }
        }
        .fLeft {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }
        .fLabel {
          font-weight: 900;
          color: rgba(200, 162, 106, 0.95);
        }
        .fMeta {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .pill {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.08);
          font-size: 12px;
          font-weight: 900;
        }
        .fValue {
          font-size: 12px;
          opacity: 0.85;
        }
        .barWrap {
          height: 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }
        .bar {
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(200, 162, 106, 0.75),
            rgba(200, 162, 106, 0.15)
          );
          border-radius: 999px;
        }

        .origens {
          display: grid;
          gap: 10px;
        }
        .origemItem {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.14);
          padding: 10px;
        }
        .origemTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }
        .origemName {
          font-weight: 900;
        }
        .origemCount {
          font-weight: 900;
          color: rgba(200, 162, 106, 0.95);
        }
        .origemBarWrap {
          margin-top: 10px;
          height: 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.22);
          overflow: hidden;
        }
        .origemBar {
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(200, 162, 106, 0.7),
            rgba(200, 162, 106, 0.12)
          );
        }
        .origemPct {
          margin-top: 8px;
          font-size: 12px;
          opacity: 0.75;
        }

        .tops {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
        @media (min-width: 720px) {
          .tops {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1100px) {
          .tops {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
        .topItem {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.14);
          padding: 10px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }
        .topName {
          font-weight: 800;
        }
        .topPill {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.08);
          font-weight: 900;
        }

        .tableWrap {
          overflow-x: auto;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.14);
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          min-width: 860px;
        }
        th,
        td {
          padding: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          vertical-align: top;
        }
        th {
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .name {
          font-weight: 900;
        }
        .meta {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.7;
        }
        .chip {
          font-size: 11px;
          padding: 4px 9px;
          border-radius: 999px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.06);
          white-space: nowrap;
        }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
        }
        .empty {
          padding: 16px;
          opacity: 0.7;
          text-align: center;
        }
      `}</style>
    </main>
  );
}

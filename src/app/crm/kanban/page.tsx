"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Origem = "instagram" | "whatsapp" | "indicacao" | "site" | "outros";
type Status =
  | "novo"
  | "chamou_no_whatsapp"
  | "negociacao"
  | "pagou"
  | "enviado"
  | "finalizado"
  | "perdido";

type LeadHistory =
  | { at: string; type: "status_change"; from: Status; to: Status }
  | { at: string; type: "edit"; fields: string[] };

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
  historico?: LeadHistory[];
};

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

function formatBRL(n: number) {
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}
function nowISO() {
  return new Date().toISOString();
}
function readStorage(): Lead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Lead[]) : [];
  } catch {
    return [];
  }
}
function writeStorage(leads: Lead[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

/**
 * Wrapper com Suspense – isso resolve o erro:
 * "useSearchParams() should be wrapped in a suspense boundary"
 */
export default function KanbanPage() {
  return (
    <Suspense
      fallback={
        <main className="page">
          <header className="head">
            <div>
              <div className="kicker">Maison Noor</div>
              <h1 className="title">CRM • Kanban</h1>
              <p className="sub">Carregando quadro de leads...</p>
            </div>
          </header>
        </main>
      }
    >
      <KanbanView />
    </Suspense>
  );
}

/**
 * Todo o seu Kanban original fica aqui dentro
 * (agora seguro dentro do Suspense)
 */
function KanbanView() {
  const router = useRouter();
  const sp = useSearchParams();
  const spStr = sp.toString(); // dependência estável p/ ler filtros

  const toastTimerRef = useRef<number | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [toast, setToast] = useState("");

  // filtros
  const [range, setRange] = useState<"hoje" | "7d" | "30d" | "tudo">("30d");
  const [origemFiltro, setOrigemFiltro] = useState<Origem | "todas">("todas");
  const [statusFiltro, setStatusFiltro] = useState<Status | "todos">("todos");

  // DnD
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null);

  // Modal
  const [openId, setOpenId] = useState<string | null>(null);
  const openLead = useMemo(() => leads.find((l) => l.id === openId) || null, [openId, leads]);

  // campos do modal
  const [mNome, setMNome] = useState("");
  const [mTelefone, setMTelefone] = useState("");
  const [mOrigem, setMOrigem] = useState<Origem>("instagram");
  const [mStatus, setMStatus] = useState<Status>("novo");
  const [mValor, setMValor] = useState<string>("0");
  const [mObs, setMObs] = useState<string>("");
  const [mPerfumes, setMPerfumes] = useState<string[]>([]);
  const [perfInput, setPerfInput] = useState("");

  // ===== helpers URL (filtros)
  function setQuery(next: { range?: string; origem?: string; status?: string }) {
    const params = new URLSearchParams(sp.toString());
    if (next.range) params.set("range", next.range);
    if (next.origem) params.set("origem", next.origem);
    if (next.status) params.set("status", next.status);
    router.replace(`/crm/kanban?${params.toString()}`);
  }
  function setRangeAndUrl(r: "hoje" | "7d" | "30d" | "tudo") {
    setRange(r);
    setQuery({ range: r });
  }
  function setOrigemAndUrl(o: Origem | "todas") {
    setOrigemFiltro(o);
    setQuery({ origem: o });
  }
  function setStatusAndUrl(s: Status | "todos") {
    setStatusFiltro(s);
    setQuery({ status: s });
  }

  useEffect(() => {
    setLeads(readStorage());
  }, []);

  // lê filtros via URL (dependência estável)
  useEffect(() => {
    const origem = sp.get("origem");
    const status = sp.get("status");
    const r = sp.get("range");

    if (r === "hoje" || r === "7d" || r === "30d" || r === "tudo") setRange(r);

    if (
      origem === "instagram" ||
      origem === "whatsapp" ||
      origem === "indicacao" ||
      origem === "site" ||
      origem === "outros"
    ) {
      setOrigemFiltro(origem);
    } else {
      setOrigemFiltro("todas");
    }

    if (
      status === "novo" ||
      status === "chamou_no_whatsapp" ||
      status === "negociacao" ||
      status === "pagou" ||
      status === "enviado" ||
      status === "finalizado" ||
      status === "perdido"
    ) {
      setStatusFiltro(status);
    } else {
      setStatusFiltro("todos");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spStr]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 1600);
  }

  function refresh() {
    setLeads(readStorage());
    showToast("🔄 Atualizado!");
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
      showToast("📋 Telefone copiado!");
    } catch {
      showToast("⚠️ Não consegui copiar.");
    }
  }

  function goLead(id: string) {
    router.push(`/crm/leads?focus=${encodeURIComponent(id)}`);
  }

  function moveLeadToStatus(id: string, nextStatus: Status) {
    setLeads((prev) => {
      const next = prev.map((l) => {
        if (l.id !== id) return l;
        const oldStatus = l.status;

        const updated: Lead = {
          ...l,
          status: nextStatus,
          updatedAt: nowISO(),
          historico: [
            ...(l.historico || []),
            { at: nowISO(), type: "status_change", from: oldStatus, to: nextStatus },
          ],
        };
        return updated;
      });

      writeStorage(next);
      return next;
    });

    showToast("✅ Status atualizado!");
  }

  // DnD
  function onDragStart(id: string) {
    setDraggingId(id);
  }
  function onDragEnd() {
    setDraggingId(null);
    setDragOverStatus(null);
  }
  function onDropStatus(s: Status) {
    if (!draggingId) return;
    moveLeadToStatus(draggingId, s);
    setDraggingId(null);
    setDragOverStatus(null);
  }

  // Modal
  function openModal(id: string) {
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    setOpenId(id);

    setMNome(l.nome || "");
    setMTelefone(l.telefone || "");
    setMOrigem(l.origem || "instagram");
    setMStatus(l.status || "novo");
    setMValor(String(Number(l.valorEstimado || 0)));
    setMObs(l.observacoes || "");
    setMPerfumes(Array.isArray(l.perfumes) ? l.perfumes : []);
    setPerfInput("");
  }

  function closeModal() {
    setOpenId(null);
    setPerfInput("");
  }

  function addPerfume() {
    const p = perfInput.trim();
    if (!p) return;
    if (mPerfumes.some((x) => x.toLowerCase() === p.toLowerCase())) {
      setPerfInput("");
      return;
    }
    setMPerfumes((prev) => [...prev, p]);
    setPerfInput("");
  }

  function removePerfume(p: string) {
    setMPerfumes((prev) => prev.filter((x) => x !== p));
  }

  function saveModal() {
    if (!openId) return;

    const val = Number(String(mValor).replace(",", "."));
    const safeValor = Number.isFinite(val) ? val : 0;

    setLeads((prev) => {
      const next = prev.map((l) => {
        if (l.id !== openId) return l;

        const updated: Lead = {
          ...l,
          nome: mNome.trim() || l.nome,
          telefone: mTelefone.trim() || l.telefone,
          origem: mOrigem,
          status: mStatus,
          valorEstimado: safeValor,
          perfumes: mPerfumes,
          observacoes: mObs,
          updatedAt: nowISO(),
          historico: [
            ...(l.historico || []),
            {
              at: nowISO(),
              type: "edit",
              fields: ["nome", "telefone", "origem", "status", "valorEstimado", "perfumes", "observacoes"],
            },
          ],
        };
        return updated;
      });

      writeStorage(next);
      return next;
    });

    showToast("✅ Lead atualizado!");
    closeModal();
  }

  function deleteLead() {
    if (!openId) return;
    const ok = window.confirm("Excluir este lead? (não dá para desfazer)");
    if (!ok) return;

    setLeads((prev) => {
      const next = prev.filter((l) => l.id !== openId);
      writeStorage(next);
      return next;
    });

    showToast("🗑️ Lead excluído!");
    closeModal();
  }

  // ESC fecha modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const baseDate = l.updatedAt || l.createdAt;
      if (!inRange(baseDate)) return false;
      if (origemFiltro !== "todas" && l.origem !== origemFiltro) return false;
      if (statusFiltro !== "todos" && l.status !== statusFiltro) return false;
      return true;
    });
  }, [leads, range, origemFiltro, statusFiltro]);

  const grouped = useMemo(() => {
    const map: Record<Status, Lead[]> = {
      novo: [],
      chamou_no_whatsapp: [],
      negociacao: [],
      pagou: [],
      enviado: [],
      finalizado: [],
      perdido: [],
    };

    for (const l of filteredLeads) map[l.status].push(l);

    for (const k of Object.keys(map) as Status[]) {
      map[k] = map[k]
        .slice()
        .sort((a, b) => {
          const da = a.updatedAt || a.createdAt;
          const db = b.updatedAt || b.createdAt;
          return db.localeCompare(da);
        });
    }
    return map;
  }, [filteredLeads]);

  const totals = useMemo(() => {
    const total = filteredLeads.length;
    const totalValue = filteredLeads.reduce((acc, l) => acc + (Number(l.valorEstimado) || 0), 0);
    return { total, totalValue };
  }, [filteredLeads]);

  return (
    <main className="page">
      <header className="head">
        <div>
          <div className="kicker">Maison Noor</div>
          <h1 className="title">CRM • Kanban</h1>
          <p className="sub">Clique em um card para editar rápido. Arraste para mudar status.</p>
        </div>

        <div className="headRight">
          <div className="seg">
            <button
              className={`segBtn ${range === "hoje" ? "on" : ""}`}
              onClick={() => setRangeAndUrl("hoje")}
              type="button"
            >
              Hoje
            </button>
            <button
              className={`segBtn ${range === "7d" ? "on" : ""}`}
              onClick={() => setRangeAndUrl("7d")}
              type="button"
            >
              7 dias
            </button>
            <button
              className={`segBtn ${range === "30d" ? "on" : ""}`}
              onClick={() => setRangeAndUrl("30d")}
              type="button"
            >
              30 dias
            </button>
            <button
              className={`segBtn ${range === "tudo" ? "on" : ""}`}
              onClick={() => setRangeAndUrl("tudo")}
              type="button"
            >
              Tudo
            </button>
          </div>

          <div className="filterBox">
            <label>Origem</label>
            <select
              value={origemFiltro}
              onChange={(e) => setOrigemAndUrl(e.target.value as any)}
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

          <div className="filterBox">
            <label>Status</label>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusAndUrl(e.target.value as any)}
              className="selectSmall"
            >
              <option value="todos">Todos</option>
              {STATUS_META.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <button className="btn" onClick={refresh} type="button">
            Atualizar
          </button>
        </div>
      </header>

      {toast ? <div className="toast">{toast}</div> : null}

      <section className="summary">
        <div className="sumCard">
          <div className="sumLabel">Leads no filtro</div>
          <div className="sumValue">{totals.total}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Valor estimado</div>
          <div className="sumValue">{totals.total ? formatBRL(totals.totalValue) : "—"}</div>
        </div>
        <div className="sumHint">Clique no card para abrir o modal. ESC fecha.</div>
      </section>

      <section className="board">
        {STATUS_META.map((s) => {
          const items = grouped[s.v] || [];
          const isOver = dragOverStatus === s.v;

          return (
            <div
              key={s.v}
              className={`col ${isOver ? "over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(s.v);
              }}
              onDragLeave={() => setDragOverStatus((cur) => (cur === s.v ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                onDropStatus(s.v);
              }}
            >
              <div className="colHead">
                <div className="colTitle">{s.label}</div>
                <div className="colCount">{items.length}</div>
              </div>

              <div className="cards">
                {items.map((l) => (
                  <div
                    key={l.id}
                    className={`card ${draggingId === l.id ? "dragging" : ""}`}
                    draggable
                    onDragStart={() => onDragStart(l.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => openModal(l.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openModal(l.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="cardTop">
                      <div className="name">{l.nome}</div>
                      <div className="value">{formatBRL(Number(l.valorEstimado || 0))}</div>
                    </div>

                    <div className="metaRow">
                      <span className="chip">{ORIGEM_LABEL[l.origem]}</span>
                      <span className="meta">{l.telefone}</span>
                    </div>

                    {l.perfumes?.length ? (
                      <div className="perfRow">
                        {l.perfumes.slice(0, 3).map((p) => (
                          <span key={p} className="pill">
                            {p}
                          </span>
                        ))}
                        {l.perfumes.length > 3 ? <span className="more">+{l.perfumes.length - 3}</span> : null}
                      </div>
                    ) : null}

                    {l.observacoes ? <div className="obs">📝 {String(l.observacoes).slice(0, 80)}…</div> : null}

                    <div className="foot">
                      Atualizado: {new Date(l.updatedAt || l.createdAt).toLocaleString("pt-BR")}
                    </div>
                  </div>
                ))}

                {!items.length ? <div className="emptyCol">Sem leads</div> : null}
              </div>
            </div>
          );
        })}
      </section>

      {/* MODAL */}
      {openLead ? (
        <div className="modalOverlay" onMouseDown={closeModal} role="presentation">
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div>
                <div className="modalKicker">Editar lead</div>
                <div className="modalTitle">{openLead.nome}</div>
                <div className="modalSub">
                  ID: <span className="mono">{openLead.id}</span>
                </div>
              </div>

              <button className="btnX" onClick={closeModal} type="button" aria-label="Fechar">
                ✕
              </button>
            </div>

            <div className="modalGrid">
              <div className="field">
                <label>Nome</label>
                <input className="input" value={mNome} onChange={(e) => setMNome(e.target.value)} />
              </div>

              <div className="field">
                <label>Telefone</label>
                <input className="input" value={mTelefone} onChange={(e) => setMTelefone(e.target.value)} />
              </div>

              <div className="field">
                <label>Origem</label>
                <select className="input" value={mOrigem} onChange={(e) => setMOrigem(e.target.value as Origem)}>
                  <option value="instagram">Instagram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="indicacao">Indicação</option>
                  <option value="site">Site</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div className="field">
                <label>Status</label>
                <select className="input" value={mStatus} onChange={(e) => setMStatus(e.target.value as Status)}>
                  {STATUS_META.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Valor estimado (R$)</label>
                <input className="input" value={mValor} onChange={(e) => setMValor(e.target.value)} />
              </div>

              <div className="field wide">
                <label>Perfumes</label>
                <div className="perfEdit">
                  <input
                    className="input"
                    placeholder="Digite e pressione Enter"
                    value={perfInput}
                    onChange={(e) => setPerfInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPerfume();
                      }
                    }}
                  />
                  <button className="btnSmall" onClick={addPerfume} type="button">
                    Adicionar
                  </button>
                </div>

                <div className="perfTags">
                  {mPerfumes.length ? (
                    mPerfumes.map((p) => (
                      <button key={p} className="tag" onClick={() => removePerfume(p)} type="button" title="Remover">
                        {p} <span className="tagX">✕</span>
                      </button>
                    ))
                  ) : (
                    <div className="emptySmall">Sem perfumes</div>
                  )}
                </div>
              </div>

              <div className="field wide">
                <label>Observações</label>
                <textarea className="textarea" value={mObs} onChange={(e) => setMObs(e.target.value)} />
              </div>
            </div>

            <div className="modalActions">
              <button className="btnSmallPrimary" onClick={saveModal} type="button">
                Salvar
              </button>
              <button className="btnSmall" onClick={() => openWhatsApp(mTelefone, mNome)} type="button">
                WhatsApp
              </button>
              <button className="btnSmall" onClick={() => copyPhone(mTelefone)} type="button">
                Copiar
              </button>
              <button className="btnSmall" onClick={() => goLead(openLead.id)} type="button">
                Abrir Lead
              </button>

              <div className="spacer" />

              <button className="btnDanger" onClick={deleteLead} type="button">
                Excluir
              </button>
            </div>

            <div className="modalFoot">
              Criado: {new Date(openLead.createdAt).toLocaleString("pt-BR")} • Atualizado:{" "}
              {new Date(openLead.updatedAt).toLocaleString("pt-BR")}
            </div>
          </div>
        </div>
      ) : null}

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
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
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

        .summary {
          margin-top: 14px;
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          align-items: start;
        }
        @media (min-width: 720px) {
          .summary {
            grid-template-columns: repeat(2, minmax(0, 1fr)) 1fr;
          }
        }
        .sumCard {
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(200, 162, 106, 0.16);
          background: rgba(200, 162, 106, 0.06);
        }
        .sumLabel {
          font-size: 12px;
          opacity: 0.8;
        }
        .sumValue {
          margin-top: 8px;
          font-size: 18px;
          font-weight: 900;
        }
        .sumHint {
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px dashed rgba(200, 162, 106, 0.22);
          background: rgba(0, 0, 0, 0.12);
          font-size: 12px;
          opacity: 0.8;
        }

        .board {
          margin-top: 14px;
          display: grid;
          gap: 12px;
          grid-auto-flow: column;
          grid-auto-columns: minmax(280px, 1fr);
          overflow-x: auto;
          padding-bottom: 10px;
        }

        .col {
          border-radius: 18px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: rgba(0, 0, 0, 0.14);
          padding: 12px;
          min-height: 520px;
        }
        .col.over {
          border-color: rgba(200, 162, 106, 0.45);
          box-shadow: 0 0 0 3px rgba(200, 162, 106, 0.12);
        }
        .colHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 10px;
        }
        .colTitle {
          font-weight: 900;
          color: rgba(200, 162, 106, 0.95);
        }
        .colCount {
          font-weight: 900;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.08);
          font-size: 12px;
        }

        .cards {
          display: grid;
          gap: 10px;
        }

        .card {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.18);
          padding: 10px;
          cursor: pointer;
        }
        .card.dragging {
          opacity: 0.6;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }
        .name {
          font-weight: 900;
        }
        .value {
          font-weight: 900;
          color: rgba(200, 162, 106, 0.95);
          white-space: nowrap;
        }

        .metaRow {
          margin-top: 8px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .meta {
          font-size: 12px;
          opacity: 0.8;
        }
        .chip {
          font-size: 11px;
          padding: 4px 9px;
          border-radius: 999px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.06);
          white-space: nowrap;
          color: #f2f2f2;
        }

        .perfRow {
          margin-top: 10px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
        }
        .pill {
          font-size: 11px;
          padding: 4px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          white-space: nowrap;
        }
        .more {
          font-size: 12px;
          opacity: 0.75;
        }

        .obs {
          margin-top: 10px;
          font-size: 12px;
          opacity: 0.85;
          border-left: 3px solid rgba(200, 162, 106, 0.55);
          padding-left: 10px;
        }

        .foot {
          margin-top: 10px;
          font-size: 12px;
          opacity: 0.7;
        }

        .emptyCol {
          padding: 14px;
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          opacity: 0.7;
          text-align: center;
          font-size: 12px;
        }

        /* MODAL */
        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          z-index: 50;
        }
        .modal {
          width: min(980px, 100%);
          border-radius: 20px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(12, 12, 18, 0.95);
          box-shadow: 0 30px 120px rgba(0, 0, 0, 0.6);
          padding: 14px;
        }
        .modalHead {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          padding: 8px 8px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .modalKicker {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .modalTitle {
          font-size: 18px;
          font-weight: 900;
          margin-top: 6px;
          color: rgba(200, 162, 106, 0.95);
        }
        .modalSub {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.75;
        }
        .btnX {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.06);
          cursor: pointer;
          color: #f2f2f2;
          font-weight: 900;
        }

        .modalGrid {
          padding: 14px 8px 8px;
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
        @media (min-width: 900px) {
          .modalGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        .field {
          display: grid;
          gap: 6px;
        }
        .field.wide {
          grid-column: 1 / -1;
        }
        .field label {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.75;
          font-weight: 900;
        }
        .input {
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(15, 15, 22, 0.9);
          color: #f2f2f2;
          outline: none;
        }
        .textarea {
          min-height: 110px;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(15, 15, 22, 0.9);
          color: #f2f2f2;
          outline: none;
          resize: vertical;
        }

        .perfEdit {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .perfTags {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tag {
          border-radius: 999px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.08);
          padding: 8px 10px;
          cursor: pointer;
          color: #f2f2f2;
          font-weight: 900;
          font-size: 12px;
          display: inline-flex;
          gap: 8px;
          align-items: center;
        }
        .tagX {
          opacity: 0.8;
        }
        .emptySmall {
          font-size: 12px;
          opacity: 0.7;
          padding: 8px 0;
        }

        .modalActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          padding: 12px 8px 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          margin-top: 10px;
        }
        .spacer {
          flex: 1;
        }
        .btnSmall {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.06);
          cursor: pointer;
          font-weight: 900;
          font-size: 12px;
          color: #f2f2f2;
        }
        .btnSmallPrimary {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.4);
          background: linear-gradient(180deg, rgba(200, 162, 106, 0.18), rgba(200, 162, 106, 0.08));
          cursor: pointer;
          font-weight: 900;
          font-size: 12px;
          color: #f2f2f2;
        }
        .btnDanger {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 90, 90, 0.35);
          background: rgba(255, 90, 90, 0.12);
          cursor: pointer;
          font-weight: 900;
          font-size: 12px;
          color: #ffd7d7;
        }

        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
            monospace;
        }
        .modalFoot {
          padding: 10px 8px 4px;
          font-size: 12px;
          opacity: 0.7;
        }
      `}</style>
    </main>
  );
}

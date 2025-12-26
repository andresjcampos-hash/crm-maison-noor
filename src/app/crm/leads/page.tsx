"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Origem = "instagram" | "whatsapp" | "indicacao" | "site" | "outros";
type Status =
  | "novo"
  | "chamou_no_whatsapp"
  | "negociacao"
  | "pagou"
  | "enviado"
  | "finalizado"
  | "perdido";

type HistoricoTipo = "msg" | "ligacao" | "obs" | "pagamento" | "envio";

type HistoricoItem = {
  id: string;
  data: string; // ISO
  tipo: HistoricoTipo;
  texto: string;
};

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

  // Premium
  observacoes?: string;
  historico?: HistoricoItem[];

  // ✅ compatibilidade (caso existam leads antigos salvos com outros nomes)
  // (não precisa usar no app, só pra leitura segura do storage)
  name?: string;
  title?: string;
};

const STORAGE_KEY = "maison_noor_crm_leads_v1";

const STATUS_OPTIONS = [
  { v: "novo", label: "Novo" },
  { v: "chamou_no_whatsapp", label: "Chamou no WhatsApp" },
  { v: "negociacao", label: "Em negociação" },
  { v: "pagou", label: "Pagou" },
  { v: "enviado", label: "Enviado" },
  { v: "finalizado", label: "Finalizado" },
  { v: "perdido", label: "Perdido" },
] as const;

const HIST_TIPOS: { v: HistoricoTipo; label: string }[] = [
  { v: "msg", label: "Mensagem" },
  { v: "ligacao", label: "Ligação" },
  { v: "obs", label: "Observação" },
  { v: "pagamento", label: "Pagamento" },
  { v: "envio", label: "Envio" },
];

// ✅ Fallback p/ browsers sem crypto.randomUUID
function uid() {
  // @ts-ignore
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ✅ Resolve "nome sumindo" se leads antigos estiverem como name/title
function resolveLeadNome(l: any): string {
  const v =
    (typeof l?.nome === "string" && l.nome.trim()) ||
    (typeof l?.name === "string" && l.name.trim()) ||
    (typeof l?.title === "string" && l.title.trim()) ||
    "";
  return v;
}

function NavCRM() {
  const pathname = usePathname();

  const items = [
    { href: "/crm", label: "Dashboard" },
    { href: "/crm/leads", label: "Leads" },
    { href: "/crm/kanban", label: "Kanban" },
    { href: "/crm/pedidos", label: "Pedidos" },
  ];

  const isActive = (href: string) => {
    if (href === "/crm") return pathname === "/crm" || pathname === "/crm/";
    return pathname?.startsWith(href);
  };

  return (
    <nav className="nav">
      <div className="navInner">
        <div className="brand">
          <div className="brandKicker">Maison Noor</div>
          <div className="brandTitle">CRM</div>
        </div>

        <div className="links" role="navigation" aria-label="CRM">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`link ${isActive(it.href) ? "active" : ""}`}
            >
              {it.label}
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        .nav {
          position: sticky;
          top: 0;
          z-index: 60;
          border-bottom: 1px solid rgba(200, 162, 106, 0.18);
          background: rgba(10, 10, 14, 0.92);
          backdrop-filter: blur(8px);
        }
        .navInner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 12px 18px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .brand {
          display: grid;
          gap: 2px;
          line-height: 1.1;
        }
        .brandKicker {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(200, 162, 106, 0.95);
          font-weight: 900;
        }
        .brandTitle {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.9;
        }
        .links {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .link {
          text-decoration: none;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: rgba(200, 162, 106, 0.06);
          color: #f2f2f2;
          font-weight: 900;
          letter-spacing: 0.01em;
          transition: transform 0.08s ease, border 0.12s ease, background 0.12s ease;
          white-space: nowrap;
        }
        .link:hover {
          transform: translateY(-1px);
          border-color: rgba(200, 162, 106, 0.35);
          background: rgba(200, 162, 106, 0.1);
        }
        .active {
          border-color: rgba(200, 162, 106, 0.85);
          background: rgba(200, 162, 106, 0.18);
          color: #e6c58f;
        }
      `}</style>
    </nav>
  );
}

export default function LeadsPage() {
  const perfumesPadrao = useMemo(
    () => [
      "Afeef (Lattafa)",
      "Yara",
      "Sabah Al Ward",
      "Asad",
      "Asad Elixir",
      "Fakhar Pride",
      "Club de Nuit",
      "Ameerat Al Arab",
    ],
    []
  );

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState<Origem | "">("");
  const [valor, setValor] = useState("");
  const [perfumes, setPerfumes] = useState<string[]>([]);
  const [novoPerfume, setNovoPerfume] = useState("");
  const [msg, setMsg] = useState("");

  const [leads, setLeads] = useState<Lead[]>([]);

  // Modal editar
  const [openEdit, setOpenEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [obsEdit, setObsEdit] = useState("");
  const [histTipo, setHistTipo] = useState<HistoricoTipo>("msg");
  const [histTexto, setHistTexto] = useState("");

  function onlyDigits(v: string) {
    return v.replace(/\D/g, "");
  }

  function parseBRL(v: string) {
    const cleaned = v
      .trim()
      .replace(/[R$\s]/g, "")
      .replace(/\./g, "DOT")
      .replace(/,/g, ".")
      .replace(/DOT/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }

  function formatBRL(n: number) {
    return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      // ✅ Normaliza: garante `nome` preenchido, mesmo se dados antigos estiverem como `name/title`
      const normalized = parsed
        .map((l: any) => {
          const resolvedNome = resolveLeadNome(l);
          return {
            ...l,
            nome: resolvedNome,
            telefone: typeof l?.telefone === "string" ? onlyDigits(l.telefone) : "",
            perfumes: Array.isArray(l?.perfumes) ? l.perfumes : [],
            valorEstimado: Number(l?.valorEstimado || 0),
          } as Lead;
        })
        // opcional: remove itens totalmente inválidos
        .filter((l: any) => l && typeof l.id === "string" && l.id);

      return normalized as Lead[];
    } catch {
      return [];
    }
  }

  function saveToStorage(next: Lead[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  useEffect(() => {
    const loaded = loadFromStorage();
    setLeads(loaded);

    // ✅ regrava já normalizado (uma vez) para nunca mais sumir nome
    if (loaded.length) saveToStorage(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePerfume(p: string) {
    setPerfumes((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function addPerfumeManual() {
    const p = novoPerfume.trim();
    if (!p) return;
    if (!perfumes.includes(p)) setPerfumes((prev) => [p, ...prev]);
    setNovoPerfume("");
  }

  function validar() {
    if (nome.trim().length < 3) return "Nome precisa ter pelo menos 3 letras.";
    if (onlyDigits(telefone).length < 10) return "Telefone precisa ter DDD + número.";
    if (!origem) return "Selecione a origem.";
    const n = parseBRL(valor);
    if (!Number.isFinite(n) || n <= 0) return "Valor estimado precisa ser maior que 0.";
    if (perfumes.length === 0) return "Selecione pelo menos 1 perfume.";
    return null;
  }

  function salvar() {
    const err = validar();
    if (err) return setMsg(err);

    const valorN = parseBRL(valor);
    const now = new Date().toISOString();

    const lead: Lead = {
      id: uid(),
      nome: nome.trim(),
      telefone: onlyDigits(telefone),
      origem: origem as Origem,
      valorEstimado: valorN,
      perfumes: [...perfumes],
      status: "novo",
      createdAt: now,
      updatedAt: now,
    };

    const next = [lead, ...leads];
    setLeads(next);
    saveToStorage(next);

    setMsg("✅ Lead salvo!");
    setNome("");
    setTelefone("");
    setOrigem("");
    setValor("");
    setPerfumes([]);
    setNovoPerfume("");
  }

  function atualizarStatus(id: string, status: Status) {
    const now = new Date().toISOString();
    const next = leads.map((l) => (l.id === id ? { ...l, status, updatedAt: now } : l));
    setLeads(next);
    saveToStorage(next);
    setMsg("✅ Status atualizado!");
  }

  function excluir(id: string) {
    const ok = window.confirm("Excluir este lead? (não dá para desfazer)");
    if (!ok) return;
    const next = leads.filter((l) => l.id !== id);
    setLeads(next);
    saveToStorage(next);
    setMsg("🗑️ Lead removido.");
  }

  function origemLabel(o: Origem) {
    const map: Record<Origem, string> = {
      instagram: "Instagram",
      whatsapp: "WhatsApp",
      indicacao: "Indicação",
      site: "Site",
      outros: "Outros",
    };
    return map[o] || "—";
  }

  const totalValor = leads.reduce((acc, l) => acc + (Number(l.valorEstimado) || 0), 0);

  // ===== Modal Editar =====
  const editingLead = useMemo(() => {
    if (!editingId) return null;
    return leads.find((l) => l.id === editingId) || null;
  }, [editingId, leads]);

  function abrirEditar(lead: Lead) {
    setEditingId(lead.id);
    setObsEdit(lead.observacoes || "");
    setHistTipo("msg");
    setHistTexto("");
    setOpenEdit(true);
  }

  function fecharEditar() {
    setOpenEdit(false);
    setEditingId(null);
    setObsEdit("");
    setHistTexto("");
  }

  function salvarObservacoes() {
    if (!editingLead) return;
    const now = new Date().toISOString();
    const next = leads.map((l) =>
      l.id === editingLead.id ? { ...l, observacoes: obsEdit, updatedAt: now } : l
    );
    setLeads(next);
    saveToStorage(next);
    setMsg("✅ Observações salvas!");
  }

  function addHistorico() {
    if (!editingLead) return;
    const texto = histTexto.trim();
    if (!texto) return setMsg("⚠️ Escreva o texto do histórico.");

    const item: HistoricoItem = {
      id: uid(),
      data: new Date().toISOString(),
      tipo: histTipo,
      texto,
    };

    const historicoAtual = editingLead.historico || [];
    const novoHistorico = [...historicoAtual, item];

    // 🔥 Automação de status
    let novoStatus: Status | undefined;
    if (histTipo === "pagamento") novoStatus = "pagou";
    if (histTipo === "envio") novoStatus = "enviado";

    const now = new Date().toISOString();
    const next = leads.map((l) =>
      l.id === editingLead.id
        ? {
            ...l,
            historico: novoHistorico,
            ...(novoStatus ? { status: novoStatus } : {}),
            updatedAt: now,
          }
        : l
    );

    setLeads(next);
    saveToStorage(next);
    setHistTexto("");

    setMsg(
      novoStatus
        ? `✅ Histórico salvo e status alterado para ${
            STATUS_OPTIONS.find((s) => s.v === novoStatus)?.label
          }`
        : "✅ Histórico adicionado!"
    );
  }

  function removerHistorico(itemId: string) {
    if (!editingLead) return;
    const now = new Date().toISOString();
    const hist = (editingLead.historico || []).filter((h) => h.id !== itemId);

    const next = leads.map((l) =>
      l.id === editingLead.id ? { ...l, historico: hist, updatedAt: now } : l
    );

    setLeads(next);
    saveToStorage(next);
    setMsg("🗑️ Histórico removido.");
  }

  // ✅ Esc fecha modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") fecharEditar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openEdit]);

  return (
    <>
      <NavCRM />

      <main className="page">
        <div className="pageShell">
          <header className="pageHeader">
            <div className="pageHeaderLeft">
              <div className="kicker">Maison Noor</div>
              <h1 className="pageTitle">CRM • Leads</h1>
              <p className="pageSub">
                Cadastro + lista com status, no estilo premium (preto & bronze).
              </p>
            </div>

            <div className="pageHeaderRight">
              <div className="stats">
                <div className="stat">
                  <div className="statLabel">Total de leads</div>
                  <div className="statValue">{leads.length}</div>
                </div>
                <div className="stat">
                  <div className="statLabel">Valor estimado</div>
                  <div className="statValue">{leads.length ? formatBRL(totalValor) : "—"}</div>
                </div>
              </div>
            </div>
          </header>

          {msg ? <div className="toast">{msg}</div> : null}

          <section className="pageBody">
            <section className="grid">
              <div className="card">
                <div className="cardTitle">Cadastrar lead</div>

                <div className="row">
                  <div className="field">
                    <label>Nome *</label>
                    <input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Maria Fernandes"
                    />
                  </div>
                  <div className="field">
                    <label>Telefone (DDD) *</label>
                    <input
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="Ex: (12) 99999-9999"
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="field">
                    <label>Origem *</label>
                    <select value={origem} onChange={(e) => setOrigem(e.target.value as Origem)}>
                      <option value="">Selecione...</option>
                      <option value="instagram">Instagram</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="indicacao">Indicação</option>
                      <option value="site">Site</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Valor estimado (R$) *</label>
                    <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex: 389,90" />
                    <div className="hint">Pode usar vírgula ou ponto.</div>
                  </div>
                </div>

                <div className="divider" />

                <div className="field">
                  <label>Perfumes de interesse *</label>

                  <div className="perfGrid">
                    {perfumesPadrao.map((p) => {
                      const checked = perfumes.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          className={`perfPill ${checked ? "on" : ""}`}
                          onClick={() => togglePerfume(p)}
                          aria-pressed={checked}
                        >
                          <span className="dot" />
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <div className="manualRow">
                    <input
                      value={novoPerfume}
                      onChange={(e) => setNovoPerfume(e.target.value)}
                      placeholder="Adicionar perfume manual..."
                    />
                    <button type="button" className="btn" onClick={addPerfumeManual}>
                      Adicionar
                    </button>
                  </div>

                  <div className="hint">
                    <strong>Selecionados:</strong> {perfumes.length ? perfumes.join(" • ") : "—"}
                  </div>
                </div>

                <button className="btnPrimary" onClick={salvar}>
                  Salvar lead
                </button>
              </div>

              <div className="card">
                <div className="cardTitle">Leads salvos</div>

                <div className="tableWrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Contato</th>
                        <th>Perfumes</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      {leads.map((l) => (
                        <tr key={l.id}>
                          <td>
                            <div className="name">{l.nome?.trim() || "Sem nome"}</div>
                            <div className="meta">{origemLabel(l.origem)}</div>
                          </td>

                          <td>
                            <div className="mono">{l.telefone}</div>
                            <div className="meta">
                              Atualizado: {new Date(l.updatedAt || l.createdAt).toLocaleString("pt-BR")}
                            </div>
                          </td>

                          <td>
                            <div className="chips">
                              {l.perfumes.slice(0, 4).map((p) => (
                                <span key={p} className="chip">
                                  {p}
                                </span>
                              ))}
                              {l.perfumes.length > 4 ? (
                                <span className="more">+{l.perfumes.length - 4}</span>
                              ) : null}
                            </div>
                            {l.observacoes ? (
                              <div className="obsMini">📝 {l.observacoes.slice(0, 40)}…</div>
                            ) : null}
                          </td>

                          <td className="mono">{formatBRL(Number(l.valorEstimado || 0))}</td>

                          <td>
                            <select
                              className="selectSmall"
                              value={l.status}
                              onChange={(e) => atualizarStatus(l.id, e.target.value as Status)}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s.v} value={s.v}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <div className="actionsRow">
                              <button className="btn" type="button" onClick={() => abrirEditar(l)}>
                                Editar
                              </button>
                              <button className="btnDanger" onClick={() => excluir(l.id)} type="button">
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {leads.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty">
                            Nenhum lead salvo ainda.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </section>

          {openEdit && editingLead ? (
            <div className="modalBackdrop" onMouseDown={fecharEditar}>
              <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modalHead">
                  <div>
                    <div className="modalKicker">Editar lead</div>
                    <div className="modalTitle">{editingLead.nome?.trim() || "Sem nome"}</div>
                    <div className="modalSub">
                      {editingLead.telefone} • {origemLabel(editingLead.origem)} •{" "}
                      {formatBRL(Number(editingLead.valorEstimado || 0))}
                    </div>
                  </div>

                  <button className="x" onClick={fecharEditar} type="button" aria-label="Fechar modal">
                    ✕
                  </button>
                </div>

                <div className="modalGrid">
                  <div className="box">
                    <div className="boxTitle">Observações</div>
                    <textarea
                      value={obsEdit}
                      onChange={(e) => setObsEdit(e.target.value)}
                      placeholder="Ex: quer Afeef e Asad Elixir, pediu desconto no Pix..."
                    />
                    <button className="btnPrimary" onClick={salvarObservacoes} type="button">
                      Salvar observações
                    </button>
                  </div>

                  <div className="box">
                    <div className="boxTitle">Histórico</div>

                    <div className="histForm">
                      <select value={histTipo} onChange={(e) => setHistTipo(e.target.value as HistoricoTipo)}>
                        {HIST_TIPOS.map((t) => (
                          <option key={t.v} value={t.v}>
                            {t.label}
                          </option>
                        ))}
                      </select>

                      <input
                        value={histTexto}
                        onChange={(e) => setHistTexto(e.target.value)}
                        placeholder="Ex: Enviei catálogo / confirmou pagamento / postei no correio..."
                      />

                      <button className="btn" onClick={addHistorico} type="button">
                        Adicionar
                      </button>
                    </div>

                    <div className="histList">
                      {(editingLead.historico || [])
                        .slice()
                        .sort((a, b) => (b.data || "").localeCompare(a.data || ""))
                        .map((h) => (
                          <div key={h.id} className="histItem">
                            <div className="histTop">
                              <span className="histTag">
                                {HIST_TIPOS.find((x) => x.v === h.tipo)?.label || h.tipo}
                              </span>
                              <span className="histDate">{new Date(h.data).toLocaleString("pt-BR")}</span>
                            </div>
                            <div className="histText">{h.texto}</div>
                            <button className="btnDanger" onClick={() => removerHistorico(h.id)} type="button">
                              Remover
                            </button>
                          </div>
                        ))}

                      {(editingLead.historico || []).length === 0 ? (
                        <div className="emptyBox">Nenhum histórico ainda. Adicione o primeiro registro.</div>
                      ) : null}
                    </div>

                    <div className="hint">
                      * Se você escolher <strong>Pagamento</strong> o status vira <strong>Pagou</strong>. Se escolher{" "}
                      <strong>Envio</strong> vira <strong>Enviado</strong>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <style jsx>{`
          /* Base da página (mantém respiro sob navbar sticky) */
          .page {
            padding: 24px;
            padding-top: 18px;
          }

          .pageShell {
            display: grid;
            gap: 18px;
          }

          .pageHeader {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 16px;
            flex-wrap: wrap;

            padding: 20px;
            border-radius: 22px;
            border: 1px solid rgba(200, 162, 106, 0.18);

            background: radial-gradient(700px 260px at 10% 0%, rgba(200, 162, 106, 0.12), transparent 55%),
              radial-gradient(520px 240px at 90% 20%, rgba(200, 162, 106, 0.08), transparent 55%),
              rgba(0, 0, 0, 0.2);

            backdrop-filter: blur(10px);
          }

          .pageHeaderLeft {
            min-width: 260px;
          }

          .kicker {
            font-size: 12px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: rgba(200, 162, 106, 0.95);
            font-weight: 900;
          }

          .pageTitle {
            margin: 8px 0 0;
            font-size: 34px;
            font-weight: 950;
            letter-spacing: 0.01em;
          }

          .pageSub {
            margin: 8px 0 0;
            opacity: 0.8;
            font-size: 15px;
            line-height: 1.4;
            max-width: 720px;
          }

          .pageHeaderRight {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
          }

          .pageBody {
            display: grid;
            gap: 18px;
          }

          .stats {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .stat {
            min-width: 160px;
            padding: 10px 12px;
            border-radius: 14px;
            border: 1px solid rgba(200, 162, 106, 0.16);
            background: rgba(200, 162, 106, 0.06);
          }

          .statLabel {
            font-size: 12px;
            opacity: 0.8;
          }

          .statValue {
            margin-top: 6px;
            font-size: 16px;
            font-weight: 800;
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

          .grid {
            margin-top: 2px;
            display: grid;
            gap: 14px;
            grid-template-columns: 1fr;
          }

          @media (min-width: 1100px) {
            .grid {
              grid-template-columns: 420px 1fr;
              align-items: start;
            }
          }

          .card {
            border-radius: 18px;
            border: 1px solid rgba(200, 162, 106, 0.18);
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
            padding: 14px;
          }

          .cardTitle {
            font-size: 12px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            opacity: 0.85;
            margin-bottom: 12px;
            font-weight: 800;
          }

          .row {
            display: grid;
            gap: 12px;
            grid-template-columns: 1fr;
          }

          @media (min-width: 700px) {
            .row {
              grid-template-columns: 1fr 1fr;
            }
          }

          .field label {
            display: block;
            font-size: 12px;
            opacity: 0.78;
            margin-bottom: 6px;
          }

          input,
          select,
          textarea {
            width: 100%;
            padding: 12px 12px;
            border-radius: 14px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(15, 15, 22, 0.9);
            outline: none;
            color: #f2f2f2;
          }

          textarea {
            min-height: 160px;
            resize: vertical;
          }

          input::placeholder {
            color: rgba(242, 242, 242, 0.55);
          }

          input:focus,
          select:focus,
          textarea:focus {
            border-color: rgba(200, 162, 106, 0.55);
            box-shadow: 0 0 0 3px rgba(200, 162, 106, 0.12);
          }

          .hint {
            margin-top: 8px;
            font-size: 12px;
            opacity: 0.75;
          }

          .divider {
            height: 1px;
            background: rgba(200, 162, 106, 0.16);
            margin: 14px 0;
          }

          .perfGrid {
            display: grid;
            gap: 10px;
            grid-template-columns: 1fr;
          }

          @media (min-width: 520px) {
            .perfGrid {
              grid-template-columns: 1fr 1fr;
            }
          }

          .perfPill {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.18);
            background: rgba(255, 255, 255, 0.04);
            cursor: pointer;
            text-align: left;
            color: #f2f2f2;
            font-weight: 600;
            transition: transform 0.08s ease, border 0.12s ease, background 0.12s ease;
          }

          .perfPill:hover {
            transform: translateY(-1px);
            border-color: rgba(200, 162, 106, 0.35);
          }

          .perfPill.on {
            border-color: rgba(200, 162, 106, 0.85);
            background: rgba(200, 162, 106, 0.18);
            color: #e6c58f;
            font-weight: 700;
          }

          .dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            border: 1px solid rgba(200, 162, 106, 0.9);
            background: rgba(200, 162, 106, 0.35);
            flex-shrink: 0;
          }

          .manualRow {
            display: grid;
            gap: 10px;
            grid-template-columns: 1fr;
            margin-top: 10px;
          }

          @media (min-width: 520px) {
            .manualRow {
              grid-template-columns: 1fr auto;
              align-items: center;
            }
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

          .btnPrimary {
            margin-top: 10px;
            width: 100%;
            padding: 12px 14px;
            border-radius: 14px;
            border: 1px solid rgba(200, 162, 106, 0.4);
            background: linear-gradient(180deg, rgba(200, 162, 106, 0.18), rgba(200, 162, 106, 0.08));
            cursor: pointer;
            font-weight: 900;
            letter-spacing: 0.02em;
            color: #f2f2f2;
          }

          .btnDanger {
            padding: 10px 12px;
            border-radius: 14px;
            border: 1px solid rgba(122, 42, 69, 0.6);
            background: rgba(122, 42, 69, 0.14);
            cursor: pointer;
            font-weight: 800;
            color: #f2f2f2;
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
            min-width: 1060px;
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

          .mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
              monospace;
          }

          .chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }

          .chip {
            font-size: 11px;
            padding: 4px 9px;
            border-radius: 999px;
            border: 1px solid rgba(200, 162, 106, 0.22);
            background: rgba(200, 162, 106, 0.06);
            white-space: nowrap;
          }

          .more {
            font-size: 11px;
            opacity: 0.75;
            align-self: center;
          }

          .selectSmall {
            padding: 10px 12px;
            border-radius: 14px;
          }

          .empty {
            padding: 16px;
            opacity: 0.7;
            text-align: center;
          }

          .actionsRow {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .obsMini {
            margin-top: 8px;
            font-size: 12px;
            opacity: 0.78;
            border-left: 3px solid rgba(200, 162, 106, 0.55);
            padding-left: 10px;
          }

          /* ===== MODAL ===== */
          .modalBackdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.62);
            display: grid;
            place-items: center;
            padding: 18px;
            z-index: 50;
          }

          .modal {
            width: min(980px, 100%);
            border-radius: 18px;
            border: 1px solid rgba(200, 162, 106, 0.22);
            background: rgba(10, 10, 14, 0.92);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
            padding: 14px;
          }

          .modalHead {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
            padding: 6px 6px 12px;
          }

          .modalKicker {
            font-size: 12px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: rgba(200, 162, 106, 0.95);
            font-weight: 900;
          }

          .modalTitle {
            margin-top: 6px;
            font-size: 18px;
            font-weight: 900;
            color: #f2f2f2;
          }

          .modalSub {
            margin-top: 6px;
            font-size: 12px;
            opacity: 0.78;
            color: #f2f2f2;
          }

          .x {
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(255, 255, 255, 0.06);
            color: #f2f2f2;
            cursor: pointer;
            padding: 8px 10px;
            font-weight: 900;
          }

          .modalGrid {
            display: grid;
            gap: 12px;
            grid-template-columns: 1fr;
          }

          @media (min-width: 980px) {
            .modalGrid {
              grid-template-columns: 1fr 1fr;
            }
          }

          .box {
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.03);
            padding: 12px;
          }

          .boxTitle {
            font-size: 12px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            opacity: 0.85;
            font-weight: 900;
            margin-bottom: 10px;
            color: #f2f2f2;
          }

          .histForm {
            display: grid;
            gap: 10px;
            grid-template-columns: 140px 1fr auto;
            align-items: center;
          }

          @media (max-width: 860px) {
            .histForm {
              grid-template-columns: 1fr;
            }
          }

          .histList {
            margin-top: 10px;
            display: grid;
            gap: 10px;
            max-height: 360px;
            overflow: auto;
            padding-right: 4px;
          }

          .histItem {
            border-radius: 16px;
            border: 1px solid rgba(200, 162, 106, 0.16);
            background: rgba(200, 162, 106, 0.06);
            padding: 10px;
          }

          .histTop {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            align-items: center;
          }

          .histTag {
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 999px;
            border: 1px solid rgba(200, 162, 106, 0.22);
            background: rgba(0, 0, 0, 0.22);
            color: #f2f2f2;
            font-weight: 900;
          }

          .histDate {
            font-size: 11px;
            opacity: 0.78;
            color: #f2f2f2;
          }

          .histText {
            margin-top: 8px;
            font-size: 12px;
            opacity: 0.92;
            color: #f2f2f2;
            white-space: pre-wrap;
          }

          .emptyBox {
            padding: 12px;
            opacity: 0.75;
            color: #f2f2f2;
            border: 1px dashed rgba(200, 162, 106, 0.22);
            border-radius: 16px;
          }

          @media (max-width: 900px) {
            .pageTitle {
              font-size: 26px;
            }
            .pageHeader {
              padding: 16px;
            }
          }
        `}</style>
      </main>
    </>
  );
}

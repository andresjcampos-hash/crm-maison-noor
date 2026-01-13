"use client";

import { useEffect, useMemo, useState } from "react";

type Vendedor = {
  id: string;
  nome: string;
  telefone: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  observacoes?: string;
};

const VENDEDORES_KEY = "maison_noor_crm_vendedores_v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    if (!canUseStorage()) return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T): void {
  if (!canUseStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function onlyDigits(v: string): string {
  return String(v || "").replace(/\D/g, "");
}

function origemTelefoneOk(tel: string): boolean {
  return onlyDigits(tel).length >= 10;
}

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [msg, setMsg] = useState("");

  const [open, setOpen] = useState(false);

  // create
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);

  // edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editObservacoes, setEditObservacoes] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);

  const [q, setQ] = useState("");

  function toast(t: string, ms = 1600): void {
    setMsg(t);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setMsg(""), ms);
    }
  }

  useEffect(() => {
    const list = loadJSON<Vendedor[]>(VENDEDORES_KEY, []);
    setVendedores(list);

    // se não tiver nenhum, cria o primeiro (igual sua tela mostrou)
    if (!list.length) {
      const now = new Date().toISOString();
      const seed: Vendedor = {
        id: uid(),
        nome: "André Batista",
        telefone: "12982664205",
        ativo: true,
        createdAt: now,
        updatedAt: now,
      };
      const next = [seed];
      saveJSON(VENDEDORES_KEY, next);
      setVendedores(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vendedoresFiltrados = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return vendedores.slice().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    return vendedores
      .filter((v) => {
        const text = `${v.nome} ${v.telefone} ${v.ativo ? "ativo" : "inativo"} ${v.observacoes || ""}`.toLowerCase();
        return text.includes(qq);
      })
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }, [vendedores, q]);

  function startNew(): void {
    setNome("");
    setTelefone("");
    setObservacoes("");
    setAtivo(true);
    setOpen(true);
  }

  function validateCreate(): string {
    if (!nome.trim()) return "Informe o nome do vendedor.";
    if (!origemTelefoneOk(telefone)) return "Informe um telefone válido (com DDD).";
    return "";
  }

  function saveCreate(): void {
    const err = validateCreate();
    if (err) {
      toast(`⚠️ ${err}`, 2400);
      return;
    }

    const now = new Date().toISOString();
    const novo: Vendedor = {
      id: uid(),
      nome: nome.trim(),
      telefone: telefone.trim(),
      ativo: Boolean(ativo),
      observacoes: observacoes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const next = [novo, ...vendedores];
    saveJSON(VENDEDORES_KEY, next);
    setVendedores(next);
    setOpen(false);
    toast("✅ Vendedor cadastrado!", 1600);
  }

  function openEdit(v: Vendedor): void {
    setEditId(v.id);
    setEditNome(v.nome || "");
    setEditTelefone(v.telefone || "");
    setEditObservacoes(v.observacoes || "");
    setEditAtivo(Boolean(v.ativo));
    setEditOpen(true);
  }

  function validateEdit(): string {
    if (!editNome.trim()) return "Informe o nome do vendedor.";
    if (!origemTelefoneOk(editTelefone)) return "Informe um telefone válido (com DDD).";
    return "";
  }

  function saveEdit(): void {
    const err = validateEdit();
    if (err) {
      toast(`⚠️ ${err}`, 2400);
      return;
    }

    const updatedAt = new Date().toISOString();

    const next = vendedores.map((v) =>
      v.id === editId
        ? {
            ...v,
            nome: editNome.trim(),
            telefone: editTelefone.trim(),
            observacoes: editObservacoes.trim() || undefined,
            ativo: Boolean(editAtivo),
            updatedAt,
          }
        : v
    );

    saveJSON(VENDEDORES_KEY, next);
    setVendedores(next);
    setEditOpen(false);
    toast("✅ Vendedor atualizado!", 1400);
  }

  function toggleAtivo(v: Vendedor): void {
    const updatedAt = new Date().toISOString();
    const next = vendedores.map((x) =>
      x.id === v.id ? { ...x, ativo: !x.ativo, updatedAt } : x
    );
    saveJSON(VENDEDORES_KEY, next);
    setVendedores(next);
    toast(v.ativo ? "⛔ Vendedor desativado!" : "✅ Vendedor ativado!", 1400);
  }

  return (
    <main className="page">
      <header className="head">
        <div>
          <div className="kicker">Maison Noor</div>
          <h1 className="title">CRM • Vendedores</h1>
          <p className="sub">Cadastro de vendedores para controle de pedidos</p>
        </div>

        <div className="headRight">
          <div className="filterBox">
            <label>Busca</label>
            <input
              className="inputSmall"
              placeholder="Nome, telefone..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <button className="btnPrimary" onClick={startNew} type="button">
            + Novo vendedor
          </button>
        </div>
      </header>

      {msg ? <div className="toast">{msg}</div> : null}

      <section className="card">
        <div className="cardTitle">Vendedores cadastrados</div>

        <div className="list">
          {vendedoresFiltrados.map((v) => (
            <div className="row" key={v.id}>
              <div className="rowLeft">
                <div className="name">{v.nome}</div>
                <div className="meta">
                  {v.telefone} • {v.ativo ? "Ativo" : "Inativo"}
                  {v.observacoes ? <span> • {v.observacoes}</span> : null}
                </div>
              </div>

              {/* ✅ CORREÇÃO: botões COM TEXTO (não ficam “sem nome”) */}
              <div className="actions">
                <button className="btnSmall" onClick={() => openEdit(v)} type="button">
                  Editar
                </button>

                <button
                  className={v.ativo ? "btnDanger" : "btnSmall"}
                  onClick={() => toggleAtivo(v)}
                  type="button"
                  title={v.ativo ? "Desativar vendedor" : "Ativar vendedor"}
                >
                  {v.ativo ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))}

          {!vendedoresFiltrados.length ? (
            <div className="emptyBox">Nenhum vendedor encontrado.</div>
          ) : null}
        </div>
      </section>

      {/* MODAL NOVO */}
      {open ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modalHead">
              <div>
                <div className="kicker">Maison Noor</div>
                <div className="modalTitle">Novo vendedor</div>
                <div className="modalSub">Cadastre quem está realizando a venda.</div>
              </div>

              <button className="x" onClick={() => setOpen(false)} type="button" aria-label="Fechar">
                ✕
              </button>
            </div>

            <div className="box">
              <label className="lab">Nome</label>
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />

              <label className="lab">Telefone</label>
              <input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} />

              <div className="row2">
                <div>
                  <label className="lab">Status</label>
                  <select className="select" value={ativo ? "ativo" : "inativo"} onChange={(e) => setAtivo(e.target.value === "ativo")}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div />
              </div>

              <label className="lab">Observações</label>
              <textarea className="textarea" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />

              <div className="modalActions">
                <button className="btn" onClick={() => setOpen(false)} type="button">
                  Cancelar
                </button>
                <button className="btnPrimary" onClick={saveCreate} type="button">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL EDITAR */}
      {editOpen ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modalHead">
              <div>
                <div className="kicker">Maison Noor</div>
                <div className="modalTitle">Editar vendedor</div>
                <div className="modalSub">Ajuste nome, telefone e status.</div>
              </div>

              <button className="x" onClick={() => setEditOpen(false)} type="button" aria-label="Fechar">
                ✕
              </button>
            </div>

            <div className="box">
              <label className="lab">Nome</label>
              <input className="input" value={editNome} onChange={(e) => setEditNome(e.target.value)} />

              <label className="lab">Telefone</label>
              <input className="input" value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} />

              <div className="row2">
                <div>
                  <label className="lab">Status</label>
                  <select className="select" value={editAtivo ? "ativo" : "inativo"} onChange={(e) => setEditAtivo(e.target.value === "ativo")}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div />
              </div>

              <label className="lab">Observações</label>
              <textarea className="textarea" value={editObservacoes} onChange={(e) => setEditObservacoes(e.target.value)} />

              <div className="modalActions">
                <button className="btn" onClick={() => setEditOpen(false)} type="button">
                  Cancelar
                </button>
                <button className="btnPrimary" onClick={saveEdit} type="button">
                  Salvar alterações
                </button>
              </div>
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
        .inputSmall {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(15, 15, 22, 0.9);
          color: #f2f2f2;
          outline: none;
          min-width: 240px;
        }

        .btn {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.25);
          background: rgba(200, 162, 106, 0.08);
          cursor: pointer;
          font-weight: 900;
          color: #f2f2f2;
        }
        .btnPrimary {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.45);
          background: linear-gradient(
            180deg,
            rgba(200, 162, 106, 0.18),
            rgba(200, 162, 106, 0.08)
          );
          cursor: pointer;
          font-weight: 900;
          color: #f2f2f2;
        }

        .btnSmall {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(200, 162, 106, 0.25);
          background: rgba(200, 162, 106, 0.08);
          cursor: pointer;
          font-weight: 900;
          color: #f2f2f2;
          white-space: nowrap;
          min-width: 120px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }
        .btnDanger {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 120, 120, 0.3);
          background: rgba(255, 120, 120, 0.08);
          cursor: pointer;
          font-weight: 900;
          color: #ffdada;
          white-space: nowrap;
          min-width: 120px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        .toast {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          margin-top: 0;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.1);
          font-weight: 800;
          max-width: min(980px, 92vw);
        }

        .card {
          margin-top: 14px;
          border-radius: 18px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.03),
            rgba(255, 255, 255, 0.01)
          );
          padding: 14px;
        }
        .cardTitle {
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.85;
          margin-bottom: 12px;
          font-weight: 900;
        }

        .list {
          display: grid;
          gap: 12px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.14);
          flex-wrap: wrap;
        }
        .rowLeft {
          min-width: 260px;
        }
        .name {
          font-weight: 900;
          font-size: 18px;
        }
        .meta {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.7;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: nowrap;
          justify-content: flex-start;
          align-items: center;
        }

        .emptyBox {
          padding: 12px;
          border-radius: 14px;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          opacity: 0.75;
        }

        /* Modal */
        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: grid;
          place-items: center;
          padding: 20px;
          z-index: 50;
        }
        .modal {
          width: min(860px, 98vw);
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 18px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(10, 10, 14, 0.92);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
          padding: 14px;
          display: flex;
          flex-direction: column;
        }
        .modalHead {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          padding: 10px;
        }
        .modalTitle {
          font-size: 18px;
          font-weight: 900;
          margin-top: 4px;
        }
        .modalSub {
          margin-top: 6px;
          opacity: 0.75;
        }
        .x {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #f2f2f2;
          border-radius: 12px;
          padding: 10px 12px;
          cursor: pointer;
          font-weight: 900;
        }

        .box {
          border-radius: 16px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: rgba(0, 0, 0, 0.18);
          padding: 12px;
        }
        .lab {
          display: block;
          margin-top: 10px;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.8;
          font-weight: 900;
        }
        .input,
        .select,
        .textarea {
          width: 100%;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(15, 15, 22, 0.9);
          color: #f2f2f2;
          outline: none;
          margin-top: 6px;
        }
        .textarea {
          min-height: 96px;
          resize: vertical;
        }
        .row2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        @media (min-width: 720px) {
          .row2 {
            grid-template-columns: 1fr 1fr;
          }
        }
        .modalActions {
          margin-top: 12px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
      `}</style>
    </main>
  );
}

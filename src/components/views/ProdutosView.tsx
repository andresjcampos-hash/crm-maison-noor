"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Produto = {
  id: string;
  nome: string;
  marca?: string;
  volumeMl?: number; // 100, 50...
  categoria?: "masculino" | "feminino" | "unissex";
  precoCompra?: number;
  precoVenda?: number;
  estoque?: number;
  ativo?: boolean;
  createdAt: string;
  updatedAt: string;
  observacoes?: string;
};

const STORAGE_KEY = "maison_noor_crm_produtos_v1";

function nowISO() {
  return new Date().toISOString();
}
function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function formatBRL(n: number) {
  return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}
function readStorage(): Produto[] {
  try {
    if (!canUseStorage()) return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Produto[]) : [];
  } catch {
    return [];
  }
}
function writeStorage(items: Produto[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
function norm(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export default function ProdutosView() {
  const [items, setItems] = useState<Produto[]>([]);
  const [toast, setToast] = useState("");

  // filtros
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"todas" | Produto["categoria"]>("todas");
  const [onlyActive, setOnlyActive] = useState(true);
  const [onlySemEstoque, setOnlySemEstoque] = useState(false);
  const [sortBy, setSortBy] = useState<"recentes" | "nome" | "estoque" | "preco">("recentes");

  // modal
  const [openId, setOpenId] = useState<string | null>(null);
  const openItem = useMemo(() => items.find((p) => p.id === openId) || null, [items, openId]);

  // form
  const [fNome, setFNome] = useState("");
  const [fMarca, setFMarca] = useState("");
  const [fVolume, setFVolume] = useState<string>("100");
  const [fCat, setFCat] = useState<Produto["categoria"]>("unissex");
  const [fCompra, setFCompra] = useState<string>("0");
  const [fVenda, setFVenda] = useState<string>("0");
  const [fEstoque, setFEstoque] = useState<string>("0");
  const [fAtivo, setFAtivo] = useState<boolean>(true);
  const [fObs, setFObs] = useState("");

  // import/export
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setItems(readStorage());
  }, []);

  function showToast(msg: string, ms = 1600) {
    setToast(msg);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setToast(""), ms);
    }
  }

  function refresh() {
    setItems(readStorage());
    showToast("🔄 Atualizado!");
  }

  function openNew() {
    setOpenId("NEW");
    setFNome("");
    setFMarca("");
    setFVolume("100");
    setFCat("unissex");
    setFCompra("0");
    setFVenda("0");
    setFEstoque("0");
    setFAtivo(true);
    setFObs("");
  }

  function openEdit(id: string) {
    const p = items.find((x) => x.id === id);
    if (!p) return;
    setOpenId(id);

    setFNome(p.nome || "");
    setFMarca(p.marca || "");
    setFVolume(String(p.volumeMl ?? 100));
    setFCat(p.categoria || "unissex");
    setFCompra(String(p.precoCompra ?? 0));
    setFVenda(String(p.precoVenda ?? 0));
    setFEstoque(String(p.estoque ?? 0));
    setFAtivo(Boolean(p.ativo ?? true));
    setFObs(p.observacoes || "");
  }

  function closeModal() {
    setOpenId(null);
  }

  function toNum(v: string) {
    const n = Number(String(v || "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function dedupeName(nome: string, exceptId?: string) {
    const base = nome.trim();
    const baseNorm = norm(base);
    const existing = items
      .filter((p) => (exceptId ? p.id !== exceptId : true))
      .map((p) => norm(p.nome));
    if (!existing.includes(baseNorm)) return base;

    let i = 2;
    while (existing.includes(norm(`${base} (${i})`))) i++;
    return `${base} (${i})`;
  }

  function save() {
    const nomeRaw = fNome.trim();
    if (!nomeRaw) {
      showToast("⚠️ Informe o nome do produto.");
      return;
    }

    const payload: Omit<Produto, "id" | "createdAt" | "updatedAt"> = {
      nome: nomeRaw,
      marca: fMarca.trim() || undefined,
      volumeMl: toNum(fVolume) || undefined,
      categoria: fCat,
      precoCompra: Math.max(0, toNum(fCompra)),
      precoVenda: Math.max(0, toNum(fVenda)),
      estoque: Math.max(0, Math.floor(toNum(fEstoque))),
      ativo: fAtivo,
      observacoes: fObs?.trim() ? fObs.trim() : undefined,
    };

    setItems((prev) => {
      let next: Produto[] = [];

      if (openId === "NEW") {
        const created: Produto = {
          id: uid(),
          ...payload,
          nome: dedupeName(payload.nome),
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        next = [created, ...prev];
        showToast("✅ Produto criado!");
      } else if (openId) {
        next = prev.map((p) => {
          if (p.id !== openId) return p;
          return {
            ...p,
            ...payload,
            nome: dedupeName(payload.nome, p.id),
            updatedAt: nowISO(),
          };
        });
        showToast("✅ Produto atualizado!");
      } else {
        return prev;
      }

      writeStorage(next);
      return next;
    });

    closeModal();
  }

  function remove() {
    if (!openItem) return;
    const ok = window.confirm(`Excluir "${openItem.nome}"? (não dá para desfazer)`);
    if (!ok) return;

    setItems((prev) => {
      const next = prev.filter((p) => p.id !== openItem.id);
      writeStorage(next);
      return next;
    });

    showToast("🗑️ Produto excluído!");
    closeModal();
  }

  function duplicateProduct(id: string) {
    const p = items.find((x) => x.id === id);
    if (!p) return;

    const copy: Produto = {
      ...p,
      id: uid(),
      nome: dedupeName(p.nome),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    const next = [copy, ...items];
    setItems(next);
    writeStorage(next);
    showToast("📌 Produto duplicado!");
  }

  function adjustEstoque(id: string, delta: number) {
    setItems((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const atual = Number(p.estoque) || 0;
        const novo = Math.max(0, atual + delta);
        return { ...p, estoque: novo, updatedAt: nowISO() };
      });
      writeStorage(next);
      return next;
    });
  }

  function toggleActive(id: string) {
    setItems((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        return { ...p, ativo: !(p.ativo ?? true), updatedAt: nowISO() };
      });
      writeStorage(next);
      return next;
    });
  }

  // export json
  function exportJSON() {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `maison_noor_produtos_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showToast("⬇️ Exportado!");
  }

  // import json (merge por id; se id repetir, mantém o mais novo por updatedAt)
  function importJSON(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result || "");
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error("Arquivo inválido");

        const incoming = (parsed as any[])
          .filter(Boolean)
          .map((x) => ({
            id: String(x.id || uid()),
            nome: String(x.nome || "").trim(),
            marca: x.marca ? String(x.marca) : undefined,
            volumeMl: typeof x.volumeMl === "number" ? x.volumeMl : Number(x.volumeMl) || undefined,
            categoria:
              x.categoria === "masculino" || x.categoria === "feminino" || x.categoria === "unissex"
                ? x.categoria
                : undefined,
            precoCompra: Number(x.precoCompra) || 0,
            precoVenda: Number(x.precoVenda) || 0,
            estoque: Math.max(0, Math.floor(Number(x.estoque) || 0)),
            ativo: x.ativo !== false,
            createdAt: x.createdAt ? String(x.createdAt) : nowISO(),
            updatedAt: x.updatedAt ? String(x.updatedAt) : nowISO(),
            observacoes: x.observacoes ? String(x.observacoes) : undefined,
          }))
          .filter((p) => p.nome);

        const map = new Map<string, Produto>();
        for (const p of items) map.set(p.id, p);

        for (const p of incoming) {
          const current = map.get(p.id);
          if (!current) {
            map.set(p.id, { ...p, nome: dedupeName(p.nome) });
          } else {
            const keepIncoming = (p.updatedAt || "") > (current.updatedAt || "");
            map.set(p.id, keepIncoming ? { ...p, nome: dedupeName(p.nome, p.id) } : current);
          }
        }

        const next = Array.from(map.values());
        setItems(next);
        writeStorage(next);
        showToast("✅ Importado com sucesso!");
      } catch {
        showToast("⚠️ Não consegui importar. Verifique o arquivo JSON.");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  // ESC fecha modal | Ctrl+Enter salva
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
      if (openId && (e.ctrlKey || e.metaKey) && e.key === "Enter") save();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, fNome, fMarca, fVolume, fCat, fCompra, fVenda, fEstoque, fAtivo, fObs]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    const base = items.filter((p) => {
      if (onlyActive && p.ativo === false) return false;
      if (onlySemEstoque && (Number(p.estoque) || 0) > 0) return false;
      if (cat !== "todas" && p.categoria !== cat) return false;
      if (!qq) return true;
      const hay = `${p.nome} ${p.marca || ""} ${p.volumeMl || ""}`.toLowerCase();
      return hay.includes(qq);
    });

    if (sortBy === "nome") return base.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    if (sortBy === "estoque") return base.sort((a, b) => (Number(b.estoque) || 0) - (Number(a.estoque) || 0));
    if (sortBy === "preco") return base.sort((a, b) => (Number(b.precoVenda) || 0) - (Number(a.precoVenda) || 0));
    return base.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }, [items, q, cat, onlyActive, onlySemEstoque, sortBy]);

  const totals = useMemo(() => {
    const total = filtered.length;
    const ativos = filtered.filter((p) => p.ativo !== false).length;
    const semEstoque = filtered.filter((p) => (Number(p.estoque) || 0) <= 0).length;
    const estoqueTotal = filtered.reduce((acc, p) => acc + (Number(p.estoque) || 0), 0);
    const valorEstoqueVenda = filtered.reduce(
      (acc, p) => acc + (Number(p.precoVenda) || 0) * (Number(p.estoque) || 0),
      0
    );
    const valorEstoqueCompra = filtered.reduce(
      (acc, p) => acc + (Number(p.precoCompra) || 0) * (Number(p.estoque) || 0),
      0
    );
    const margemEstimada = Math.max(0, valorEstoqueVenda - valorEstoqueCompra);
    return { total, ativos, semEstoque, estoqueTotal, valorEstoqueVenda, valorEstoqueCompra, margemEstimada };
  }, [filtered]);

  return (
    <main className="page">
      <header className="head">
        <div>
          <div className="kicker">Maison Noor</div>
          <h1 className="title">CRM • Produtos</h1>
          <p className="sub">Cadastre e controle catálogo + estoque (localStorage).</p>
        </div>

        <div className="headRight">
          <button className="btn" onClick={openNew} type="button">
            + Novo
          </button>
          <button className="btn" onClick={refresh} type="button">
            Atualizar
          </button>
          <button className="btn" onClick={exportJSON} type="button">
            Exportar
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()} type="button">
            Importar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJSON(f);
            }}
          />
        </div>
      </header>

      {toast ? <div className="toast">{toast}</div> : null}

      <section className="toolbar">
        <div className="field">
          <label>Busca</label>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex: Afeef, Lattafa..." />
        </div>

        <div className="field">
          <label>Categoria</label>
          <select className="input" value={cat} onChange={(e) => setCat(e.target.value as any)}>
            <option value="todas">Todas</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
            <option value="unissex">Unissex</option>
          </select>
        </div>

        <div className="field">
          <label>Ordenar</label>
          <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="recentes">Mais recentes</option>
            <option value="nome">Nome (A→Z)</option>
            <option value="estoque">Estoque (maior)</option>
            <option value="preco">Preço venda (maior)</option>
          </select>
        </div>

        <label className="check">
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
          <span>Somente ativos</span>
        </label>

        <label className="check">
          <input type="checkbox" checked={onlySemEstoque} onChange={(e) => setOnlySemEstoque(e.target.checked)} />
          <span>Somente sem estoque</span>
        </label>
      </section>

      <section className="summary">
        <div className="sumCard">
          <div className="sumLabel">Produtos no filtro</div>
          <div className="sumValue">{totals.total}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Ativos</div>
          <div className="sumValue">{totals.ativos}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Sem estoque</div>
          <div className="sumValue">{totals.semEstoque}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Estoque total (unid.)</div>
          <div className="sumValue">{totals.estoqueTotal}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Valor estoque (venda)</div>
          <div className="sumValue">{formatBRL(totals.valorEstoqueVenda)}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Margem estimada (venda - compra)</div>
          <div className="sumValue">{formatBRL(totals.margemEstimada)}</div>
        </div>
        <div className="sumHint">
          Clique no card para editar. <b>ESC</b> fecha. <b>Ctrl+Enter</b> salva no modal. <br />
          Dica: use <b>+</b> e <b>−</b> no card para ajustar estoque rápido.
        </div>
      </section>

      <section className="grid">
        {filtered.map((p) => (
          <div key={p.id} className="cardWrap">
            <button className="card" onClick={() => openEdit(p.id)} type="button">
              <div className="cardTop">
                <div className="name">{p.nome}</div>
                <div className="price">{formatBRL(Number(p.precoVenda || 0))}</div>
              </div>

              <div className="metaRow">
                <span className="chip">{p.categoria || "—"}</span>
                {p.volumeMl ? <span className="chipGhost">{p.volumeMl}ml</span> : null}
                {p.marca ? <span className="meta">{p.marca}</span> : <span className="meta">—</span>}
              </div>

              <div className="foot">
                <span>
                  Estoque: <b>{p.estoque ?? 0}</b>
                </span>
                <span className={`pill ${p.ativo ? "on" : "off"}`}>{p.ativo ? "Ativo" : "Inativo"}</span>
              </div>
            </button>

            <div className="cardActions">
              <button
                className="mini"
                onClick={(e) => {
                  e.stopPropagation();
                  adjustEstoque(p.id, -1);
                }}
                type="button"
                title="Baixar 1"
              >
                −1
              </button>
              <button
                className="mini"
                onClick={(e) => {
                  e.stopPropagation();
                  adjustEstoque(p.id, +1);
                }}
                type="button"
                title="Somar 1"
              >
                +1
              </button>
              <button
                className="mini"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleActive(p.id);
                }}
                type="button"
                title="Ativar/Inativar"
              >
                {p.ativo === false ? "Ativar" : "Inativar"}
              </button>
              <button
                className="mini"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateProduct(p.id);
                }}
                type="button"
                title="Duplicar produto"
              >
                Duplicar
              </button>
            </div>
          </div>
        ))}

        {!filtered.length ? <div className="empty">Nenhum produto cadastrado. Clique em “+ Novo”.</div> : null}
      </section>

      {/* MODAL */}
      {openId ? (
        <div className="modalOverlay" onMouseDown={closeModal} role="presentation">
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div>
                <div className="modalKicker">{openId === "NEW" ? "Novo produto" : "Editar produto"}</div>
                <div className="modalTitle">{openId === "NEW" ? "Cadastro" : openItem?.nome}</div>
                {openId !== "NEW" ? (
                  <div className="modalSub">
                    ID: <span className="mono">{openItem?.id}</span>
                  </div>
                ) : null}
              </div>

              <button className="btnX" onClick={closeModal} type="button" aria-label="Fechar">
                ✕
              </button>
            </div>

            <div className="modalGrid">
              <div className="field">
                <label>Nome*</label>
                <input className="input" value={fNome} onChange={(e) => setFNome(e.target.value)} />
              </div>

              <div className="field">
                <label>Marca</label>
                <input className="input" value={fMarca} onChange={(e) => setFMarca(e.target.value)} />
              </div>

              <div className="field">
                <label>Categoria</label>
                <select className="input" value={fCat} onChange={(e) => setFCat(e.target.value as any)}>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="unissex">Unissex</option>
                </select>
              </div>

              <div className="field">
                <label>Volume (ml)</label>
                <input className="input" value={fVolume} onChange={(e) => setFVolume(e.target.value)} />
              </div>

              <div className="field">
                <label>Preço compra (R$)</label>
                <input className="input" value={fCompra} onChange={(e) => setFCompra(e.target.value)} />
              </div>

              <div className="field">
                <label>Preço venda (R$)</label>
                <input className="input" value={fVenda} onChange={(e) => setFVenda(e.target.value)} />
              </div>

              <div className="field">
                <label>Estoque (unid.)</label>
                <input className="input" value={fEstoque} onChange={(e) => setFEstoque(e.target.value)} />
              </div>

              <label className="check">
                <input type="checkbox" checked={fAtivo} onChange={(e) => setFAtivo(e.target.checked)} />
                <span>Ativo</span>
              </label>

              <div className="field wide">
                <label>Observações</label>
                <textarea className="textarea" value={fObs} onChange={(e) => setFObs(e.target.value)} />
              </div>
            </div>

            <div className="modalActions">
              <button className="btnSmallPrimary" onClick={save} type="button">
                Salvar
              </button>

              <div className="spacer" />

              {openId !== "NEW" ? (
                <button className="btnDanger" onClick={remove} type="button">
                  Excluir
                </button>
              ) : null}
            </div>

            {openId !== "NEW" && openItem ? (
              <div className="modalFoot">
                Criado: {new Date(openItem.createdAt).toLocaleString("pt-BR")} • Atualizado:{" "}
                {new Date(openItem.updatedAt).toLocaleString("pt-BR")}
              </div>
            ) : null}
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
          font-size: 36px;
          letter-spacing: 0.01em;
        }
        .sub {
          margin: 10px 0 0;
          opacity: 0.8;
          font-size: 18px;
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
          font-weight: 900;
          color: #f2f2f2;
        }

        .toast {
          margin-top: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.08);
          font-weight: 800;
          max-width: 980px;
        }

        .toolbar {
          margin-top: 14px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: end;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: rgba(0, 0, 0, 0.14);
        }

        .field {
          display: grid;
          gap: 6px;
          min-width: 220px;
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

        .check {
          display: inline-flex;
          gap: 10px;
          align-items: center;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: rgba(200, 162, 106, 0.06);
          font-weight: 900;
          cursor: pointer;
          user-select: none;
          height: 48px;
        }

        .summary {
          margin-top: 14px;
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          align-items: start;
        }
        @media (min-width: 900px) {
          .summary {
            grid-template-columns: repeat(3, minmax(0, 1fr)) 1.2fr;
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
          opacity: 0.85;
          line-height: 1.35;
        }

        /* ✅ menos poluído: 1 coluna no mobile, 2 no desktop, 3 só em telas bem grandes */
        .grid {
          margin-top: 14px;
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
        @media (min-width: 980px) {
          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1400px) {
          .grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .cardWrap {
          display: grid;
          gap: 8px;
        }

        /* 🔥 CORREÇÃO: nome/infos não somem (button herdava cor escura) */
        .card {
          text-align: left;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.18);
          padding: 14px;
          cursor: pointer;

          color: #f2f2f2; /* <- garante texto visível no card */
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }
        .name {
          font-weight: 900;
          font-size: 16px;
          line-height: 1.25;

          color: #f2f2f2;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
        }
        .price {
          font-weight: 900;
          color: rgba(200, 162, 106, 0.95);
          white-space: nowrap;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
        }

        .metaRow {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .meta {
          font-size: 12px;
          opacity: 0.85;
        }
        .chip {
          font-size: 11px;
          padding: 4px 9px;
          border-radius: 999px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.06);
          white-space: nowrap;
          color: #f2f2f2;
          text-transform: capitalize;
          font-weight: 900;
        }
        .chipGhost {
          font-size: 11px;
          padding: 4px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          white-space: nowrap;
          color: #f2f2f2;
          font-weight: 900;
        }

        .foot {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          font-size: 12px;
          opacity: 0.95;
        }

        .pill {
          font-size: 11px;
          padding: 4px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          font-weight: 900;
        }
        .pill.on {
          border-color: rgba(200, 162, 106, 0.25);
          background: rgba(200, 162, 106, 0.08);
          color: rgba(200, 162, 106, 0.95);
        }
        .pill.off {
          border-color: rgba(255, 90, 90, 0.25);
          background: rgba(255, 90, 90, 0.08);
          color: rgba(255, 170, 170, 0.95);
        }

        .cardActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .mini {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.06);
          cursor: pointer;
          font-weight: 900;
          color: #f2f2f2;
          font-size: 12px;
        }

        .empty {
          margin-top: 12px;
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
          color: #f2f2f2;
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
        .wide {
          grid-column: 1 / -1;
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

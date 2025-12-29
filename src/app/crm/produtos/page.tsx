"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// 🔌 Firebase
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";

type Categoria = "masculino" | "feminino" | "unissex";

type Produto = {
  id: string;
  nome: string;
  marca?: string;
  volumeMl?: number;
  categoria?: Categoria;
  precoCompra?: number;
  precoVenda?: number;
  estoque?: number; // estoque físico
  reservado?: number; // reservado para pedidos (ainda não faturados)
  ativo?: boolean;
  createdAt: string;
  updatedAt: string;
  observacoes?: string;
};

const STORAGE_KEY = "maison_noor_crm_produtos_v1";

function nowISO(): string {
  return new Date().toISOString();
}

function uid(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatBRL(n: number): string {
  return Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function canUseStorage(): boolean {
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

function writeStorage(items: Produto[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function norm(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

// 🔧 remove qualquer campo undefined antes de enviar pro Firestore
function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

const productsCollection = collection(db, "products");

export default function ProdutosPage() {
  const [items, setItems] = useState<Produto[]>([]);
  const [toast, setToast] = useState("");

  // filtros
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"todas" | Categoria>("todas");
  const [onlyActive, setOnlyActive] = useState(true);
  const [onlySemEstoque, setOnlySemEstoque] = useState(false);
  const [sortBy, setSortBy] = useState<
    "recentes" | "nome" | "estoque" | "preco"
  >("recentes");

  // modal
  const [openId, setOpenId] = useState<string | null>(null);
  const openItem = useMemo(
    () => items.find((p) => p.id === openId) || null,
    [items, openId]
  );

  // form
  const [fNome, setFNome] = useState("");
  const [fMarca, setFMarca] = useState("");
  const [fVolume, setFVolume] = useState<string>("100");
  const [fCat, setFCat] = useState<Categoria>("unissex");
  const [fCompra, setFCompra] = useState<string>("0");
  const [fVenda, setFVenda] = useState<string>("0");
  const [fEstoque, setFEstoque] = useState<string>("0");
  const [fAtivo, setFAtivo] = useState<boolean>(true);
  const [fObs, setFObs] = useState("");

  // import/export
  const fileRef = useRef<HTMLInputElement | null>(null);

  function showToast(msg: string, ms = 1600): void {
    setToast(msg);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setToast(""), ms);
    }
  }

  // 🔁 Carrega do Firestore (com fallback pro backup local)
  async function loadFromFirebase(showMsg = false) {
    try {
      const snap = await getDocs(
        query(productsCollection, orderBy("updatedAt", "desc"))
      );
      const arr: Produto[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        arr.push({
          id: d.id,
          nome: data.nome ?? "",
          marca: data.marca,
          volumeMl: data.volumeMl,
          categoria: data.categoria,
          precoCompra: data.precoCompra,
          precoVenda: data.precoVenda,
          estoque: data.estoque,
          reservado: data.reservado ?? 0,
          ativo: data.ativo ?? true,
          createdAt: data.createdAt ?? nowISO(),
          updatedAt: data.updatedAt ?? nowISO(),
          observacoes: data.observacoes,
        });
      });
      setItems(arr);
      writeStorage(arr);
      if (showMsg) showToast("🔄 Atualizado do servidor!");
    } catch (err) {
      console.error("Erro Firestore:", err);
      const backup = readStorage();
      if (backup.length) {
        setItems(backup);
        showToast("⚠️ Erro no servidor. Usando backup local.");
      } else {
        showToast("⚠️ Erro ao carregar produtos.");
      }
    }
  }

  useEffect(() => {
    loadFromFirebase(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh(): void {
    loadFromFirebase(true);
  }

  function openNew(): void {
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

  function openEdit(id: string): void {
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
    setFAtivo(p.ativo !== false);
    setFObs(p.observacoes || "");
  }

  function closeModal(): void {
    setOpenId(null);
  }

  function toNum(v: string): number {
    const n = Number(String(v || "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function dedupeName(nome: string, exceptId?: string): string {
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

  // 💾 SALVAR (CREATE/UPDATE) NO FIRESTORE
  async function save() {
    const nomeRaw = fNome.trim();
    if (!nomeRaw) {
      showToast("⚠️ Informe o nome do produto.");
      return;
    }

    const basePayload = {
      nome: nomeRaw,
      marca: fMarca.trim() || undefined,
      volumeMl: toNum(fVolume) || undefined,
      categoria: fCat as Categoria,
      precoCompra: Math.max(0, toNum(fCompra)),
      precoVenda: Math.max(0, toNum(fVenda)),
      estoque: Math.max(0, Math.floor(toNum(fEstoque))),
      ativo: fAtivo,
      // 🔑 nunca manda undefined
      observacoes: fObs?.trim() ? fObs.trim() : undefined,
      reservado: openId === "NEW" ? 0 : openItem?.reservado ?? 0,
      createdAt: openId === "NEW" ? nowISO() : openItem?.createdAt ?? nowISO(),
      updatedAt: nowISO(),
    };

    try {
      if (openId === "NEW") {
        const payload = cleanUndefined({
          ...basePayload,
          nome: dedupeName(basePayload.nome),
        });
        await addDoc(productsCollection, payload);
        showToast("✅ Produto criado no Firebase!");
      } else if (openId) {
        const payload = cleanUndefined({
          ...basePayload,
          nome: dedupeName(basePayload.nome, openId),
        });
        await updateDoc(doc(db, "products", openId), payload);
        showToast("✅ Produto atualizado no Firebase!");
      }

      closeModal();
      await loadFromFirebase(false);
    } catch (err) {
      console.error(err);
      showToast("❌ Erro ao salvar no servidor");
    }
  }

  // 🗑️ REMOVER
  async function remove() {
    if (!openItem) return;
    const ok =
      typeof window === "undefined"
        ? true
        : window.confirm(`Excluir "${openItem.nome}"? (não dá para desfazer)`);
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "products", openItem.id));
      showToast("🗑️ Produto excluído!");
      closeModal();
      await loadFromFirebase(false);
    } catch (err) {
      console.error(err);
      showToast("⚠️ Erro ao excluir");
    }
  }

  // 📌 DUPLICAR
  async function duplicateProduct(id: string): Promise<void> {
    const p = items.find((x) => x.id === id);
    if (!p) return;

    const copyPayload = {
      ...p,
      nome: dedupeName(p.nome),
      reservado: p.reservado ?? 0,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    // não salvar o id dentro do doc
    const { id: _, ...data } = copyPayload;

    try {
      await addDoc(productsCollection, cleanUndefined(data));
      showToast("📌 Produto duplicado!");
      await loadFromFirebase(false);
    } catch (err) {
      console.error(err);
      showToast("⚠️ Erro ao duplicar");
    }
  }

  // 🔻 / 🔺 AJUSTE DE ESTOQUE
  async function adjustEstoque(id: string, delta: number): Promise<void> {
    const p = items.find((x) => x.id === id);
    if (!p) return;
    const atual = Number(p.estoque) || 0;
    const novo = Math.max(0, atual + delta);

    try {
      await updateDoc(doc(db, "products", id), {
        estoque: novo,
        updatedAt: nowISO(),
      });
      await loadFromFirebase(false);
    } catch (err) {
      console.error(err);
      showToast("⚠️ Erro ao ajustar estoque");
    }
  }

  // ON/OFF
  async function toggleActive(id: string): Promise<void> {
    const p = items.find((x) => x.id === id);
    if (!p) return;

    try {
      await updateDoc(doc(db, "products", id), {
        ativo: !(p.ativo ?? true),
        updatedAt: nowISO(),
      });
      await loadFromFirebase(false);
    } catch (err) {
      console.error(err);
      showToast("⚠️ Erro ao alterar status");
    }
  }

  // export json (usa o estado atual)
  function exportJSON(): void {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `maison_noor_produtos_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showToast("⬇️ Exportado!");
  }

  // import json -> grava no Firestore
  function importJSON(file: File): void {
    const reader = new FileReader();
    reader.onload = async () => {
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
            volumeMl:
              typeof x.volumeMl === "number"
                ? x.volumeMl
                : Number(x.volumeMl) || undefined,
            categoria:
              x.categoria === "masculino" ||
              x.categoria === "feminino" ||
              x.categoria === "unissex"
                ? (x.categoria as Categoria)
                : undefined,
            precoCompra: Number(x.precoCompra) || 0,
            precoVenda: Number(x.precoVenda) || 0,
            estoque: Math.max(0, Math.floor(Number(x.estoque) || 0)),
            reservado: Math.max(0, Math.floor(Number(x.reservado) || 0)),
            ativo: x.ativo !== false,
            createdAt: x.createdAt ? String(x.createdAt) : nowISO(),
            updatedAt: x.updatedAt ? String(x.updatedAt) : nowISO(),
            observacoes: x.observacoes ? String(x.observacoes) : undefined,
          }))
          .filter((p) => p.nome);

        // salva/atualiza cada produto no Firestore
        for (const p of incoming) {
          const { id, ...data } = p;
          await setDoc(doc(db, "products", id), cleanUndefined(data), {
            merge: true,
          });
        }

        await loadFromFirebase(false);
        showToast("✅ Importado com sucesso!");
      } catch (err) {
        console.error(err);
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
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    openId,
    fNome,
    fMarca,
    fVolume,
    fCat,
    fCompra,
    fVenda,
    fEstoque,
    fAtivo,
    fObs,
  ]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    const base = items.filter((p) => {
      if (onlyActive && p.ativo === false) return false;
      if (onlySemEstoque) {
        const est = Number(p.estoque) || 0;
        const res = Number(p.reservado) || 0;
        const disp = Math.max(0, est - res);
        if (disp > 0) return false;
      }
      if (cat !== "todas" && p.categoria !== cat) return false;
      if (!qq) return true;
      const hay = `${p.nome} ${p.marca || ""} ${p.volumeMl || ""}`.toLowerCase();
      return hay.includes(qq);
    });

    if (sortBy === "nome") {
      return base.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    }
    if (sortBy === "estoque") {
      return base.sort(
        (a, b) => (Number(b.estoque) || 0) - (Number(a.estoque) || 0)
      );
    }
    if (sortBy === "preco") {
      return base.sort(
        (a, b) => (Number(b.precoVenda) || 0) - (Number(a.precoVenda) || 0)
      );
    }
    return base.sort((a, b) =>
      (b.updatedAt || "").localeCompare(a.updatedAt || "")
    );
  }, [items, q, cat, onlyActive, onlySemEstoque, sortBy]);

  const totals = useMemo(() => {
    const total = filtered.length;
    let ativos = 0;
    let semEstoqueDisp = 0;
    let estoqueFisico = 0;
    let totalReservado = 0;
    let totalDisponivel = 0;
    let valorEstoqueVenda = 0;
    let valorEstoqueCompra = 0;

    for (const p of filtered) {
      if (p.ativo !== false) ativos++;
      const est = Number(p.estoque) || 0;
      const res = Number(p.reservado) || 0;
      const disp = Math.max(0, est - res);
      estoqueFisico += est;
      totalReservado += res;
      totalDisponivel += disp;
      if (disp <= 0) semEstoqueDisp++;
      valorEstoqueVenda += (Number(p.precoVenda) || 0) * est;
      valorEstoqueCompra += (Number(p.precoCompra) || 0) * est;
    }

    const margemEstimada = Math.max(0, valorEstoqueVenda - valorEstoqueCompra);

    return {
      total,
      ativos,
      semEstoqueDisp,
      estoqueFisico,
      totalReservado,
      totalDisponivel,
      valorEstoqueVenda,
      valorEstoqueCompra,
      margemEstimada,
    };
  }, [filtered]);

  return (
    <main className="page">
      <header className="head">
        <div>
          <div className="kicker">Maison Noor</div>
          <h1 className="title">CRM • Produtos</h1>
          <p className="sub">
            Cadastre e controle catálogo + estoque (sincronizado online).
          </p>
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
          <button
            className="btn"
            onClick={() => fileRef.current?.click()}
            type="button"
          >
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
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex: Afeef, Lattafa..."
          />
        </div>

        <div className="field">
          <label>Categoria</label>
          <select
            className="input"
            value={cat}
            onChange={(e) => setCat(e.target.value as "todas" | Categoria)}
          >
            <option value="todas">Todas</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
            <option value="unissex">Unissex</option>
          </select>
        </div>

        <div className="field">
          <label>Ordenar</label>
          <select
            className="input"
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as "recentes" | "nome" | "estoque" | "preco"
              )
            }
          >
            <option value="recentes">Mais recentes</option>
            <option value="nome">Nome (A→Z)</option>
            <option value="estoque">Estoque (maior)</option>
            <option value="preco">Preço venda (maior)</option>
          </select>
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
          />
          <span>Somente ativos</span>
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={onlySemEstoque}
            onChange={(e) => setOnlySemEstoque(e.target.checked)}
          />
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
          <div className="sumLabel">Sem estoque (disponível)</div>
          <div className="sumValue">{totals.semEstoqueDisp}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Estoque físico (unid.)</div>
          <div className="sumValue">{totals.estoqueFisico}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Reservado (unid.)</div>
          <div className="sumValue">{totals.totalReservado}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Disponível (unid.)</div>
          <div className="sumValue">{totals.totalDisponivel}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Valor estoque (venda)</div>
          <div className="sumValue">
            {formatBRL(totals.valorEstoqueVenda)}
          </div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Valor estoque (compra)</div>
          <div className="sumValue">
            {formatBRL(totals.valorEstoqueCompra)}
          </div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Margem estimada (venda - compra)</div>
          <div className="sumValue">
            {formatBRL(totals.margemEstimada)}
          </div>
        </div>
        <div className="sumHint">
          Clique na linha para editar. <b>ESC</b> fecha. <b>Ctrl+Enter</b> salva
          no modal.
          <br />
          Futuro: pedidos vão consumir <b>estoque reservado</b>, e quando pagos
          baixam do <b>estoque físico</b>.
        </div>
      </section>

      {/* TABELA ESTILO ERP */}
      <section className="erpTable">
        <div className="erpInner">
          <div className="erpHeadRow">
            <div className="erpHeadCell main">Produto</div>
            <div className="erpHeadCell">Cat.</div>
            <div className="erpHeadCell">Vol.</div>
            <div className="erpHeadCell">Marca</div>
            <div className="erpHeadCell num">Estoque</div>
            <div className="erpHeadCell num">Reserv.</div>
            <div className="erpHeadCell num">Disp.</div>
            <div className="erpHeadCell num">Preço comp.</div>
            <div className="erpHeadCell num">Preço venda</div>
            <div className="erpHeadCell">Status</div>
            <div className="erpHeadCell actions">Ações</div>
          </div>

          {filtered.map((p) => {
            const est = Number(p.estoque) || 0;
            const res = Number(p.reservado) || 0;
            const disp = Math.max(0, est - res);
            const statusLabel = p.ativo === false ? "Inativo" : "Ativo";

            return (
              <div
                key={p.id}
                className="erpRow"
                onClick={() => openEdit(p.id)}
              >
                <div className="erpCell main">
                  <div className="erpProdName">{p.nome}</div>
                </div>

                <div className="erpCell">
                  <span className="chip">
                    {p.categoria ? p.categoria : "—"}
                  </span>
                </div>

                <div className="erpCell">
                  {p.volumeMl ? (
                    <span className="chipGhost">{p.volumeMl}ml</span>
                  ) : (
                    "—"
                  )}
                </div>

                <div className="erpCell">
                  <span className="meta">{p.marca || "—"}</span>
                </div>

                <div className="erpCell num">{est}</div>
                <div className="erpCell num">{res}</div>
                <div className="erpCell num">{disp}</div>

                <div className="erpCell num">
                  <span className="priceERP priceCompra">
                    {formatBRL(Number(p.precoCompra || 0))}
                  </span>
                </div>

                <div className="erpCell num">
                  <span className="priceERP">
                    {formatBRL(Number(p.precoVenda || 0))}
                  </span>
                </div>

                <div className="erpCell">
                  <span
                    className={`pill ${p.ativo === false ? "off" : "on"}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Ações – não abre modal */}
                <div
                  className="erpCell actionsCell"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="mini"
                    onClick={() => adjustEstoque(p.id, -1)}
                    type="button"
                    title="Baixar 1"
                  >
                    −1
                  </button>
                  <button
                    className="mini"
                    onClick={() => adjustEstoque(p.id, +1)}
                    type="button"
                    title="Somar 1"
                  >
                    +1
                  </button>
                  <button
                    className="mini"
                    onClick={() => toggleActive(p.id)}
                    type="button"
                    title="Ativar/Inativar"
                  >
                    {p.ativo === false ? "Ativar" : "Inativar"}
                  </button>
                  <button
                    className="mini"
                    onClick={() => duplicateProduct(p.id)}
                    type="button"
                    title="Duplicar produto"
                  >
                    Duplicar
                  </button>
                </div>
              </div>
            );
          })}

          {!filtered.length ? (
            <div className="empty">
              Nenhum produto cadastrado. Clique em “+ Novo”.
            </div>
          ) : null}
        </div>
      </section>

      {/* MODAL */}
      {openId ? (
        <div
          className="modalOverlay"
          onMouseDown={closeModal}
          role="presentation"
        >
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div>
                <div className="modalKicker">
                  {openId === "NEW" ? "Novo produto" : "Editar produto"}
                </div>
                <div className="modalTitle">
                  {openId === "NEW" ? "Cadastro" : openItem?.nome}
                </div>
                {openId !== "NEW" ? (
                  <div className="modalSub">
                    ID: <span className="mono">{openItem?.id}</span>
                  </div>
                ) : null}
              </div>

              <button
                className="btnX"
                onClick={closeModal}
                type="button"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="modalGrid">
              <div className="field">
                <label>Nome*</label>
                <input
                  className="input"
                  value={fNome}
                  onChange={(e) => setFNome(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Marca</label>
                <input
                  className="input"
                  value={fMarca}
                  onChange={(e) => setFMarca(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Categoria</label>
                <select
                  className="input"
                  value={fCat}
                  onChange={(e) => setFCat(e.target.value as Categoria)}
                >
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="unissex">Unissex</option>
                </select>
              </div>

              <div className="field">
                <label>Volume (ml)</label>
                <input
                  className="input"
                  value={fVolume}
                  onChange={(e) => setFVolume(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Preço compra (R$)</label>
                <input
                  className="input"
                  value={fCompra}
                  onChange={(e) => setFCompra(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Preço venda (R$)</label>
                <input
                  className="input"
                  value={fVenda}
                  onChange={(e) => setFVenda(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Estoque (unid.)</label>
                <input
                  className="input"
                  value={fEstoque}
                  onChange={(e) => setFEstoque(e.target.value)}
                />
              </div>

              <label className="check">
                <input
                  type="checkbox"
                  checked={fAtivo}
                  onChange={(e) => setFAtivo(e.target.checked)}
                />
                <span>Ativo</span>
              </label>

              <div className="field wide">
                <label>Observações</label>
                <textarea
                  className="textarea"
                  value={fObs}
                  onChange={(e) => setFObs(e.target.value)}
                />
              </div>
            </div>

            <div className="modalActions">
              <button
                className="btnSmallPrimary"
                onClick={save}
                type="button"
              >
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
                Criado:{" "}
                {new Date(openItem.createdAt).toLocaleString("pt-BR")} •
                Atualizado:{" "}
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

        /* CABEÇALHO NO PADRÃO FINANCEIRO / KANBAN */
        .kicker {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(200, 162, 106, 0.95);
          font-weight: 900;
        }
        .title {
          margin: 4px 0 0;
          font-size: 26px;
          letter-spacing: 0.01em;
          font-weight: 900;
        }
        .sub {
          margin: 4px 0 0;
          opacity: 0.78;
          font-size: 14px;
          line-height: 1.4;
          max-width: 720px;
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
        @media (min-width: 1100px) {
          .summary {
            grid-template-columns: repeat(4, minmax(0, 1fr));
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

        /* ===== TABELA ERP ===== */
        .erpTable {
          margin-top: 16px;
          border-radius: 18px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(0, 0, 0, 0.18);
          overflow-x: auto;
        }
        .erpInner {
          min-width: 1200px;
        }

        .erpHeadRow,
        .erpRow {
          display: grid;
          grid-template-columns:
            minmax(180px, 2fr)
            0.9fr
            0.9fr
            1.2fr
            0.8fr
            0.9fr
            0.9fr
            1.1fr
            1.1fr
            0.9fr
            1.8fr;
          align-items: center;
        }

        .erpHeadRow {
          padding: 10px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          opacity: 0.8;
        }
        .erpHeadCell {
          padding: 0 4px;
        }
        .erpHeadCell.num {
          text-align: right;
        }
        .erpHeadCell.actions {
          text-align: right;
        }

        .erpRow {
          padding: 8px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 13px;
          cursor: pointer;
        }
        .erpRow:last-child {
          border-bottom: none;
        }
        .erpRow:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .erpCell {
          padding: 0 4px;
          text-align: left;
          cursor: pointer;
        }
        .erpCell.num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .erpCell.main {
          text-align: left;
        }

        .erpProdName {
          font-weight: 900;
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
        .priceERP {
          font-weight: 900;
          color: rgba(200, 162, 106, 0.95);
          white-space: nowrap;
        }
        .priceERP.priceCompra {
          opacity: 0.8;
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

        .actionsCell {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
          flex-wrap: wrap;
          cursor: default;
        }

        .mini {
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.06);
          cursor: pointer;
          font-weight: 900;
          color: #f2f2f2;
          font-size: 12px;
        }

        .empty {
          padding: 14px 16px;
          border-top: 1px dashed rgba(255, 255, 255, 0.1);
          opacity: 0.7;
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
          background: linear-gradient(
            180deg,
            rgba(200, 162, 106, 0.18),
            rgba(200, 162, 106, 0.08)
          );
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
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
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

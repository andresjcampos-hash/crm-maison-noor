"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/services/firebase"; // mantém como está no seu projeto
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
} from "firebase/firestore";

type TipoLanc = "receita" | "despesa";
type StatusLanc = "pago" | "pendente";
type FormaPag =
  | "dinheiro"
  | "pix"
  | "credito"
  | "debito"
  | "boleto"
  | "transferencia"
  | "outros";

type Lancamento = {
  id: string;
  data: string; // ISO
  competencia: string; // AAAA-MM
  tipo: TipoLanc;
  descricao: string;
  categoria?: string;
  forma: FormaPag;
  valor: number;
  status: StatusLanc;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
  origemPedidoId?: string;
  clienteNome?: string;
};

const STORAGE_KEY = "maison_noor_crm_financeiro_v1";

// ✅ Caminho correto no Firestore: financeiro/default/lancamentos/{id}
const FIRESTORE_ROOT = "financeiro";
const FIRESTORE_DOC = "default";
const FIRESTORE_SUBCOL = "lancamentos";

// ✅ Para EXIBIÇÃO no UI (pode ter "/")
const FIRESTORE_COLLECTION_PATH = `${FIRESTORE_ROOT}/${FIRESTORE_DOC}/${FIRESTORE_SUBCOL}`;

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

function readStorage(): Lancamento[] {
  try {
    if (!canUseStorage()) return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Lancamento[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: Lancamento[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function toCompetencia(iso: string): string {
  if (!iso) return "";
  return iso.slice(0, 7);
}

// ✅ Corrige bug de fuso ao salvar data do input date ("YYYY-MM-DD")
function isoFromDateInput(dateStr: string): string {
  // meio-dia UTC evita “virar” a data por timezone
  return `${dateStr}T12:00:00.000Z`;
}

// ✅ Refs corretas (evita errar o path)
function lancamentosColRef() {
  return collection(db, FIRESTORE_ROOT, FIRESTORE_DOC, FIRESTORE_SUBCOL);
}
function lancamentoDocRef(id: string) {
  return doc(db, FIRESTORE_ROOT, FIRESTORE_DOC, FIRESTORE_SUBCOL, id);
}

// Firestore helpers
function tsToISO(value: any): string {
  if (!value) return nowISO();
  if (typeof value === "string") return value;
  if (value && typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return nowISO();
    }
  }
  return nowISO();
}

async function fetchFromFirestore(): Promise<Lancamento[]> {
  try {
    // ✅ ordena por "data" (string ISO) desc
    const q = query(lancamentosColRef(), orderBy("data", "desc"));
    const snap = await getDocs(q);

    const list: Lancamento[] = snap.docs
      .map((docSnap) => {
        const d = docSnap.data() as any;

        const dataIso = tsToISO(d.data);
        const competencia = d.competencia || toCompetencia(dataIso);

        const tipo: TipoLanc = d.tipo === "despesa" ? "despesa" : "receita";
        const status: StatusLanc =
          d.status === "pendente" ? "pendente" : "pago";

        const formaRaw = d.forma;
        const forma: FormaPag =
          formaRaw === "dinheiro" ||
          formaRaw === "pix" ||
          formaRaw === "credito" ||
          formaRaw === "debito" ||
          formaRaw === "boleto" ||
          formaRaw === "transferencia"
            ? formaRaw
            : "outros";

        const origemPedidoId = d.origemPedidoId
          ? String(d.origemPedidoId)
          : undefined;
        const clienteNome = d.clienteNome ? String(d.clienteNome) : undefined;

        const lanc: Lancamento = {
          id: docSnap.id,
          data: dataIso,
          competencia,
          tipo,
          descricao: String(d.descricao || "").trim(),
          categoria: d.categoria ? String(d.categoria) : undefined,
          forma,
          valor: Number(d.valor) || 0,
          status,
          observacoes: d.observacoes ? String(d.observacoes) : undefined,
          origemPedidoId,
          clienteNome,
          createdAt: tsToISO(d.createdAt),
          updatedAt: tsToISO(d.updatedAt),
        };
        return lanc;
      })
      .filter((l) => l.descricao);

    console.log(
      "[Financeiro] fetchFromFirestore ->",
      list.length,
      "documentos | path:",
      FIRESTORE_COLLECTION_PATH
    );

    return list;
  } catch (e: any) {
    console.error("🚨 [Financeiro] Erro ao carregar do Firestore", {
      code: e?.code,
      message: e?.message,
      name: e?.name,
    });
    return [];
  }
}

// ✅ garante ID, remove undefined e normaliza campos antes de salvar
async function upsertInFirestore(l: Lancamento): Promise<boolean> {
  try {
    const id = l.id || uid();
    const ref = lancamentoDocRef(id);

    // Normaliza data primeiro (pra competencia ficar 100% certa)
    const normalizedData = l.data || nowISO();

    const payload: any = {
      ...l,
      id,
      valor: Number(l.valor || 0),
      data: normalizedData,
      competencia: l.competencia || toCompetencia(normalizedData),
      createdAt: l.createdAt || nowISO(),
      updatedAt: nowISO(),
    };

    // Firestore não aceita undefined
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    console.log(
      "[Financeiro] setDoc ->",
      `${FIRESTORE_COLLECTION_PATH}/${id}`
    );
    console.log("[Financeiro] payload:", payload);

    await setDoc(ref, payload, { merge: true });

    console.log("[Financeiro] setDoc concluído ✅");
    return true;
  } catch (e: any) {
    console.error("🚨 [Financeiro] ERRO setDoc", {
      code: e?.code,
      message: e?.message,
      name: e?.name,
    });
    return false;
  }
}

async function deleteFromFirestore(id: string): Promise<boolean> {
  try {
    console.log(
      "[Financeiro] deleteFromFirestore ->",
      `${FIRESTORE_COLLECTION_PATH}/${id}`
    );

    await deleteDoc(lancamentoDocRef(id));

    console.log("[Financeiro] deleteDoc concluído ✅");
    return true;
  } catch (e: any) {
    console.error("🚨 [Financeiro] Erro ao excluir do Firestore", {
      code: e?.code,
      message: e?.message,
      name: e?.name,
    });
    return false;
  }
}

async function syncListToFirestore(list: Lancamento[]): Promise<void> {
  try {
    await Promise.all(list.map((l) => upsertInFirestore(l)));
  } catch (e: any) {
    console.error("🚨 [Financeiro] Erro ao sincronizar lista no Firestore", {
      code: e?.code,
      message: e?.message,
      name: e?.name,
    });
  }
}

export default function FinanceiroPage() {
  const [items, setItems] = useState<Lancamento[]>([]);
  const [toast, setToast] = useState("");

  const [q, setQ] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todos" | TipoLanc>("todos");
  const [statusFilter, setStatusFilter] =
    useState<"todos" | StatusLanc>("todos");
  const [competenciaFilter, setCompetenciaFilter] = useState<string>("");

  const [openId, setOpenId] = useState<string | null>(null);
  const openItem = useMemo(
    () => items.find((l) => l.id === openId) || null,
    [items, openId]
  );

  const [fData, setFData] = useState<string>("");
  const [fTipo, setFTipo] = useState<TipoLanc>("receita");
  const [fDescricao, setFDescricao] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fForma, setFForma] = useState<FormaPag>("pix");
  const [fValor, setFValor] = useState<string>("0");
  const [fStatus, setFStatus] = useState<StatusLanc>("pago");
  const [fObs, setFObs] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  // INIT – Firestore primeiro, localStorage só se Firestore estiver vazio
  useEffect(() => {
    async function init() {
      const fromFs = await fetchFromFirestore();

      if (fromFs.length) {
        writeStorage(fromFs);
        setItems(fromFs);
      } else {
        const local = readStorage();
        setItems(local);
      }

      const hoje = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const compDefault = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}`;
      setCompetenciaFilter((prev) => prev || compDefault);
    }

    void init();
  }, []);

  function showToast(msg: string, ms = 2000): void {
    setToast(msg);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setToast(""), ms);
    }
  }

  async function refresh(): Promise<void> {
    showToast("⏳ Atualizando...");
    const fromFs = await fetchFromFirestore();

    if (fromFs.length) {
      writeStorage(fromFs);
      setItems(fromFs);
    } else {
      const local = readStorage();
      setItems(local);
    }

    showToast("🔄 Atualizado!");
  }

  function openNew(): void {
    setOpenId("NEW");

    const hoje = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(
      hoje.getDate()
    )}`;

    setFData(iso);
    setFTipo("receita");
    setFDescricao("");
    setFCategoria("");
    setFForma("pix");
    setFValor("0");
    setFStatus("pago");
    setFObs("");
  }

  function openEdit(id: string): void {
    const l = items.find((x) => x.id === id);
    if (!l) return;
    setOpenId(id);

    setFData(l.data.slice(0, 10));
    setFTipo(l.tipo);
    setFDescricao(l.descricao);
    setFCategoria(l.categoria || "");
    setFForma(l.forma);
    setFValor(String(l.valor ?? 0));
    setFStatus(l.status);
    setFObs(l.observacoes || "");
  }

  function closeModal(): void {
    setOpenId(null);
  }

  // ✅ aceita "1.234,56" / "1234,56" / "1234.56"
  function toNum(v: string): number {
    const s = String(v || "")
      .trim()
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  // ✅ SAVE – NÃO fecha modal se Firestore falhar
  async function save(): Promise<void> {
    console.log("[Financeiro] save() chamado");

    const desc = fDescricao.trim();
    if (!desc) {
      showToast("⚠️ Informe a descrição.");
      return;
    }
    if (!fData) {
      showToast("⚠️ Informe a data.");
      return;
    }

    const valor = Math.max(0, toNum(fValor));
    const isoData = isoFromDateInput(fData);
    const competencia = toCompetencia(isoData);

    const payloadBase: Partial<Lancamento> = {
      data: isoData,
      competencia,
      tipo: fTipo,
      descricao: desc,
      forma: fForma,
      valor,
      status: fStatus,
      ...(fCategoria.trim() && { categoria: fCategoria.trim() }),
      ...(fObs.trim() && { observacoes: fObs.trim() }),
    };

    let lancParaSync: Lancamento | null = null;

    if (openId === "NEW") {
      const created: Lancamento = {
        id: uid(),
        createdAt: nowISO(),
        updatedAt: nowISO(),
        ...payloadBase,
      } as Lancamento;

      lancParaSync = created;

      setItems((prev) => {
        const next = [created, ...prev];
        writeStorage(next);
        return next;
      });

      showToast("⏳ Salvando no Firestore...");
    } else if (openId) {
      // monta fora do map para garantir que existe
      const current = items.find((x) => x.id === openId);
      if (!current) {
        showToast("⚠️ Não achei o lançamento para editar.");
        return;
      }

      const updated: Lancamento = {
        ...current,
        ...payloadBase,
        updatedAt: nowISO(),
      } as Lancamento;

      lancParaSync = updated;

      setItems((prev) => {
        const next = prev.map((l) => (l.id === openId ? updated : l));
        writeStorage(next);
        return next;
      });

      showToast("⏳ Salvando no Firestore...");
    } else {
      return;
    }

    if (!lancParaSync) return;

    const ok = await upsertInFirestore(lancParaSync);

    if (!ok) {
      showToast("❌ Firestore bloqueou o salvamento. Veja o console (F12).", 3500);
      // não fecha modal
      return;
    }

    showToast("✅ Salvo no Firestore!");
    closeModal();
  }

  async function remove(): Promise<void> {
    if (!openItem) return;
    const okConfirm =
      typeof window === "undefined"
        ? true
        : window.confirm(
            `Excluir o lançamento "${openItem.descricao}"? (não dá para desfazer)`
          );
    if (!okConfirm) return;

    setItems((prev) => {
      const next = prev.filter((l) => l.id !== openItem.id);
      writeStorage(next);
      return next;
    });

    const ok = await deleteFromFirestore(openItem.id);
    if (!ok) {
      showToast("⚠️ Não consegui excluir no Firestore. Veja o console.");
    } else {
      showToast("🗑️ Lançamento excluído!");
    }

    closeModal();
  }

  function toggleStatus(id: string): void {
    const current = items.find((x) => x.id === id);
    if (!current) return;

    const novoStatus: StatusLanc = current.status === "pago" ? "pendente" : "pago";
    const updated: Lancamento = { ...current, status: novoStatus, updatedAt: nowISO() };

    setItems((prev) => {
      const next = prev.map((l) => (l.id === id ? updated : l));
      writeStorage(next);
      return next;
    });

    void upsertInFirestore(updated);
  }

  function duplicateLanc(id: string): void {
    const l = items.find((x) => x.id === id);
    if (!l) return;

    const copy: Lancamento = {
      ...l,
      id: uid(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    const next = [copy, ...items];
    setItems(next);
    writeStorage(next);
    void upsertInFirestore(copy);
    showToast("📌 Lançamento duplicado!");
  }

  function exportJSON(): void {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `maison_noor_financeiro_${new Date().toISOString().slice(
      0,
      10
    )}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showToast("⬇️ Exportado!");
  }

  function importJSON(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result || "");
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error("Arquivo inválido");

        const incoming = (parsed as any[])
          .filter(Boolean)
          .map((x) => {
            const dataIso = x.data ? String(x.data) : nowISO();
            const competencia = x.competencia
              ? String(x.competencia)
              : toCompetencia(dataIso);

            const tipo: TipoLanc = x.tipo === "despesa" ? "despesa" : "receita";
            const status: StatusLanc =
              x.status === "pendente" ? "pendente" : "pago";
            const forma: FormaPag =
              x.forma === "dinheiro" ||
              x.forma === "pix" ||
              x.forma === "credito" ||
              x.forma === "debito" ||
              x.forma === "boleto" ||
              x.forma === "transferencia"
                ? x.forma
                : "outros";

            const origemPedidoId = x.origemPedidoId
              ? String(x.origemPedidoId)
              : undefined;
            const clienteNome = x.clienteNome
              ? String(x.clienteNome)
              : undefined;

            return {
              id: String(x.id || uid()),
              data: dataIso,
              competencia,
              tipo,
              descricao: String(x.descricao || "").trim(),
              categoria: x.categoria ? String(x.categoria) : undefined,
              forma,
              valor: Number(x.valor) || 0,
              status,
              observacoes: x.observacoes ? String(x.observacoes) : undefined,
              origemPedidoId,
              clienteNome,
              createdAt: x.createdAt ? String(x.createdAt) : nowISO(),
              updatedAt: x.updatedAt ? String(x.updatedAt) : nowISO(),
            } as Lancamento;
          })
          .filter((l) => l.descricao);

        const current = readStorage();
        const map = new Map<string, Lancamento>();
        for (const l of current) map.set(l.id, l);

        for (const l of incoming) {
          const existing = map.get(l.id);
          if (!existing) {
            map.set(l.id, l);
          } else {
            const keepIncoming =
              (l.updatedAt || "") > (existing.updatedAt || "");
            map.set(l.id, keepIncoming ? l : existing);
          }
        }

        const next = Array.from(map.values());
        setItems(next);
        writeStorage(next);
        void syncListToFirestore(next);
        showToast("✅ Importado com sucesso!");
      } catch {
        showToast("⚠️ Não consegui importar. Verifique o arquivo JSON.");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

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
  }, [openId, fData, fDescricao, fValor, fCategoria, fForma, fStatus, fTipo, fObs]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return items
      .filter((l) => {
        if (tipoFilter !== "todos" && l.tipo !== tipoFilter) return false;
        if (statusFilter !== "todos" && l.status !== statusFilter) return false;
        if (competenciaFilter && l.competencia !== competenciaFilter)
          return false;

        if (!qq) return true;
        const hay = `${l.descricao} ${l.categoria || ""} ${l.forma}`.toLowerCase();
        return hay.includes(qq);
      })
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [items, q, tipoFilter, statusFilter, competenciaFilter]);

  const totals = useMemo(() => {
    let totalReceitas = 0;
    let totalDespesas = 0;
    let receitasPendentes = 0;
    let despesasPendentes = 0;

    for (const l of filtered) {
      if (l.tipo === "receita") {
        totalReceitas += l.valor || 0;
        if (l.status === "pendente") receitasPendentes += l.valor || 0;
      } else {
        totalDespesas += l.valor || 0;
        if (l.status === "pendente") despesasPendentes += l.valor || 0;
      }
    }

    const saldo = totalReceitas - totalDespesas;

    return {
      lancamentos: filtered.length,
      totalReceitas,
      totalDespesas,
      saldo,
      receitasPendentes,
      despesasPendentes,
    };
  }, [filtered]);

  return (
    <main className="page">
      <header className="head">
        <div>
          <div className="kicker">MAISON NOOR</div>

          <h1
            className="title"
            style={{
              fontSize: "22px",
              lineHeight: 1.2,
              marginTop: "6px",
            }}
          >
            CRM • Financeiro
          </h1>

          <p
            className="sub"
            style={{
              fontSize: "13px",
              marginTop: "6px",
              opacity: 0.8,
            }}
          >
            Controle receitas, despesas e saldo geral (sincronizado com Firestore).
          </p>
        </div>

        <div className="headRight">
          <button className="btn" onClick={openNew} type="button">
            + Novo lançamento
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

      {/* TOOLBAR */}
      <section className="toolbar">
        <div className="field">
          <label>Busca</label>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex: Venda Nebras, embalagem..."
          />
        </div>

        <div className="field">
          <label>Tipo</label>
          <select
            className="input"
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as "todos" | TipoLanc)}
          >
            <option value="todos">Todos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
        </div>

        <div className="field">
          <label>Status</label>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "todos" | StatusLanc)
            }
          >
            <option value="todos">Todos</option>
            <option value="pago">Pagos</option>
            <option value="pendente">Pendentes</option>
          </select>
        </div>

        <div className="field">
          <label>Mês (competência)</label>
          <input
            className="input"
            type="month"
            value={competenciaFilter}
            onChange={(e) => setCompetenciaFilter(e.target.value)}
          />
        </div>
      </section>

      {/* RESUMO */}
      <section className="summary">
        <div className="sumCard">
          <div className="sumLabel">Lançamentos no filtro</div>
          <div className="sumValue">{totals.lancamentos}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Receitas</div>
          <div className="sumValue green">{formatBRL(totals.totalReceitas)}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Despesas</div>
          <div className="sumValue red">{formatBRL(totals.totalDespesas)}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Saldo</div>
          <div
            className={
              totals.saldo >= 0 ? "sumValue greenStrong" : "sumValue redStrong"
            }
          >
            {formatBRL(totals.saldo)}
          </div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Receitas pendentes</div>
          <div className="sumValue">{formatBRL(totals.receitasPendentes)}</div>
        </div>
        <div className="sumCard">
          <div className="sumLabel">Despesas pendentes</div>
          <div className="sumValue">{formatBRL(totals.despesasPendentes)}</div>
        </div>
        <div className="sumHint">
          Clique na linha para editar. <b>ESC</b> fecha o modal. <b>Ctrl+Enter</b>{" "}
          salva.
          <br />
          Dica: use o status <b>Pendente</b> para reservas de pagamento futuro.
          <br />
          <span className="mono" style={{ opacity: 0.9 }}>
            Path: {FIRESTORE_COLLECTION_PATH}
          </span>
        </div>
      </section>

      {/* TABELA */}
      <section className="erpTable">
        <div className="erpInner">
          <div className="erpHeadRow">
            <div className="erpHeadCell main">Data</div>
            <div className="erpHeadCell">Descrição</div>
            <div className="erpHeadCell">Categoria</div>
            <div className="erpHeadCell">Tipo</div>
            <div className="erpHeadCell">Forma</div>
            <div className="erpHeadCell">Status</div>
            <div className="erpHeadCell num">Valor</div>
            <div className="erpHeadCell actions">Ações</div>
          </div>

          {filtered.map((l) => {
            const dataView = new Date(l.data).toLocaleDateString("pt-BR");
            const tipoLabel = l.tipo === "receita" ? "Receita" : "Despesa";
            const statusLabel = l.status === "pago" ? "Pago" : "Pendente";

            return (
              <div key={l.id} className="erpRow" onClick={() => openEdit(l.id)}>
                <div className="erpCell main">
                  <span className="meta mono">{dataView}</span>
                </div>
                <div className="erpCell">
                  <div className="erpDescr">{l.descricao}</div>
                </div>
                <div className="erpCell">
                  <span className="meta">{l.categoria || "—"}</span>
                </div>
                <div className="erpCell">
                  <span
                    className={
                      l.tipo === "receita"
                        ? "pill pillReceita"
                        : "pill pillDespesa"
                    }
                  >
                    {tipoLabel}
                  </span>
                </div>
                <div className="erpCell">
                  <span className="meta">
                    {l.forma === "pix"
                      ? "Pix"
                      : l.forma === "dinheiro"
                      ? "Dinheiro"
                      : l.forma === "credito"
                      ? "Crédito"
                      : l.forma === "debito"
                      ? "Débito"
                      : l.forma === "boleto"
                      ? "Boleto"
                      : l.forma === "transferencia"
                      ? "Transf."
                      : "Outros"}
                  </span>
                </div>
                <div className="erpCell">
                  <span
                    className={
                      l.status === "pago" ? "pill pillPago" : "pill pillPendente"
                    }
                  >
                    {statusLabel}
                  </span>
                </div>
                <div className="erpCell num">
                  <span
                    className={
                      l.tipo === "receita" ? "priceERP green" : "priceERP red"
                    }
                  >
                    {formatBRL(l.valor || 0)}
                  </span>
                </div>

                <div
                  className="erpCell actionsCell"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="mini"
                    onClick={() => toggleStatus(l.id)}
                    type="button"
                    title="Marcar pago/pendente"
                  >
                    {l.status === "pago" ? "Pendente" : "Pago"}
                  </button>
                  <button
                    className="mini"
                    onClick={() => duplicateLanc(l.id)}
                    type="button"
                    title="Duplicar lançamento"
                  >
                    Duplicar
                  </button>
                  <button
                    className="mini danger"
                    onClick={() => {
                      const okConfirm =
                        typeof window === "undefined"
                          ? true
                          : window.confirm("Excluir este lançamento?");
                      if (!okConfirm) return;
                      setItems((prev) => {
                        const next = prev.filter((x) => x.id !== l.id);
                        writeStorage(next);
                        return next;
                      });
                      void deleteFromFirestore(l.id);
                    }}
                    type="button"
                    title="Excluir"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}

          {!filtered.length ? (
            <div className="empty">
              Nenhum lançamento encontrado. Clique em “+ Novo lançamento”.
            </div>
          ) : null}
        </div>
      </section>

      {/* MODAL */}
      {openId ? (
        <div className="modalOverlay" onMouseDown={closeModal} role="presentation">
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div>
                <div className="modalKicker">
                  {openId === "NEW" ? "Novo lançamento" : "Editar lançamento"}
                </div>
                <div className="modalTitle">
                  {openId === "NEW" ? "Financeiro" : openItem?.descricao}
                </div>
                {openId !== "NEW" && openItem ? (
                  <div className="modalSub">
                    ID: <span className="mono">{openItem.id}</span>
                  </div>
                ) : null}
              </div>

              <button className="btnX" onClick={closeModal} type="button" aria-label="Fechar">
                ✕
              </button>
            </div>

            <div className="modalGrid">
              <div className="field">
                <label>Data</label>
                <input
                  className="input"
                  type="date"
                  value={fData}
                  onChange={(e) => setFData(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Tipo</label>
                <select className="input" value={fTipo} onChange={(e) => setFTipo(e.target.value as TipoLanc)}>
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>

              <div className="field">
                <label>Descrição</label>
                <input className="input" value={fDescricao} onChange={(e) => setFDescricao(e.target.value)} />
              </div>

              <div className="field">
                <label>Categoria</label>
                <input
                  className="input"
                  value={fCategoria}
                  onChange={(e) => setFCategoria(e.target.value)}
                  placeholder="Venda, Estoque, Frete..."
                />
              </div>

              <div className="field">
                <label>Forma de pagamento</label>
                <select className="input" value={fForma} onChange={(e) => setFForma(e.target.value as FormaPag)}>
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="credito">Crédito</option>
                  <option value="debito">Débito</option>
                  <option value="boleto">Boleto</option>
                  <option value="transferencia">Transferência</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div className="field">
                <label>Valor (R$)</label>
                <input className="input" value={fValor} onChange={(e) => setFValor(e.target.value)} />
              </div>

              <div className="field">
                <label>Status</label>
                <select className="input" value={fStatus} onChange={(e) => setFStatus(e.target.value as StatusLanc)}>
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>

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
        /* 🔽 SEU CSS ORIGINAL (mantido) */
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
          letter-spacing: 0.01em;
        }
        .sub {
          margin: 8px 0 0;
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
          font-size: 16px;
          font-weight: 900;
        }
        .sumValue.green {
          color: #67ffb2;
        }
        .sumValue.red {
          color: #ff9b9b;
        }
        .sumValue.greenStrong {
          color: #41ff97;
        }
        .sumValue.redStrong {
          color: #ff7474;
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

        .erpTable {
          margin-top: 16px;
          border-radius: 18px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(0, 0, 0, 0.18);
          overflow-x: auto;
        }
        .erpInner {
          min-width: 980px;
        }

        .erpHeadRow,
        .erpRow {
          display: grid;
          grid-template-columns:
            0.9fr
            2fr
            1.4fr
            1fr
            1.2fr
            1.1fr
            1.3fr
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
          font-size: 12px;
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

        .erpDescr {
          font-weight: 900;
        }

        .meta {
          font-size: 12px;
          opacity: 0.8;
        }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
        }
        .priceERP {
          font-weight: 900;
          white-space: nowrap;
        }
        .priceERP.green {
          color: #67ffb2;
        }
        .priceERP.red {
          color: #ff9b9b;
        }

        .pill {
          font-size: 11px;
          padding: 4px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          font-weight: 900;
        }
        .pillReceita {
          border-color: rgba(80, 200, 120, 0.4);
          background: rgba(80, 200, 120, 0.12);
          color: #67ffb2;
        }
        .pillDespesa {
          border-color: rgba(255, 100, 100, 0.4);
          background: rgba(255, 100, 100, 0.12);
          color: #ff9b9b;
        }
        .pillPago {
          border-color: rgba(80, 200, 120, 0.4);
          background: rgba(80, 200, 120, 0.12);
          color: #67ffb2;
        }
        .pillPendente {
          border-color: rgba(255, 200, 120, 0.4);
          background: rgba(255, 200, 120, 0.12);
          color: #ffd28a;
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
        .mini.danger {
          border-color: rgba(255, 90, 90, 0.35);
          background: rgba(255, 90, 90, 0.12);
          color: #ffd7d7;
        }

        .empty {
          padding: 14px 16px;
          border-top: 1px dashed rgba(255, 255, 255, 0.1);
          opacity: 0.7;
          font-size: 12px;
        }

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
        .modalFoot {
          padding: 10px 8px 4px;
          font-size: 12px;
          opacity: 0.7;
        }
      `}</style>
    </main>
  );
}

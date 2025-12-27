"use client";

import { useEffect, useMemo, useState } from "react";

type Origem = "instagram" | "whatsapp" | "indicacao" | "site" | "outros";
type StatusLead =
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
  status: StatusLead;
  createdAt: string;
  updatedAt: string;
  observacoes?: string;
};

type StatusPedido =
  | "rascunho"
  | "aguardando_pagamento"
  | "pago"
  | "enviado"
  | "entregue"
  | "cancelado";

type PedidoItem = {
  // Integração com Produtos
  produtoId?: string;
  nome: string;
  qtd: number;
  preco: number; // preço unitário
};

type Pedido = {
  id: string;
  /** ✅ Número sequencial (0001, 0002, ...) */
  numero?: number;
  leadId?: string;
  clienteNome: string;
  telefone: string;
  origem?: Origem;
  itens: PedidoItem[];
  desconto: number;
  frete: number;
  status: StatusPedido;
  createdAt: string;
  updatedAt: string;
  observacoes?: string;

  // ✅ Controle de baixa/devolução de estoque
  estoqueBaixado?: boolean;
};

type ProdutoCategoria = "masculino" | "feminino" | "unissex";

type Produto = {
  id: string;
  nome: string;
  marca?: string;
  volumeMl?: number;
  categoria?: ProdutoCategoria;
  precoCompra?: number;
  precoVenda?: number;
  estoque?: number;
  ativo?: boolean;
  createdAt: string;
  updatedAt: string;
  observacoes?: string;
};

const LEADS_KEY = "maison_noor_crm_leads_v1";
const PEDIDOS_KEY = "maison_noor_crm_pedidos_v1";
const PRODUTOS_KEY = "maison_noor_crm_produtos_v1";

/** ✅ Controle de sequência de pedidos */
const PEDIDOS_SEQ_KEY = "maison_noor_crm_pedidos_seq_v1";

// ✅ Financeiro (receitas vindas de pedidos)
const FINANCEIRO_KEY = "maison_noor_crm_financeiro_v1";

type PedidoParaFinanceiro = {
  id: string;
  descricao: string;
  valor: number;
  cliente?: string;
  data?: string;
  meioPagamento?: string;
};

// 🔁 estrutura alinhada com a tela Financeiro
type FinanceiroEntry = {
  id: string;
  data: string; // data do lançamento
  competencia: string; // AAAA-MM (mês competência)
  tipo: "receita" | "despesa";
  status: "pago" | "pendente" | "cancelado";
  descricao: string;
  categoria?: string;
  forma: string; // ex: Pix, Crédito
  valor: number;
  observacoes?: string;
  origemPedidoId?: string;
  clienteNome?: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_PEDIDO_META: { v: StatusPedido; label: string }[] = [
  { v: "rascunho", label: "Rascunho" },
  { v: "aguardando_pagamento", label: "Aguardando" },
  { v: "pago", label: "Pago" },
  { v: "enviado", label: "Enviado" },
  { v: "entregue", label: "Entregue" },
  { v: "cancelado", label: "Cancelado" },
];

const ORIGEM_LABEL: Record<Origem, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  indicacao: "Indicação",
  site: "Site",
  outros: "Outros",
};

// type-guard origem
const ORIGENS_VALIDAS = ["instagram", "whatsapp", "indicacao", "site", "outros"] as const;
function isOrigem(v: unknown): v is Origem {
  return ORIGENS_VALIDAS.includes(v as Origem);
}
function origemLabel(v: unknown): string {
  return isOrigem(v) ? ORIGEM_LABEL[v] : ORIGEM_LABEL.outros;
}

function formatBRL(n: number): string {
  return Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyDigits(v: string): string {
  return String(v || "").replace(/\D/g, "");
}

function uid(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

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

/** ✅ Formata número do pedido como 0001, 0002... */
function formatNumeroPedido(n?: number): string {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return "—";
  return n.toString().padStart(4, "0");
}

/** ✅ Gera o próximo número sequencial do pedido */
function nextPedidoNumero(): number {
  const atual = loadJSON<number>(PEDIDOS_SEQ_KEY, 0);
  const prox = (Number(atual) || 0) + 1;
  saveJSON(PEDIDOS_SEQ_KEY, prox);
  return prox;
}

// 🔗 Pedido -> Lead: sincroniza status do lead quando pedido muda
function syncLeadStatusFromPedido(pedido: Pedido): void {
  if (!pedido.leadId) return;

  const leads = loadJSON<Lead[]>(LEADS_KEY, []);
  const idx = leads.findIndex((l) => l.id === pedido.leadId);
  if (idx === -1) return;

  const statusMap: Partial<Record<StatusPedido, StatusLead>> = {
    pago: "pagou",
    enviado: "enviado",
    entregue: "finalizado",
    cancelado: "perdido",
  };

  const nextStatus = statusMap[pedido.status];
  if (!nextStatus) return;

  leads[idx] = {
    ...leads[idx],
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };

  saveJSON(LEADS_KEY, leads);
}

/**
 * ✅ Estoque:
 * - baixa quando status vira pago/enviado/entregue (1x)
 * - devolve quando status vira cancelado (se já baixou)
 */
function shouldBaixarEstoque(status: StatusPedido): boolean {
  return status === "pago" || status === "enviado" || status === "entregue";
}
function shouldDevolverEstoque(status: StatusPedido): boolean {
  return status === "cancelado";
}

function ajustarEstoquePorPedido(pedido: Pedido, modo: "baixar" | "devolver"): void {
  const produtos = loadJSON<Produto[]>(PRODUTOS_KEY, []);
  if (!produtos.length) return;

  const map = new Map<string, Produto>(produtos.map((p) => [p.id, p]));

  for (const it of pedido.itens || []) {
    if (!it.produtoId) continue; // só baixa/devolve se veio do cadastro de produtos (ou vinculado)
    const p = map.get(it.produtoId);
    if (!p) continue;

    const qtd = Math.max(0, Number(it.qtd) || 0);
    const estoqueAtual = Number(p.estoque) || 0;

    const novoEstoque =
      modo === "baixar"
        ? Math.max(0, estoqueAtual - qtd)
        : Math.max(0, estoqueAtual + qtd);

    map.set(it.produtoId, {
      ...p,
      estoque: novoEstoque,
      updatedAt: new Date().toISOString(),
    });
  }

  const nextProdutos = Array.from(map.values());
  saveJSON(PRODUTOS_KEY, nextProdutos);
}

// ✅ normaliza texto pra casar nome do Lead com nome do Produto
function norm(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

// helper para mês/competência (AAAA-MM)
function toCompetencia(iso: string): string {
  return iso.slice(0, 7);
}

// ✅ helper para descrição curta no Financeiro (agora possível usar o número do pedido)
function descricaoPedidoFinanceiro(id: string, nome?: string, numero?: number): string {
  const codigo =
    typeof numero === "number" && numero > 0
      ? formatNumeroPedido(numero)
      : id.slice(-6); // fallback antigo

  const base = `Venda • Pedido #${codigo}`;
  return nome ? `${base} • ${nome}` : base;
}

// ✅ migração: acerta descrições antigas no Financeiro
function migrarDescricoesFinanceiroAntigas(): void {
  const lista = loadJSON<FinanceiroEntry[]>(FINANCEIRO_KEY, []);
  if (!lista.length) return;

  const pedidos = loadJSON<Pedido[]>(PEDIDOS_KEY, []);

  let alterou = false;

  const novaLista = lista.map((l) => {
    // só mexe em lançamentos que vieram de pedido
    if (!l.origemPedidoId) return l;

    // só altera se estiver no formato antigo "Venda pedido ..."
    if (!l.descricao.startsWith("Venda pedido")) return l;

    const pedidoOrigem = pedidos.find((p) => p.id === l.origemPedidoId);
    const numero = pedidoOrigem?.numero;

    const novaDesc = descricaoPedidoFinanceiro(l.origemPedidoId, l.clienteNome, numero);
    if (novaDesc === l.descricao) return l;

    alterou = true;
    return {
      ...l,
      descricao: novaDesc,
      updatedAt: new Date().toISOString(),
    };
  });

  if (alterou) {
    saveJSON(FINANCEIRO_KEY, novaLista);
  }
}

// ✅ registra receita no Financeiro quando pedido é pago
function registrarReceitaDoPedido(p: PedidoParaFinanceiro): void {
  try {
    // garante que o valor em storage realmente seja array
    const listaRaw = loadJSON<unknown>(FINANCEIRO_KEY, []);
    const lista: FinanceiroEntry[] = Array.isArray(listaRaw)
      ? (listaRaw as FinanceiroEntry[])
      : [];

    // evita lançar duas vezes o mesmo pedido
    const jaExiste = lista.some((l) => l.origemPedidoId === p.id);
    if (jaExiste) return;

    const agora = new Date().toISOString();
    const data = p.data || agora;

    const lancamento: FinanceiroEntry = {
      id: uid(),
      data,
      competencia: toCompetencia(data),
      tipo: "receita",
      status: "pago",
      descricao: p.descricao,
      categoria: "Vendas",
      forma: p.meioPagamento || "Pix",
      valor: p.valor,
      observacoes: p.cliente ? `Pedido de ${p.cliente}` : undefined,
      origemPedidoId: p.id,
      clienteNome: p.cliente,
      createdAt: agora,
      updatedAt: agora,
    };

    const novaLista: FinanceiroEntry[] = [lancamento, ...lista];
    saveJSON(FINANCEIRO_KEY, novaLista);
  } catch (err) {
    // não deixa erro de financeiro travar o salvamento do pedido
    console.error("Erro ao registrar receita do pedido:", err);
  }
}

export default function PedidosPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [msg, setMsg] = useState("");

  // modal criar pedido
  const [open, setOpen] = useState(false);
  const [leadPick, setLeadPick] = useState<string>("");
  const [clienteNome, setClienteNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState<Origem>("outros");

  // item (agora com produtoId)
  const [produtoPick, setProdutoPick] = useState<string>("");
  const [itemNome, setItemNome] = useState("");
  const [itemQtd, setItemQtd] = useState(1);
  const [itemPreco, setItemPreco] = useState(0);

  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [frete, setFrete] = useState(0);
  const [status, setStatus] = useState<StatusPedido>("rascunho");
  const [observacoes, setObservacoes] = useState("");

  // filtros
  const [statusFiltro, setStatusFiltro] = useState<StatusPedido | "todos">("todos");
  const [q, setQ] = useState("");

  useEffect(() => {
    setLeads(loadJSON<Lead[]>(LEADS_KEY, []));
    setPedidos(loadJSON<Pedido[]>(PEDIDOS_KEY, []));
    setProdutos(loadJSON<Produto[]>(PRODUTOS_KEY, []));

    // 🔄 ajusta descrições antigas do Financeiro
    migrarDescricoesFinanceiroAntigas();
  }, []);

  // ✅ Garantir que todo pedido com status "pago" esteja no Financeiro
  useEffect(() => {
    if (!pedidos.length) return;

    pedidos.forEach((p) => {
      if (p.status !== "pago") return;

      const subtotal = (p.itens || []).reduce(
        (a, it) => a + (Number(it.preco) || 0) * (Number(it.qtd) || 0),
        0
      );
      const total = Math.max(
        0,
        subtotal - (Number(p.desconto) || 0) + (Number(p.frete) || 0)
      );

      if (total > 0) {
        registrarReceitaDoPedido({
          id: p.id,
          descricao: descricaoPedidoFinanceiro(p.id, p.clienteNome, p.numero),
          valor: total,
          cliente: p.clienteNome,
          data: p.updatedAt || p.createdAt,
        });
      }
    });
  }, [pedidos]);

  function toast(t: string, ms = 1400): void {
    setMsg(t);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setMsg(""), ms);
    }
  }

  function refresh(): void {
    setLeads(loadJSON<Lead[]>(LEADS_KEY, []));
    setPedidos(loadJSON<Pedido[]>(PEDIDOS_KEY, []));
    setProdutos(loadJSON<Produto[]>(PRODUTOS_KEY, []));
    toast("🔄 Atualizado!");
  }

  function openWhatsApp(tel: string, nome?: string): void {
    const digits = onlyDigits(tel);
    const number =
      digits.length >= 12 && digits.startsWith("55")
        ? digits
        : digits.length >= 10
        ? `55${digits}`
        : digits;

    const text = nome ? `Olá ${nome}! Tudo bem?` : "Olá! Tudo bem?";
    const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  }

  function goLead(id: string): void {
    if (typeof window === "undefined") return;
    window.location.href = `/crm/leads?focus=${encodeURIComponent(id)}`;
  }

  function goProdutos(): void {
    if (typeof window === "undefined") return;
    window.location.href = `/crm/produtos`;
  }

  function startNewPedido(): void {
    setLeadPick("");
    setClienteNome("");
    setTelefone("");
    setOrigem("outros");

    setProdutoPick("");
    setItens([]);
    setItemNome("");
    setItemQtd(1);
    setItemPreco(0);

    setDesconto(0);
    setFrete(0);
    setStatus("rascunho");
    setObservacoes("");
    setOpen(true);
  }

  // ✅ tenta casar os perfumes do lead com produtos cadastrados (por nome)
  function mapLeadPerfumesToItens(leadPerfumes: string[]): PedidoItem[] {
    const prodsAtivos = (produtos || []).filter((p) => p.ativo !== false);
    const byName = new Map<string, Produto>();
    for (const p of prodsAtivos) byName.set(norm(p.nome), p);

    return (leadPerfumes || [])
      .map((p) => String(p).trim())
      .filter(Boolean)
      .map((nomePerfume) => {
        const exact = byName.get(norm(nomePerfume));
        if (exact) {
          return {
            produtoId: exact.id,
            nome: exact.nome,
            qtd: 1,
            preco: Number(exact.precoVenda || 0),
          };
        }
        // fallback: sem produtoId (não baixa estoque)
        return { nome: nomePerfume, qtd: 1, preco: 0 };
      });
  }

  // quando escolher lead, preenche dados e itens (perfumes)
  function onPickLead(leadId: string): void {
    setLeadPick(leadId);
    const l = leads.find((x) => x.id === leadId);
    if (!l) return;

    setClienteNome(l.nome || "");
    setTelefone(l.telefone || "");
    setOrigem(l.origem || "outros");

    // ✅ agora vincula com Produtos quando possível
    const mapped = mapLeadPerfumesToItens(l.perfumes || []);
    setItens(mapped);

    // reseta o picker manual
    setProdutoPick("");
    setItemNome("");
    setItemQtd(1);
    setItemPreco(0);
  }

  // ✅ ao escolher um produto, preenche nome e preço
  function onPickProduto(produtoId: string): void {
    setProdutoPick(produtoId);
    const p = produtos.find((x) => x.id === produtoId);
    if (!p) return;

    if (typeof p.estoque === "number" && p.estoque <= 0) {
      toast("⚠️ Esse produto está com estoque 0.", 1800);
    }

    setItemNome(p.nome || "");
    setItemPreco(Number(p.precoVenda || 0));
    setItemQtd(1);
  }

  function addItem(): void {
    const nome = String(itemNome).trim();
    if (!nome) {
      toast("⚠️ Informe o nome do item/perfume.", 1600);
      return;
    }
    const qtd = Math.max(1, Number(itemQtd) || 1);
    const preco = Math.max(0, Number(itemPreco) || 0);

    const produtoId = produtoPick || undefined;

    setItens((prev) => [...prev, { produtoId, nome, qtd, preco }]);

    // reseta input
    setProdutoPick("");
    setItemNome("");
    setItemQtd(1);
    setItemPreco(0);
  }

  function removeItem(idx: number): void {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, patch: Partial<PedidoItem>): void {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  const totals = useMemo(() => {
    const subtotal = itens.reduce(
      (acc, it) => acc + (Number(it.preco) || 0) * (Number(it.qtd) || 0),
      0
    );
    const desc = Math.max(0, Number(desconto) || 0);
    const fr = Math.max(0, Number(frete) || 0);
    const total = Math.max(0, subtotal - desc + fr);
    return { subtotal, total };
  }, [itens, desconto, frete]);

  function validatePedido(): string {
    if (!clienteNome.trim()) return "Informe o nome do cliente.";
    if (onlyDigits(telefone).length < 10) return "Informe um telefone válido (com DDD).";
    if (!itens.length) return "Adicione pelo menos 1 item.";
    return "";
  }

  function savePedido(): void {
    try {
      const err = validatePedido();
      if (err) {
        toast(`⚠️ ${err}`, 2200);
        return;
      }

      const now = new Date().toISOString();
      const itensNormalizados = itens.map((x) => ({
        produtoId: x.produtoId,
        nome: String(x.nome).trim(),
        qtd: Math.max(1, Number(x.qtd) || 1),
        preco: Math.max(0, Number(x.preco) || 0),
      }));

      const descontoNum = Math.max(0, Number(desconto) || 0);
      const freteNum = Math.max(0, Number(frete) || 0);

      const subtotal = itensNormalizados.reduce(
        (acc, it) => acc + (Number(it.preco) || 0) * (Number(it.qtd) || 0),
        0
      );
      const total = Math.max(0, subtotal - descontoNum + freteNum);

      // ✅ gera número sequencial do pedido
      const numeroPedido = nextPedidoNumero();

      const p: Pedido = {
        id: uid(),
        numero: numeroPedido,
        leadId: leadPick || undefined,
        clienteNome: clienteNome.trim(),
        telefone: telefone.trim(),
        origem,
        itens: itensNormalizados,
        desconto: descontoNum,
        frete: freteNum,
        status,
        createdAt: now,
        updatedAt: now,
        observacoes: observacoes.trim() || undefined,
        estoqueBaixado: false,
      };

      // ✅ baixa estoque se já estiver como pago/enviado/entregue
      if (shouldBaixarEstoque(p.status)) {
        ajustarEstoquePorPedido(p, "baixar");
        p.estoqueBaixado = true;
      }

      // ✅ se já salvar como "pago", lança no financeiro
      if (p.status === "pago" && total > 0) {
        registrarReceitaDoPedido({
          id: p.id,
          descricao: descricaoPedidoFinanceiro(p.id, p.clienteNome, p.numero),
          valor: total,
          cliente: p.clienteNome,
          data: p.createdAt,
        });
      }

      const next = [p, ...pedidos];
      setPedidos(next);
      saveJSON(PEDIDOS_KEY, next);

      // 🔗 sincroniza lead ↔ pedido
      syncLeadStatusFromPedido(p);
      setLeads(loadJSON<Lead[]>(LEADS_KEY, []));

      // atualiza produtos na tela também
      setProdutos(loadJSON<Produto[]>(PRODUTOS_KEY, []));

      toast("✅ Pedido salvo!");
      setOpen(false);
    } catch (err) {
      console.error("Erro ao salvar pedido:", err);
      toast("⚠️ Não consegui salvar o pedido. Veja o console (F12).");
    }
  }

  function updatePedidoStatus(id: string, st: StatusPedido): void {
    const next = pedidos.map((p) => {
      if (p.id !== id) return p;

      const updated: Pedido = { ...p, status: st, updatedAt: new Date().toISOString() };

      // ✅ baixa/devolve estoque com controle
      const baixado = Boolean(updated.estoqueBaixado);

      if (shouldBaixarEstoque(updated.status) && !baixado) {
        ajustarEstoquePorPedido(updated, "baixar");
        updated.estoqueBaixado = true;
      }

      if (shouldDevolverEstoque(updated.status) && baixado) {
        ajustarEstoquePorPedido(updated, "devolver");
        updated.estoqueBaixado = false;
      }

      // 🔗 sincroniza lead ↔ pedido
      syncLeadStatusFromPedido(updated);

      // ✅ quando virar PAGO, lança receita no financeiro (se ainda não lançado)
      if (st === "pago") {
        const subtotal = (updated.itens || []).reduce(
          (a, it) => a + (Number(it.preco) || 0) * (Number(it.qtd) || 0),
          0
        );
        const total = Math.max(
          0,
          subtotal - (Number(updated.desconto) || 0) + (Number(updated.frete) || 0)
        );

        if (total > 0) {
          registrarReceitaDoPedido({
            id: updated.id,
            descricao: descricaoPedidoFinanceiro(
              updated.id,
              updated.clienteNome,
              updated.numero
            ),
            valor: total,
            cliente: updated.clienteNome,
            data: updated.updatedAt,
          });
        }
      }

      return updated;
    });

    setPedidos(next);
    saveJSON(PEDIDOS_KEY, next);

    setLeads(loadJSON<Lead[]>(LEADS_KEY, []));
    setProdutos(loadJSON<Produto[]>(PRODUTOS_KEY, []));

    toast("✅ Status atualizado!", 1200);
  }

  function deletePedido(id: string): void {
    const p = pedidos.find((x) => x.id === id);
    if (!p) return;

    if (typeof window !== "undefined") {
      const ok = window.confirm("Remover este pedido?");
      if (!ok) return;
    }

    // ✅ se estava baixado, devolve antes de remover
    if (p.estoqueBaixado) {
      ajustarEstoquePorPedido(p, "devolver");
    }

    const next = pedidos.filter((x) => x.id !== id);
    setPedidos(next);
    saveJSON(PEDIDOS_KEY, next);

    setProdutos(loadJSON<Produto[]>(PRODUTOS_KEY, []));

    toast("🗑️ Pedido removido!", 1200);
  }

  const pedidosFiltrados = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (statusFiltro !== "todos" && p.status !== statusFiltro) return false;
      if (!qq) return true;
      const text = `${p.clienteNome} ${p.telefone} ${(p.itens || [])
        .map((i) => i.nome)
        .join(" ")} ${p.status}`.toLowerCase();
      return text.includes(qq);
    });
  }, [pedidos, statusFiltro, q]);

  const resumo = useMemo(() => {
    const total = pedidosFiltrados.reduce((acc, p) => {
      const subtotal = (p.itens || []).reduce(
        (a, it) => a + (Number(it.preco) || 0) * (Number(it.qtd) || 0),
        0
      );
      const t = Math.max(
        0,
        subtotal - (Number(p.desconto) || 0) + (Number(p.frete) || 0)
      );
      return acc + t;
    }, 0);
    return { total };
  }, [pedidosFiltrados]);

  const produtosAtivos = useMemo(() => {
    return (produtos || [])
      .filter((p) => p.ativo !== false)
      .slice()
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  }, [produtos]);

  return (
    <main className="page">
      <header className="head">
        <div>
          <div className="kicker">Maison Noor</div>
          <h1 className="title">CRM • Pedidos</h1>
          <p className="sub">
            Crie pedidos a partir de Leads e acompanhe status (integrado com Produtos/Estoque e Financeiro).
          </p>
        </div>

        <div className="headRight">
          <div className="filterBox">
            <label>Status</label>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as StatusPedido | "todos")}
              className="selectSmall"
            >
              <option value="todos">Todos</option>
              {STATUS_PEDIDO_META.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filterBox">
            <label>Busca</label>
            <input
              className="inputSmall"
              placeholder="Cliente, telefone, perfume..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <button className="btn" onClick={refresh} type="button">
            Atualizar
          </button>
          <button className="btnPrimary" onClick={startNewPedido} type="button">
            + Criar pedido
          </button>
        </div>
      </header>

      {msg ? <div className="toast">{msg}</div> : null}

      {!produtosAtivos.length ? (
        <div className="warn">
          ⚠️ Você ainda não tem produtos cadastrados. Cadastre em <strong>Produtos</strong> para puxar preço e baixar
          estoque.
          <button
            className="btnSmall"
            onClick={goProdutos}
            type="button"
            style={{ marginLeft: 10 }}
          >
            Ir para Produtos
          </button>
        </div>
      ) : null}

      <section className="stats">
        <div className="stat">
          <div className="statLabel">Pedidos (filtro)</div>
          <div className="statValue">{pedidosFiltrados.length}</div>
        </div>
        <div className="stat">
          <div className="statLabel">Total (filtro)</div>
          <div className="statValue">{formatBRL(resumo.total)}</div>
        </div>
      </section>

      <section className="card">
        <div className="cardTitle">Pedidos salvos</div>

        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Contato</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Status</th>
                <th>Atualizado</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {pedidosFiltrados.map((p) => {
                const subtotal = (p.itens || []).reduce(
                  (a, it) => a + (Number(it.preco) || 0) * (Number(it.qtd) || 0),
                  0
                );
                const total = Math.max(
                  0,
                  subtotal - (Number(p.desconto) || 0) + (Number(p.frete) || 0)
                );

                return (
                  <tr key={p.id}>
                    <td className="mono">#{formatNumeroPedido(p.numero)}</td>

                    <td>
                      <div className="name">{p.clienteNome}</div>
                      <div className="meta">
                        {p.origem ? origemLabel(p.origem) : "—"}{" "}
                        {p.estoqueBaixado ? <span className="pillOk">estoque baixado</span> : null}
                      </div>
                    </td>

                    <td>
                      <div className="mono">{p.telefone}</div>
                    </td>

                    <td>
                      <div className="items">
                        {(p.itens || []).slice(0, 3).map((it, idx) => (
                          <span className="chip" key={`${p.id}_${idx}`}>
                            {it.nome} ×{it.qtd}
                          </span>
                        ))}
                        {(p.itens || []).length > 3 ? (
                          <span className="more">+{(p.itens || []).length - 3}</span>
                        ) : null}
                      </div>
                    </td>

                    <td className="mono">{formatBRL(total)}</td>

                    <td>
                      <select
                        className="selectInline"
                        value={p.status}
                        onChange={(e) => updatePedidoStatus(p.id, e.target.value as StatusPedido)}
                      >
                        {STATUS_PEDIDO_META.map((s) => (
                          <option key={s.v} value={s.v}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="meta">
                      {new Date(p.updatedAt || p.createdAt).toLocaleString("pt-BR")}
                    </td>

                    <td>
                      <div className="actions">
                        <button
                          className="btnSmall"
                          onClick={() => openWhatsApp(p.telefone, p.clienteNome)}
                          type="button"
                        >
                          WhatsApp
                        </button>

                        {p.leadId ? (
                          <button
                            className="btnSmall"
                            onClick={() => goLead(p.leadId!)}
                            type="button"
                          >
                            Ver Lead
                          </button>
                        ) : null}

                        <button
                          className="btnDanger"
                          onClick={() => deletePedido(p.id)}
                          type="button"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!pedidosFiltrados.length ? (
                <tr>
                  {/* agora são 8 colunas */}
                  <td colSpan={8} className="empty">
                    Nenhum pedido ainda. Clique em <strong>“+ Criar pedido”</strong>.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL */}
      {open ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modalHead">
              <div>
                <div className="kicker">Maison Noor</div>
                <div className="modalTitle">Novo pedido</div>
                <div className="modalSub">
                  Você pode puxar dados de um Lead ou preencher manualmente.
                </div>
              </div>

              <button
                className="x"
                onClick={() => setOpen(false)}
                type="button"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="modalGrid">
              <div className="box">
                <div className="boxTitle">Cliente</div>

                <label className="lab">Criar a partir de Lead</label>
                <select
                  className="select"
                  value={leadPick}
                  onChange={(e) => onPickLead(e.target.value)}
                >
                  <option value="">— Selecionar lead —</option>
                  {leads
                    .slice()
                    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
                    .slice(0, 80)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome} • {l.telefone} • {origemLabel(l.origem)}
                      </option>
                    ))}
                </select>

                <div className="row2">
                  <div>
                    <label className="lab">Nome</label>
                    <input
                      className="input"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="lab">Telefone</label>
                    <input
                      className="input"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row2">
                  <div>
                    <label className="lab">Origem</label>
                    <select
                      className="select"
                      value={origem}
                      onChange={(e) => setOrigem(e.target.value as Origem)}
                    >
                      <option value="instagram">Instagram</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="indicacao">Indicação</option>
                      <option value="site">Site</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="lab">Status</label>
                    <select
                      className="select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as StatusPedido)}
                    >
                      {STATUS_PEDIDO_META.map((s) => (
                        <option key={s.v} value={s.v}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="lab">Observações</label>
                <textarea
                  className="textarea"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              <div className="box">
                <div className="boxTitle">Itens do pedido</div>

                {/* ✅ Picker de Produtos */}
                <label className="lab">Adicionar a partir de Produtos</label>
                <select
                  className="select"
                  value={produtoPick}
                  onChange={(e) => onPickProduto(e.target.value)}
                >
                  <option value="">— Selecionar produto —</option>
                  {produtosAtivos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                      {typeof p.estoque === "number" ? ` • estoque ${p.estoque}` : ""}
                      {p.precoVenda ? ` • ${formatBRL(p.precoVenda)}` : ""}
                    </option>
                  ))}
                </select>

                <div className="row3">
                  <input
                    className="input"
                    placeholder="Nome do perfume / item"
                    value={itemNome}
                    onChange={(e) => setItemNome(e.target.value)}
                  />
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={itemQtd}
                    onChange={(e) => setItemQtd(Number(e.target.value))}
                  />
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={itemPreco}
                    onChange={(e) => setItemPreco(Number(e.target.value))}
                  />
                  <button
                    className="btnSmall"
                    onClick={addItem}
                    type="button"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="itemsList">
                  {itens.length ? (
                    itens.map((it, idx) => (
                      <div className="itemRow" key={`${it.nome}_${idx}`}>
                        <input
                          className="input"
                          value={it.nome}
                          onChange={(e) => updateItem(idx, { nome: e.target.value })}
                        />
                        <input
                          className="input"
                          type="number"
                          min={1}
                          value={it.qtd}
                          onChange={(e) =>
                            updateItem(idx, { qtd: Number(e.target.value) })
                          }
                        />
                        <input
                          className="input"
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.preco}
                          onChange={(e) =>
                            updateItem(idx, { preco: Number(e.target.value) })
                          }
                        />
                        <button
                          className="btnDanger"
                          onClick={() => removeItem(idx)}
                          type="button"
                        >
                          Remover
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="emptyBox">
                      Sem itens ainda. Se escolher um Lead, os perfumes entram aqui.
                    </div>
                  )}
                </div>

                <div className="row2">
                  <div>
                    <label className="lab">Desconto (R$)</label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={desconto}
                      onChange={(e) => setDesconto(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="lab">Frete (R$)</label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={frete}
                      onChange={(e) => setFrete(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="totals">
                  <div className="totLine">
                    <span>Subtotal</span>
                    <strong>{formatBRL(totals.subtotal)}</strong>
                  </div>
                  <div className="totLine">
                    <span>Total</span>
                    <strong className="tot">{formatBRL(totals.total)}</strong>
                  </div>
                </div>

                <div className="modalActions">
                  <button
                    className="btn"
                    onClick={() => setOpen(false)}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="btnPrimary"
                    onClick={savePedido}
                    type="button"
                  >
                    Salvar pedido
                  </button>
                </div>
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
        .selectSmall,
        .inputSmall {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(15, 15, 22, 0.9);
          color: #f2f2f2;
          outline: none;
          min-width: 180px;
        }
        .inputSmall {
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

        .warn {
          margin-top: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 220, 160, 0.25);
          background: rgba(255, 220, 160, 0.08);
          font-weight: 800;
          max-width: 980px;
        }

        .stats {
          margin-top: 16px;
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          max-width: 560px;
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
          overflow-x: hidden;
        }
        .cardTitle {
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.85;
          margin-bottom: 12px;
          font-weight: 900;
        }

        .tableWrap {
          width: 100%;
          overflow-x: auto;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.14);
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          min-width: 880px;
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
          text-align: left;
          white-space: nowrap;
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
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
        }
        .items {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
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
          font-size: 12px;
          opacity: 0.75;
        }
        .selectInline {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(15, 15, 22, 0.9);
          color: #f2f2f2;
          outline: none;
        }
        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .empty {
          padding: 16px;
          opacity: 0.7;
          text-align: center;
        }

        .pillOk {
          display: inline-block;
          margin-left: 8px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.08);
          color: rgba(200, 162, 106, 0.95);
          font-weight: 900;
          font-size: 11px;
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
          width: min(1100px, 98vw);
          max-height: 90vh; /* ✅ não deixa passar da tela */
          overflow-y: auto; /* ✅ scroll interno se passar */
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
        .modalGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          padding: 10px;
        }
        @media (min-width: 980px) {
          .modalGrid {
            grid-template-columns: 1fr 1.2fr;
          }
        }
        .box {
          border-radius: 16px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: rgba(0, 0, 0, 0.18);
          padding: 12px;
        }
        .boxTitle {
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.85;
          margin-bottom: 12px;
          font-weight: 900;
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
        .row3 {
          display: grid;
          grid-template-columns: 1fr 90px 140px 140px;
          gap: 8px;
          align-items: end;
          margin-top: 8px;
        }
        @media (max-width: 900px) {
          .row3 {
            grid-template-columns: 1fr 90px 140px;
          }
          .row3 button {
            grid-column: 1 / -1;
          }
        }
        .itemsList {
          margin-top: 12px;
          display: grid;
          gap: 10px;
        }
        .itemRow {
          display: grid;
          grid-template-columns: 1fr 90px 140px 120px;
          gap: 8px;
          align-items: center;
        }
        @media (max-width: 900px) {
          .itemRow {
            grid-template-columns: 1fr 90px 140px;
          }
          .itemRow button {
            grid-column: 1 / -1;
          }
        }
        .emptyBox {
          padding: 12px;
          border-radius: 14px;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          opacity: 0.75;
        }
        .totals {
          margin-top: 12px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: rgba(200, 162, 106, 0.06);
        }
        .totLine {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          font-weight: 800;
        }
        .tot {
          color: rgba(200, 162, 106, 0.95);
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

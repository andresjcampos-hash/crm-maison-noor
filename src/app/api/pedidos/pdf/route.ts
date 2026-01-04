import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type PedidoItem = {
  nome: string;
  preco: number;
  qtd: number;
  produtoId?: string;
};

type Pedido = {
  id: string;
  numero?: number;
  clienteNome?: string;
  telefone?: string;
  origem?: string;
  status?: string;
  desconto?: number;
  frete?: number;
  itens?: PedidoItem[];
  createdAt?: string;
};

function brl(n: number) {
  return Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function line(doc: PDFKit.PDFDocument, w: number) {
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.margins.left + w, doc.y)
    .lineWidth(0.5)
    .strokeColor("#000000")
    .stroke();
}

function safeDateLabel(iso?: string) {
  if (!iso) return "";
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? iso : dt.toLocaleString("pt-BR");
}

/**
 * ✅ TÉRMICO: mede a altura aproximada do conteúdo
 * (não é perfeito ao pixel, mas fica MUITO melhor do que altura fixa 1200)
 */
function estimateThermalHeight(pedido: Pedido): number {
  const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
  const base =
    10 + // margin top
    22 + // título
    16 + // subtítulo
    14 + // linhas e respiros
    80 + // bloco cliente
    26 + // título itens
    20; // totais / rodapé mínimo

  // cada item: nome (1-2 linhas) + linha de cálculo + espaçamento
  const perItem = 44; // média segura
  const extra = itens.length * perItem;

  // totals + rodapé
  const footer = 90;

  const total = base + extra + footer;

  // mínimo e máximo seguros
  return Math.max(360, Math.min(total, 2000));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pedidoId = searchParams.get("id");

    if (!pedidoId) {
      return NextResponse.json(
        { ok: false, error: "Passe o id: /api/pedidos/pdf?id=SEU_ID" },
        { status: 400 }
      );
    }

    // ✅ Firestore: pedidos/default/lista/{pedidoId}
    const ref = adminDb
      .collection("pedidos")
      .doc("default")
      .collection("lista")
      .doc(pedidoId);

    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { ok: false, error: `Pedido não encontrado: ${pedidoId}` },
        { status: 404 }
      );
    }

    const pedido = snap.data() as Pedido;

    // ✅ 80mm (muito usado em térmica): 226pt ~ 80mm
    const width = 226;
    const margin = 10;
    const usableW = width - margin * 2;

    // ✅ altura dinâmica
    const height = estimateThermalHeight(pedido);

    const docPdf = new PDFDocument({
      size: [width, height],
      margins: { top: margin, left: margin, right: margin, bottom: margin },
      autoFirstPage: true,
    });

    const fontRegular = path.join(
      process.cwd(),
      "public",
      "fonts",
      "Inter-Regular.ttf"
    );
    const fontBold = path.join(
      process.cwd(),
      "public",
      "fonts",
      "Inter-Bold.ttf"
    );

    const hasRegular = fs.existsSync(fontRegular);
    const hasBold = fs.existsSync(fontBold);

    if (hasRegular) docPdf.registerFont("Inter", fontRegular);
    if (hasBold) docPdf.registerFont("InterBold", fontBold);

    docPdf.font(hasRegular ? "Inter" : "Helvetica");

    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      docPdf.on("data", (c) => chunks.push(c));
      docPdf.on("end", () => resolve(Buffer.concat(chunks)));
      docPdf.on("error", reject);
    });

    // ===== Cabeçalho =====
    docPdf
      .font(hasBold ? "InterBold" : hasRegular ? "Inter" : "Helvetica-Bold")
      .fontSize(14)
      .text("Maison Noor Parfums", { align: "center" });

    docPdf.moveDown(0.2);

    docPdf
      .font(hasRegular ? "Inter" : "Helvetica")
      .fontSize(10)
      .text("Comprovante de Pedido", { align: "center" });

    docPdf.moveDown(0.6);
    line(docPdf, usableW);
    docPdf.moveDown(0.6);

    // ===== Dados =====
    const numero = pedido.numero ?? "";
    docPdf
      .font(hasBold ? "InterBold" : hasRegular ? "Inter" : "Helvetica-Bold")
      .fontSize(11)
      .text(`Pedido ${numero ? "#" + numero : ""}`);

    docPdf.moveDown(0.2);
    docPdf.font(hasRegular ? "Inter" : "Helvetica").fontSize(10);

    if (pedido.clienteNome) docPdf.text(`Cliente: ${pedido.clienteNome}`);
    if (pedido.telefone) docPdf.text(`Telefone: ${pedido.telefone}`);
    if (pedido.origem) docPdf.text(`Origem: ${pedido.origem}`);
    if (pedido.status) docPdf.text(`Status: ${pedido.status}`);
    const dtLabel = safeDateLabel(pedido.createdAt);
    if (dtLabel) docPdf.text(`Data: ${dtLabel}`);

    docPdf.moveDown(0.6);
    line(docPdf, usableW);
    docPdf.moveDown(0.6);

    // ===== Itens =====
    docPdf
      .font(hasBold ? "InterBold" : hasRegular ? "Inter" : "Helvetica-Bold")
      .fontSize(11)
      .text("Itens");

    docPdf.moveDown(0.4);

    const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
    let subtotal = 0;

    // colunas (térmica)
    const colQtd = 26;
    const colUnit = 72;
    const colTotal = 72;
    const colNome = usableW;

    docPdf.font(hasRegular ? "Inter" : "Helvetica").fontSize(10);

    for (const it of itens) {
      const qtd = Math.max(0, Number(it.qtd || 0));
      const preco = Math.max(0, Number(it.preco || 0));
      const totalItem = qtd * preco;
      subtotal += totalItem;

      // Nome (quebra automático)
      docPdf
        .font(hasBold ? "InterBold" : hasRegular ? "Inter" : "Helvetica-Bold")
        .text(it.nome || "Item", { width: colNome });

      // Linha “qtd x unit = total” alinhada
      docPdf
        .font(hasRegular ? "Inter" : "Helvetica")
        .fontSize(9);

      const y = docPdf.y;

      docPdf.text(`${qtd}x`, docPdf.page.margins.left, y, {
        width: colQtd,
        align: "left",
      });

      docPdf.text(brl(preco), docPdf.page.margins.left + colQtd, y, {
        width: colUnit,
        align: "left",
      });

      docPdf.text(brl(totalItem), docPdf.page.margins.left + colQtd + colUnit, y, {
        width: colTotal,
        align: "right",
      });

      docPdf.moveDown(0.7);
      docPdf.fontSize(10);
    }

    const desconto = Math.max(0, Number(pedido.desconto || 0));
    const frete = Math.max(0, Number(pedido.frete || 0));
    const total = Math.max(0, subtotal - desconto + frete);

    line(docPdf, usableW);
    docPdf.moveDown(0.6);

    // ===== Totais =====
    docPdf.font(hasRegular ? "Inter" : "Helvetica").fontSize(10);

    // Alinha label esquerda e valor direita
    const xL = docPdf.page.margins.left;
    const xR = docPdf.page.margins.left;
    const w = usableW;

    function row(label: string, value: string) {
      const y = docPdf.y;
      docPdf.text(label, xL, y, { width: w * 0.62, align: "left" });
      docPdf.text(value, xR, y, { width: w, align: "right" });
      docPdf.moveDown(0.3);
    }

    row("Subtotal", brl(subtotal));
    if (desconto > 0) row("Desconto", `- ${brl(desconto)}`);
    if (frete > 0) row("Frete", brl(frete));

    docPdf.moveDown(0.2);

    docPdf
      .font(hasBold ? "InterBold" : hasRegular ? "Inter" : "Helvetica-Bold")
      .fontSize(12);

    row("TOTAL", brl(total));

    docPdf.moveDown(0.6);
    line(docPdf, usableW);
    docPdf.moveDown(0.7);

    // ===== Rodapé =====
    docPdf.font(hasRegular ? "Inter" : "Helvetica").fontSize(9);
    docPdf.text("Obrigado pela preferência 💛", { align: "center" });
    docPdf.moveDown(0.2);
    docPdf.text("Maison Noor Parfums", { align: "center" });

    docPdf.end();

    const pdfBuffer = await done;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=pedido-${pedido.numero ?? pedidoId}.pdf`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}

// src/services/financeiro.ts
import { db } from "@/services/firebase"; // ajuste esse caminho se o seu firebase.ts estiver em outro lugar
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

export type LancamentoFinanceiro = {
  id?: string;
  tipo: "entrada" | "saida";
  valor: number;
  descricao: string;
  formaPagamento: string;
  data: Date;
  createdAt?: Date;
};

// salva um lançamento na coleção "financeiro"
export async function salvarLancamentoFinanceiro(input: {
  tipo: "entrada" | "saida";
  valor: number;
  descricao: string;
  formaPagamento: string;
}) {
  await addDoc(collection(db, "financeiro"), {
    ...input,
    data: Timestamp.now(),
    createdAt: Timestamp.now(),
  });
}

// lista todos os lançamentos (ordenados por data desc)
export async function listarLancamentosFinanceiro(): Promise<
  LancamentoFinanceiro[]
> {
  const q = query(
    collection(db, "financeiro"),
    orderBy("data", "desc"),
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      id: doc.id,
      tipo: data.tipo,
      valor: data.valor,
      descricao: data.descricao,
      formaPagamento: data.formaPagamento,
      data: data.data?.toDate?.() ?? new Date(),
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    };
  });
}

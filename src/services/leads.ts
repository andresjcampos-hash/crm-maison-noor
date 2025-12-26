import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toDateSafe } from "@/utils/firestoreDate";

export type LeadUI = {
  id: string;
  nome: string;
  perfilOlfativo: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export async function getLeads(): Promise<LeadUI[]> {
  const snapshot = await getDocs(collection(db, "leads"));

  return snapshot.docs.map((doc) => {
    const data = doc.data() as any;

    return {
      id: doc.id,
      nome: data.nome ?? "",
      perfilOlfativo:
        data.perfilOlfativo ??
        data.perfil_olfativo ??
        data.perfil?.olfativo ??
        null,
      createdAt: toDateSafe(data.createdAt),
      updatedAt: toDateSafe(data.updatedAt),
    };
  });
}

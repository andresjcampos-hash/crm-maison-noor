import { addDoc, collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Interaction } from "@/models/interaction";

const col = collection(db, "interactions");

export async function createInteraction(input: Omit<Interaction, "id">) {
  const ref = await addDoc(col, input);
  return ref.id;
}

export async function listInteractions(leadId: string) {
  const q = query(col, where("leadId", "==", leadId), orderBy("createdAt", "desc"), limit(200));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Interaction));
}

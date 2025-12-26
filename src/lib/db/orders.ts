import { addDoc, collection, doc, getDocs, limit, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order } from "@/models/order";

const col = collection(db, "orders");

export async function createOrder(input: Omit<Order, "id">) {
  const ref = await addDoc(col, input);
  return ref.id;
}

export async function listOrders(filters?: { leadId?: string }) {
  const clauses: any[] = [];
  if (filters?.leadId) clauses.push(where("leadId", "==", filters.leadId));
  const q = query(col, ...clauses, orderBy("createdAt", "desc"), limit(200));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Order));
}

export async function updateOrder(id: string, patch: Partial<Order>) {
  await updateDoc(doc(db, "orders", id), patch as any);
}

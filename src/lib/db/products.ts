import { addDoc, collection, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/models/product";

const col = collection(db, "products");

export async function createProduct(input: Omit<Product, "id">) {
  const ref = await addDoc(col, input);
  return ref.id;
}

export async function listProducts() {
  const q = query(col, orderBy("createdAt", "desc"), limit(300));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Product));
}

export async function updateProduct(id: string, patch: Partial<Product>) {
  await updateDoc(doc(db, "products", id), patch as any);
}

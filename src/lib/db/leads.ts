import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Lead, LeadStage, OlfactoryProfile } from "@/models/lead";

const col = collection(db, "leads");

// helper: garante Timestamp (entrada)
function ts(v: Timestamp | Date | number) {
  if (v instanceof Timestamp) return v;
  if (v instanceof Date) return Timestamp.fromDate(v);
  return Timestamp.fromMillis(v);
}

// helper: normaliza saída para ms (funciona com Timestamp, Date, number, {seconds,nanoseconds})
function toMs(v: any): number | null {
  if (v == null) return null;

  if (v instanceof Timestamp) return v.toMillis();

  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isNaN(t) ? null : t;
  }

  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  if (typeof v === "object" && typeof v.seconds === "number") {
    const ms = v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1e6);
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof v === "string") {
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? null : t;
  }

  return null;
}

// ✅ normaliza valores do perfil (corrige variações)
function normalizeProfile(v: any): OlfactoryProfile {
  if (!v) return "indefinido";
  if (typeof v !== "string") return "indefinido";

  const s = v.trim().toLowerCase();

  const allowed: OlfactoryProfile[] = [
    "indefinido",
    "doce",
    "amadeirado",
    "floral",
    "oriental",
    "fresco",
    "arabe_intenso",
  ];

  const map: Record<string, OlfactoryProfile> = {
    "árabe intenso": "arabe_intenso",
    "arabe intenso": "arabe_intenso",
    "arabe-intenso": "arabe_intenso",
    "arab_intense": "arabe_intenso",
    "arab intense": "arabe_intenso",
    "arabeintenso": "arabe_intenso",
  };

  if (map[s]) return map[s];
  if (allowed.includes(s as any)) return s as OlfactoryProfile;

  return "indefinido";
}

function normalizeLeadOut(id: string, data: any): Lead {
  // 🔥 tenta achar o perfil em vários nomes possíveis (typos e versões antigas)
  const rawProfile =
    data.olfactoryProfile ??
    data.olfactiveProfile ?? // variação comum
    data.olfatoryProfile ?? // typo comum
    data.perfilOlfativo ??
    data.perfil_olfativo ??
    data.olfactory_profile ?? // snake_case
    data.perfil?.olfativo ??
    null;

  const olfactoryProfile = normalizeProfile(rawProfile);

  return {
    id,
    ...data,

    // ✅ garante o campo padrão da UI
    olfactoryProfile,

    // datas padronizadas (ms)
    createdAt: toMs(data.createdAt) ?? Date.now(),
    updatedAt: toMs(data.updatedAt) ?? Date.now(),
    lastInteractionAt: toMs(data.lastInteractionAt),
    nextActionAt: toMs(data.nextActionAt),
  } as Lead;
}

export async function createLead(input: Omit<Lead, "id">) {
  const now = Timestamp.now();

  const payload: any = {
    ...input,

    // ✅ garante perfil olfativo padronizado na escrita também
    olfactoryProfile: normalizeProfile((input as any).olfactoryProfile),

    createdAt: input.createdAt ? ts(input.createdAt as any) : now,
    updatedAt: input.updatedAt ? ts(input.updatedAt as any) : now,
  };

  if (payload.lastInteractionAt) payload.lastInteractionAt = ts(payload.lastInteractionAt);
  if (payload.nextActionAt) payload.nextActionAt = ts(payload.nextActionAt);

  const ref = await addDoc(col, payload);
  return ref.id;
}

export async function getLead(id: string): Promise<Lead | null> {
  const snap = await getDoc(doc(db, "leads", id));
  if (!snap.exists()) return null;
  return normalizeLeadOut(snap.id, snap.data());
}

export async function listLeads(filters?: {
  stage?: LeadStage;
  profile?: OlfactoryProfile;
  ownerUserId?: string;
}) {
  const clauses: any[] = [];
  if (filters?.stage) clauses.push(where("stage", "==", filters.stage));
  if (filters?.profile) clauses.push(where("olfactoryProfile", "==", filters.profile));
  if (filters?.ownerUserId) clauses.push(where("ownerUserId", "==", filters.ownerUserId));

  const q = query(col, ...clauses, orderBy("updatedAt", "desc"), limit(200));
  const snaps = await getDocs(q);

  return snaps.docs.map((d) => normalizeLeadOut(d.id, d.data()));
}

export async function updateLead(id: string, patch: Partial<Lead>) {
  const safe: any = { ...patch };

  // ✅ se vier perfil, normaliza antes de salvar
  if ("olfactoryProfile" in safe) {
    safe.olfactoryProfile = normalizeProfile(safe.olfactoryProfile);
  }

  // entrada -> Timestamp (Firestore)
  if (safe.createdAt) safe.createdAt = ts(safe.createdAt);
  if (safe.updatedAt) safe.updatedAt = ts(safe.updatedAt);
  if (safe.lastInteractionAt) safe.lastInteractionAt = ts(safe.lastInteractionAt);
  if (safe.nextActionAt) safe.nextActionAt = ts(safe.nextActionAt);

  await updateDoc(doc(db, "leads", id), safe);
}

export async function moveLeadStage(leadId: string, nextStage: LeadStage) {
  const now = Timestamp.now();
  const patch: any = { stage: nextStage, updatedAt: now };

  const needsNext = ["conversando", "qualificando", "interessado"].includes(nextStage);
  if (needsNext) {
    const nextMs = now.toMillis() + 24 * 60 * 60 * 1000;
    patch.nextActionAt = Timestamp.fromMillis(nextMs);
  }

  if (nextStage === "perdido") patch.nextActionAt = null;

  await updateDoc(doc(db, "leads", leadId), patch);
}

// ✅ Excluir lead (para o botão "Excluir" na UI)
export async function deleteLead(id: string) {
  await deleteDoc(doc(db, "leads", id));
}

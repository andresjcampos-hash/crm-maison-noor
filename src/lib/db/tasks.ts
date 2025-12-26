import {
  Timestamp,
  addDoc,
  collection,
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
import type { Task, TaskStatus, TaskType } from "@/models/task";
import { ts, type TaskPatch } from "@/models/task";

const COLLECTION = "tasks";
const col = collection(db, COLLECTION);

/* =========================
   Helpers de data
========================= */
function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function addHours(base: Date, hours: number) {
  const d = new Date(base);
  d.setHours(d.getHours() + hours);
  return d;
}

function mapDocToTask(d: any): Task {
  const data = d.data() as any;
  return {
    id: d.id,
    type: data.type as TaskType,
    leadId: data.leadId as string,
    status: data.status as TaskStatus,
    createdAt: data.createdAt as Timestamp,
    dueAt: data.dueAt as Timestamp,
  };
}

/* =========================
   Labels (UI)
========================= */
export function taskLabel(type: TaskType) {
  switch (type) {
    case "followup_24h":
      return "Follow-up (24h)";
    case "followup_48h":
      return "Follow-up (48h)";
    case "post_sale_3d":
      return "Pós-venda (3 dias)";
    case "winback_30d":
      return "Winback (30 dias)";
    default:
      return type;
  }
}

/* =========================
   Criação automática (Lead → Tasks)
========================= */
/**
 * Cria tarefas padrão para um Lead recém-criado:
 * - followup_24h  (+24h)
 * - followup_48h  (+48h)
 * - post_sale_3d  (+3 dias)
 * - winback_30d   (+30 dias)
 */
export async function createDefaultTasksForLead(leadId: string) {
  const now = new Date();

  const defaults: Array<{ type: TaskType; dueAt: Date }> = [
    { type: "followup_24h", dueAt: addHours(now, 24) },
    { type: "followup_48h", dueAt: addHours(now, 48) },
    { type: "post_sale_3d", dueAt: addDays(now, 3) },
    { type: "winback_30d", dueAt: addDays(now, 30) },
  ];

  await Promise.all(
    defaults.map((t) =>
      addDoc(col, {
        type: t.type,
        leadId,
        status: "open" satisfies TaskStatus,
        createdAt: Timestamp.fromDate(now),
        dueAt: Timestamp.fromDate(t.dueAt),
      })
    )
  );
}

/* =========================
   Listagem
========================= */
export async function listOpenTasks() {
  const q = query(col, where("status", "==", "open"), orderBy("dueAt", "asc"), limit(200));
  const snaps = await getDocs(q);
  return snaps.docs.map(mapDocToTask);
}

export async function listOverdueOpenTasks() {
  const now = Timestamp.now();

  const q = query(
    col,
    where("status", "==", "open"),
    where("dueAt", "<", now),
    orderBy("dueAt", "asc"),
    limit(200)
  );

  const snaps = await getDocs(q);
  return snaps.docs.map(mapDocToTask);
}

export async function listOpenTasksBetween(start: Date, end: Date) {
  const startTs = Timestamp.fromDate(start);
  const endTs = Timestamp.fromDate(end);

  const q = query(
    col,
    where("status", "==", "open"),
    where("dueAt", ">=", startTs),
    where("dueAt", "<", endTs),
    orderBy("dueAt", "asc"),
    limit(200)
  );

  const snaps = await getDocs(q);
  return snaps.docs.map(mapDocToTask);
}

/* =========================
   Atualização
========================= */
/**
 * Atualiza uma task.
 * Aceita Timestamp | Date | number nos campos de data.
 */
export async function updateTask(id: string, patch: TaskPatch) {
  const safePatch: any = { ...patch };

  if (safePatch.createdAt) safePatch.createdAt = ts(safePatch.createdAt);
  if (safePatch.dueAt) safePatch.dueAt = ts(safePatch.dueAt);

  await updateDoc(doc(db, COLLECTION, id), safePatch);
}

/* =========================
   Ações rápidas
========================= */

/**
 * Conclui uma task.
 * ✅ Se a task concluída for "post_sale_3d", cria/atualiza automaticamente a "winback_30d" para +30 dias.
 */
export async function markTaskDone(id: string) {
  // 1) Lê antes, pra garantir type/leadId
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return;

  const task = snap.data() as any;

  // 2) Marca como done
  await updateTask(id, { status: "done" });

  // 3) Pós-venda concluído → criar winback em +30 dias
  if (task.type === "post_sale_3d" && task.leadId) {
    const now = new Date();

    await upsertLeadTaskByType({
      leadId: task.leadId,
      type: "winback_30d",
      dueAt: addDays(now, 30),
      status: "open",
    });
  }
}

export async function skipTask(id: string) {
  await updateTask(id, { status: "skipped" });
}

/* =========================
   POLÍTICA DO KANBAN
========================= */

/**
 * Atualiza todas as tasks de um lead com status em aberto → novo status
 */
export async function bulkUpdateLeadTasksStatus(
  leadId: string,
  fromStatuses: TaskStatus[],
  toStatus: TaskStatus
) {
  const q = query(
    col,
    where("leadId", "==", leadId),
    where("status", "in", fromStatuses),
    limit(500)
  );

  const snaps = await getDocs(q);
  await Promise.all(snaps.docs.map((d) => updateDoc(d.ref, { status: toStatus })));
}

/**
 * Garante que existe UMA task por (leadId + type).
 * Se existir → atualiza
 * Se não existir → cria
 */
export async function upsertLeadTaskByType(params: {
  leadId: string;
  type: TaskType;
  dueAt: Timestamp | Date | number;
  status?: TaskStatus;
}) {
  const { leadId, type, dueAt, status = "open" } = params;

  const q = query(col, where("leadId", "==", leadId), where("type", "==", type), limit(1));

  const snaps = await getDocs(q);
  const now = Timestamp.now();
  const dueAtTs = ts(dueAt);

  if (!snaps.empty) {
    await updateDoc(snaps.docs[0].ref, { dueAt: dueAtTs, status });
    return snaps.docs[0].id;
  }

  const created = await addDoc(col, {
    leadId,
    type,
    dueAt: dueAtTs,
    status,
    createdAt: now,
  });

  return created.id;
}

/**
 * Aplica regras automáticas quando o Lead muda de estágio (Kanban)
 * - perdido: pula todas as tasks abertas
 * - conversando/qualificando/interessado: garante followups 24h/48h
 * - ganho/vendido/fechado/pago: cria pós-venda (post_sale_3d)
 */
export async function applyTasksPolicyForLeadStage(leadId: string, nextStage: string) {
  const stage = (nextStage || "").toLowerCase();

  // 🔴 Lead perdido → pula todas as tasks abertas
  if (stage === "perdido") {
    await bulkUpdateLeadTasksStatus(leadId, ["open"], "skipped");
    return;
  }

  // 🟢 Estágios ativos → garantir followups
  const activeStages = ["conversando", "qualificando", "interessado"];
  if (activeStages.includes(stage)) {
    const now = new Date();

    await upsertLeadTaskByType({
      leadId,
      type: "followup_24h",
      dueAt: addHours(now, 24),
      status: "open",
    });

    await upsertLeadTaskByType({
      leadId,
      type: "followup_48h",
      dueAt: addHours(now, 48),
      status: "open",
    });

    return;
  }

  // 🏆 Lead ganho/vendido/fechado/pago → criar pós-venda (3 dias)
  const wonStages = ["ganho", "vendido", "fechado", "concluido", "concluído", "pago"];
  if (wonStages.includes(stage)) {
    const now = new Date();

    await upsertLeadTaskByType({
      leadId,
      type: "post_sale_3d",
      dueAt: addDays(now, 3),
      status: "open",
    });

    return;
  }
}

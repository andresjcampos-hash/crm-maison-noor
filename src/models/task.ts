import { Timestamp } from "firebase/firestore";

export type TaskType =
  | "followup_24h"
  | "followup_48h"
  | "post_sale_3d"
  | "winback_30d";

export type TaskStatus = "open" | "done" | "skipped";

export interface Task {
  id: string;
  type: TaskType;
  leadId: string;

  dueAt: Timestamp;
  status: TaskStatus;

  createdAt: Timestamp;
}

/**
 * Patch tipado para updates (sem obrigar 'id').
 */
export type TaskPatch = Partial<Omit<Task, "id">>;

/**
 * Converte Timestamp/Date/number para Timestamp (útil em forms/patch).
 */
export function ts(value: Timestamp | Date | number): Timestamp {
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  return Timestamp.fromMillis(value);
}

/**
 * Helper para UI: transforma timestamps em Date e millis.
 */
export function taskToUi(task: Task) {
  return {
    ...task,
    dueAtDate: task.dueAt.toDate(),
    createdAtDate: task.createdAt.toDate(),
    dueAtMs: task.dueAt.toMillis(),
    createdAtMs: task.createdAt.toMillis(),
  };
}

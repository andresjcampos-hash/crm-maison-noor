"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/models/task";
import { taskLabel } from "@/lib/db/tasks"; // se você não tiver, eu te passo já
import {
  listOverdueOpenTasks,
  listOpenTasksBetween,
  markTaskDone,
  skipTask,
} from "@/lib/db/tasks";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrow() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function TasksDashboardView() {
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [today, setToday] = useState<Task[]>([]);
  const [next7, setNext7] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const todayStart = startOfToday();
    const tomorrowStart = startOfTomorrow();
    const next7End = addDays(tomorrowStart, 7);

    const [a, b, c] = await Promise.all([
      listOverdueOpenTasks(),
      listOpenTasksBetween(todayStart, tomorrowStart),
      listOpenTasksBetween(tomorrowStart, next7End),
    ]);

    setOverdue(a);
    setToday(b);
    setNext7(c);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function done(id: string) {
    await markTaskDone(id);
    await load();
  }

  async function skip(id: string) {
    await skipTask(id);
    await load();
  }

  function TaskList({ title, items }: { title: string; items: Task[] }) {
    return (
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>
          {title} ({items.length})
        </h3>

        {items.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Nenhuma tarefa.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((t) => (
              <div
                key={t.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{taskLabel(t.type)}</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    Lead: {t.leadId}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    Vence: {t.dueAt.toDate().toLocaleString()}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => done(t.id)}>Concluir</button>
                  <button onClick={() => skip(t.id)}>Pular</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading) return <div>Carregando tarefas...</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <TaskList title="🚨 Vencidas" items={overdue} />
      <TaskList title="📌 Hoje" items={today} />
      <TaskList title="🗓️ Próximos 7 dias" items={next7} />
    </div>
  );
}

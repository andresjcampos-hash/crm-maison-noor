"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead, LeadStage, OlfactoryProfile } from "@/models/lead";
import { getLead, updateLead } from "@/lib/db/leads";
import { createInteraction, listInteractions } from "@/lib/db/interactions";
import CopyMessageButton from "@/components/CopyMessageButton";
import OpenWhatsAppButton from "@/components/OpenWhatsAppButton";
import { toDateSafe } from "@/utils/firestoreDate";

/* =========================
   Constantes
========================= */
const stages: LeadStage[] = [
  "novo",
  "conversando",
  "qualificando",
  "interessado",
  "fechado",
  "pos_venda",
  "perdido",
];

const profiles: OlfactoryProfile[] = [
  "indefinido",
  "doce",
  "amadeirado",
  "floral",
  "oriental",
  "fresco",
  "arabe_intenso",
];

/* =========================
   Helpers Perfil
========================= */
function normalizeProfile(v: any): OlfactoryProfile {
  if (!v || typeof v !== "string") return "indefinido";
  const s = v.trim().toLowerCase();

  const map: Record<string, OlfactoryProfile> = {
    "árabe intenso": "arabe_intenso",
    "arabe intenso": "arabe_intenso",
    "arabe-intenso": "arabe_intenso",
    "arab intense": "arabe_intenso",
  };

  if (map[s]) return map[s];
  if (profiles.includes(s as OlfactoryProfile)) return s as OlfactoryProfile;

  return "indefinido";
}

function profileLabel(p: OlfactoryProfile) {
  switch (p) {
    case "doce": return "Doce";
    case "amadeirado": return "Amadeirado";
    case "floral": return "Floral";
    case "oriental": return "Oriental";
    case "fresco": return "Fresco";
    case "arabe_intenso": return "Árabe intenso";
    default: return "Indefinido";
  }
}

function ProfileBadge({ value }: { value: OlfactoryProfile }) {
  return (
    <span className={`badge-pill badge-${value}`}>
      <span className="badge-dot" />
      {profileLabel(value)}
    </span>
  );
}

function renderDate(v: unknown) {
  const d = toDateSafe(v);
  return d ? d.toLocaleString() : "—";
}

/* =========================
   Component
========================= */
export default function LeadDetailView({ leadId }: { leadId: string }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [interactions, setInteractions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const l = await getLead(leadId);
      setLead(l);
      if (l) setInteractions(await listInteractions(leadId));
      setLoading(false);
    })();
  }, [leadId]);

  /* =========================
     Auto-save handlers
  ========================= */
  async function updateStage(stage: LeadStage) {
    if (!lead) return;
    setLead({ ...lead, stage });

    await updateLead(lead.id, {
      stage,
      updatedAt: Date.now(),
    });
  }

  async function updateProfile(profile: OlfactoryProfile) {
    if (!lead) return;
    setLead({ ...lead, olfactoryProfile: profile });

    await updateLead(lead.id, {
      olfactoryProfile: profile,
      updatedAt: Date.now(),
    });
  }

  /* =========================
     Mensagens
  ========================= */
  const msgQualificacao = useMemo(
    () =>
      `Oi ${lead?.name || ""}! 😊 Rapidinho: você gosta mais de perfume DOCE ou mais MARCANTE/AMADEIRADO? ` +
      `É pra usar mais de DIA (calor) ou mais à NOITE (frio)?`,
    [lead?.name]
  );

  const msgFollowup24h = useMemo(
    () =>
      `Passando só pra não te deixar sem retorno 😊 Você prefere algo mais DOCE ou mais ELEGANTE/AMADEIRADO?`,
    []
  );

  /* =========================
     Interações
  ========================= */
  async function addInteraction() {
    if (!lead) return;
    if (!summary.trim()) return alert("Descreva a interação.");

    const now = Date.now();
    const nextMs = nextAction ? new Date(nextAction).getTime() : NaN;

    await createInteraction({
      leadId: lead.id,
      channel: "whatsapp",
      summary,
      createdAt: now,
      nextActionAt: Number.isFinite(nextMs) ? nextMs : undefined,
      createdByUserId: "SET_YOUR_UID_HERE",
    });

    await updateLead(lead.id, {
      lastInteractionAt: now,
      updatedAt: now,
    });

    setSummary("");
    setNextAction("");
    setInteractions(await listInteractions(lead.id));
  }

  if (loading) return <div className="muted">Carregando...</div>;
  if (!lead) return <div className="card">Lead não encontrado.</div>;

  return (
    <div className="grid">
      {/* =========================
          COLUNA ESQUERDA
      ========================= */}
      <div className="card">
        <h1 className="h1">{lead.name}</h1>

        {/* 🔥 STATUS + PERFIL EDITÁVEIS */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <select
            className="select"
            value={lead.stage}
            onChange={(e) => updateStage(e.target.value as LeadStage)}
          >
            {stages.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="select"
            value={lead.olfactoryProfile}
            onChange={(e) =>
              updateProfile(normalizeProfile(e.target.value))
            }
          >
            {profiles.map((p) => (
              <option key={p} value={p}>
                {profileLabel(p)}
              </option>
            ))}
          </select>

          <ProfileBadge value={lead.olfactoryProfile} />
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <label>WhatsApp</label>
            <input
              className="input"
              value={lead.whatsapp ?? ""}
              onChange={(e) =>
                setLead({ ...lead, whatsapp: e.target.value })
              }
            />
          </div>

          <div>
            <label>Instagram</label>
            <input
              className="input"
              value={lead.instagram ?? ""}
              onChange={(e) =>
                setLead({ ...lead, instagram: e.target.value })
              }
            />
          </div>

          <div>
            <label>Observações</label>
            <textarea
              className="input"
              rows={4}
              value={lead.notes ?? ""}
              onChange={(e) =>
                setLead({ ...lead, notes: e.target.value })
              }
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <OpenWhatsAppButton phone={lead.whatsapp} text={msgQualificacao} />
            <CopyMessageButton text={msgQualificacao} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <OpenWhatsAppButton phone={lead.whatsapp} text={msgFollowup24h} />
            <CopyMessageButton text={msgFollowup24h} />
          </div>
        </div>
      </div>

      {/* =========================
          COLUNA DIREITA
      ========================= */}
      <div className="card">
        <div className="h2">Registrar interação</div>

        <div style={{ display: "grid", gap: 10 }}>
          <textarea
            className="input"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Ex: Pediu indicação doce, mostrei Sabah e Yara..."
          />

          <input
            className="input"
            type="datetime-local"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
          />

          <button className="btn primary" onClick={addInteraction}>
            Salvar interação
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="h2">Histórico</div>

          <div style={{ display: "grid", gap: 10 }}>
            {interactions.map((it) => (
              <div key={it.id} className="card" style={{ padding: 10 }}>
                <div style={{ fontWeight: 800 }}>
                  {renderDate(it.createdAt)}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {it.summary}
                </div>
              </div>
            ))}
            {interactions.length === 0 && (
              <div className="muted">Sem histórico ainda.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

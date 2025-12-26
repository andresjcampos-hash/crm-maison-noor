"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Lead, LeadStage, OlfactoryProfile } from "@/models/lead";
import { createLead, listLeads, updateLead, deleteLead } from "@/lib/db/leads";
import { toDateSafe } from "@/utils/firestoreDate";

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

function renderDate(v: unknown) {
  const d = toDateSafe(v);
  return d ? d.toLocaleString("pt-BR") : "—";
}

export default function LeadsView() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Novo lead
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [stage, setStage] = useState<LeadStage>("novo");
  const [profile, setProfile] = useState<OlfactoryProfile>("indefinido");

  // UI states
  const [toast, setToast] = useState<string>("");
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function refresh() {
    try {
      setLoading(true);
      const data = await listLeads();
      setItems(data);
      setDirty({});
    } catch (e) {
      showToast("⚠️ Falha ao carregar leads.");
    } finally {
      setLoading(false);
    }
  }

  function markDirty(id: string) {
    setDirty((d) => ({ ...d, [id]: true }));
  }

  function patchItem(id: string, patch: Partial<Lead>) {
    setItems((prev) => prev.map((x) => (x.id === id ? ({ ...x, ...patch } as Lead) : x)));
    markDirty(id);
  }

  async function saveInline(lead: Lead) {
    if (!dirty[lead.id]) return;

    try {
      setSavingIds((s) => ({ ...s, [lead.id]: true }));

      await updateLead(lead.id, {
        name: lead.name,
        whatsapp: lead.whatsapp ?? "",
        instagram: lead.instagram ?? "",
        stage: lead.stage,
        olfactoryProfile: lead.olfactoryProfile,
        updatedAt: Date.now(),
      });

      showToast("✅ Lead atualizado!");
      await refresh();
    } catch (e) {
      showToast("⚠️ Erro ao salvar alterações.");
    } finally {
      setSavingIds((s) => ({ ...s, [lead.id]: false }));
    }
  }

  async function remove(id: string) {
    const ok = confirm("Deseja excluir este lead? (não dá para desfazer)");
    if (!ok) return;

    try {
      setSavingIds((s) => ({ ...s, [id]: true }));
      await deleteLead(id);
      showToast("🗑️ Lead excluído!");
      await refresh();
    } catch (e) {
      showToast("⚠️ Erro ao excluir lead.");
    } finally {
      setSavingIds((s) => ({ ...s, [id]: false }));
    }
  }

  const canCreate = useMemo(() => {
    return name.trim().length >= 2;
  }, [name]);

  async function add() {
    if (!canCreate) {
      showToast("⚠️ Informe o nome do lead.");
      return;
    }

    try {
      setCreating(true);

      const now = Date.now();
      const ownerUserId = "SET_YOUR_UID_HERE"; // depois troca pelo uid real do login

      await createLead({
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        instagram: instagram.trim(),
        stage,
        olfactoryProfile: profile,
        cityState: "",
        origin: "instagram",
        notes: "",
        ownerUserId,
        createdAt: now,
        updatedAt: now,
        lastInteractionAt: now,
        nextActionAt: now + 24 * 60 * 60 * 1000,
      });

      setName("");
      setWhatsapp("");
      setInstagram("");
      setStage("novo");
      setProfile("indefinido");

      showToast("✅ Lead criado!");
      await refresh();
    } catch (e) {
      showToast("⚠️ Erro ao criar lead.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="leads-grid">
      {toast ? <div className="toast">{toast}</div> : null}

      {/* LISTA (EM CIMA) */}
      <div className="card">
        <h1 className="h1">Leads</h1>
        <div className="muted" style={{ marginBottom: 10 }}>
          Edite na tabela e clique <b>Salvar</b>. (os campos ficam marcados como “Alterado”)
        </div>

        {loading ? (
          <div className="muted">Carregando...</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Status</th>
                  <th>Perfil</th>
                  <th>Instagram</th>
                  <th>WhatsApp</th>
                  <th>Atualizado</th>
                  <th className="actions">Ações</th>
                </tr>
              </thead>

              <tbody>
                {items.map((l) => {
                  const isDirty = !!dirty[l.id];
                  const isSaving = !!savingIds[l.id];

                  return (
                    <tr key={l.id}>
                      <td>
                        {/* Ajustei o link para /crm/leads/... (mais consistente com sua estrutura) */}
                        <Link
                          href={`/crm/leads/${l.id}`}
                          style={{ color: "var(--accent)", fontWeight: 800 }}
                        >
                          {l.name}
                        </Link>

                        {isDirty && (
                          <div className="muted" style={{ fontSize: 11 }}>
                            Alterado (não salvo)
                          </div>
                        )}
                      </td>

                      <td>
                        <select
                          className="select"
                          value={l.stage}
                          onChange={(e) => patchItem(l.id, { stage: e.target.value as LeadStage })}
                          disabled={isSaving}
                        >
                          {stages.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <select
                          className="select"
                          value={l.olfactoryProfile}
                          onChange={(e) =>
                            patchItem(l.id, { olfactoryProfile: e.target.value as OlfactoryProfile })
                          }
                          disabled={isSaving}
                        >
                          {profiles.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <input
                          className="input"
                          value={l.instagram ?? ""}
                          onChange={(e) => patchItem(l.id, { instagram: e.target.value })}
                          disabled={isSaving}
                        />
                      </td>

                      <td>
                        <input
                          className="input"
                          value={l.whatsapp ?? ""}
                          onChange={(e) => patchItem(l.id, { whatsapp: e.target.value })}
                          disabled={isSaving}
                        />
                      </td>

                      <td className="muted">{renderDate(l.updatedAt)}</td>

                      <td className="actions">
                        <div className="actions-wrap">
                          <button
                            className="btn primary"
                            onClick={() => saveInline(l)}
                            disabled={!isDirty || isSaving}
                            title={!isDirty ? "Sem alterações" : "Salvar alterações"}
                          >
                            {isSaving ? "Salvando..." : "Salvar"}
                          </button>

                          <button
                            className="btn danger"
                            onClick={() => remove(l.id)}
                            disabled={isSaving}
                            title="Excluir lead"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td className="muted" colSpan={7}>
                      Nenhum lead cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={refresh} disabled={loading}>
            Atualizar lista
          </button>
        </div>
      </div>

      {/* CADASTRO (EMBAIXO) */}
      <div className="card">
        <div className="h2">Novo lead</div>

        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <label>Nome</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Joaquim"
            />
          </div>

          <div>
            <label>WhatsApp</label>
            <input
              className="input"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(12) 9xxxx-xxxx"
            />
          </div>

          <div>
            <label>Instagram</label>
            <input
              className="input"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@cliente"
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label>Status</label>
              <select className="select" value={stage} onChange={(e) => setStage(e.target.value as LeadStage)}>
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <label>Perfil olfativo</label>
              <select
                className="select"
                value={profile}
                onChange={(e) => setProfile(e.target.value as OlfactoryProfile)}
              >
                {profiles.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button className="btn primary" onClick={add} disabled={!canCreate || creating}>
            {creating ? "Salvando..." : "Salvar lead"}
          </button>

          <div className="muted" style={{ fontSize: 12 }}>
            Nota: por enquanto, o <code>ownerUserId</code> está fixo em <code>SET_YOUR_UID_HERE</code>.
          </div>
        </div>
      </div>

      <style jsx>{`
        .leads-grid {
          display: grid;
          gap: 14px;
        }

        .toast {
          position: sticky;
          top: 14px;
          z-index: 10;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.22);
          background: rgba(200, 162, 106, 0.08);
          font-weight: 800;
          max-width: 820px;
        }

        .card {
          border-radius: 18px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
          padding: 14px;
        }

        .h1 {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 900;
        }

        .h2 {
          font-size: 14px;
          font-weight: 900;
          opacity: 0.95;
          margin-bottom: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        label {
          display: block;
          font-size: 12px;
          opacity: 0.78;
          margin-bottom: 6px;
          font-weight: 800;
        }

        .muted {
          opacity: 0.72;
          font-size: 13px;
        }

        .table-wrap {
          overflow-x: auto;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.14);
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          min-width: 980px;
        }

        th,
        td {
          padding: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          vertical-align: top;
        }

        th {
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.75;
          text-align: left;
        }

        .actions {
          width: 220px;
        }

        .actions-wrap {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .input,
        .select {
          width: 100%;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(15, 15, 22, 0.9);
          outline: none;
          color: #f2f2f2;
        }

        .input:focus,
        .select:focus {
          border-color: rgba(200, 162, 106, 0.55);
          box-shadow: 0 0 0 3px rgba(200, 162, 106, 0.12);
        }

        .btn {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(200, 162, 106, 0.25);
          background: rgba(200, 162, 106, 0.08);
          cursor: pointer;
          font-weight: 900;
          color: #f2f2f2;
        }

        .btn.primary {
          border-color: rgba(200, 162, 106, 0.4);
          background: linear-gradient(180deg, rgba(200, 162, 106, 0.18), rgba(200, 162, 106, 0.08));
        }

        .btn.danger {
          border-color: rgba(255, 90, 90, 0.35);
          background: rgba(255, 90, 90, 0.12);
          color: #ffd7d7;
        }

        .btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import type { Lead } from "@/models/lead";

export default function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.7 : 1,
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 10,
    background: "rgba(255,255,255,.03)",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
        <Link href={`/leads/${lead.id}`} style={{ fontWeight: 800, color:"var(--accent)" }}>
          {lead.name}
        </Link>
        <span className="badge">{lead.olfactoryProfile}</span>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        {lead.instagram ? `@${lead.instagram.replace(/^@/, "")}` : "sem instagram"} • {lead.whatsapp || "sem whatsapp"}
      </div>
      {lead.nextActionAt ? (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Próx ação: {new Date(lead.nextActionAt).toLocaleString()}
        </div>
      ) : null}
    </div>
  );
}

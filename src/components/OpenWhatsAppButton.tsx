"use client";

import { waLink } from "@/utils/whatsapp";

export default function OpenWhatsAppButton({ phone, text }: { phone?: string; text: string }) {
  const href = waLink(phone, text);
  return (
    <a className="btn primary" href={href || "#"} target="_blank" rel="noreferrer">
      Abrir WhatsApp
    </a>
  );
}

export function normalizePhoneBR(phoneRaw?: string) {
  if (!phoneRaw) return "";
  const digits = phoneRaw.replace(/\D/g, "");
  if (!digits) return "";
  // se não tiver DDI, assume Brasil
  if (digits.startsWith("55")) return digits;
  return "55" + digits;
}

export function waLink(phoneRaw: string | undefined, message: string) {
  const phone = normalizePhoneBR(phoneRaw);
  const text = encodeURIComponent(message);
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${text}`;
}

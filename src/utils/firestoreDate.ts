import { Timestamp } from "firebase/firestore";

type SecondsNanos = { seconds: number; nanoseconds?: number };

function isSecondsNanos(v: any): v is SecondsNanos {
  return v && typeof v === "object" && typeof v.seconds === "number";
}

export function toDateSafe(v: unknown): Date | null {
  if (!v) return null;

  // Firestore Timestamp (client SDK)
  if (v instanceof Timestamp) return v.toDate();

  // JS Date
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  // Serialized Timestamp shape: {seconds, nanoseconds}
  if (isSecondsNanos(v)) {
    const ms = v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1e6);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // number = epoch ms
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  // string date
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export function toMsSafe(v: unknown): number | null {
  const d = toDateSafe(v);
  return d ? d.getTime() : null;
}

export type Channel = "whatsapp" | "instagram";

export interface Interaction {
  id: string;
  leadId: string;

  channel: Channel;
  summary: string;

  createdAt: number;
  nextActionAt?: number;

  createdByUserId: string;
}

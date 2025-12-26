export type LeadStage =
  | "novo"
  | "conversando"
  | "qualificando"
  | "interessado"
  | "fechado"
  | "pos_venda"
  | "perdido";

export type OlfactoryProfile =
  | "indefinido"
  | "doce"
  | "amadeirado"
  | "floral"
  | "oriental"
  | "fresco"
  | "arabe_intenso";

export interface Lead {
  id: string;

  name: string;
  whatsapp?: string;
  instagram?: string;
  cityState?: string;
  origin?: string;

  stage: LeadStage;

  /**
   * Campo padrão do sistema.
   * - Sempre que possível, garanta que venha preenchido via normalização (leads.ts).
   */
  olfactoryProfile: OlfactoryProfile;

  notes?: string;

  /**
   * Enquanto não tem Auth, pode ficar opcional.
   * Quando integrar login, volte para obrigatório.
   */
  ownerUserId?: string;

  /**
   * Datas padronizadas como epoch ms (number).
   * O Firestore salva Timestamp internamente, e a camada db normaliza para number.
   */
  createdAt: number;
  updatedAt: number;

  lastInteractionAt?: number;
  nextActionAt?: number | null;
}

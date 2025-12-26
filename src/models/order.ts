export type PaymentStatus = "aguardando" | "pago" | "estornado";
export type ShippingStatus = "preparando" | "enviado" | "entregue";

export interface OrderItem {
  productId: string;
  nameSnapshot: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  leadId: string;
  items: OrderItem[];
  total: number;

  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus;

  trackingCode?: string;
  attachments?: string[];

  createdAt: number;
  updatedAt: number;
}

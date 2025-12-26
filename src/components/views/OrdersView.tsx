"use client";

import { useEffect, useMemo, useState } from "react";
import { listOrders, updateOrder } from "@/lib/db/orders";
import type { Order } from "@/models/order";

export default function OrdersView() {
  const [items, setItems] = useState<Order[]>([]);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setItems(await listOrders());
  }

  async function markPaid(o: Order) {
    await updateOrder(o.id, { paymentStatus: "pago", updatedAt: Date.now() });
    await refresh();
  }

  return (
    <div className="card">
      <h1 className="h1">Pedidos</h1>
      <div className="muted" style={{ marginBottom: 10 }}>
        (MVP) Aqui você vê os pedidos. A criação completa do pedido fica no próximo passo.
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Total</th>
            <th>Pagamento</th>
            <th>Envio</th>
            <th>Criado</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map(o => (
            <tr key={o.id}>
              <td className="muted">{o.leadId}</td>
              <td className="muted">R$ {Number(o.total || 0).toFixed(2)}</td>
              <td className="muted">{o.paymentStatus}</td>
              <td className="muted">{o.shippingStatus}</td>
              <td className="muted">{new Date(o.createdAt).toLocaleString()}</td>
              <td>
                {o.paymentStatus !== "pago" ? (
                  <button className="btn primary" onClick={() => markPaid(o)}>Marcar pago</button>
                ) : <span className="badge">Pago</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/models/product";
import { createProduct, listProducts, updateProduct } from "@/lib/db/products";

export default function ProductsView() {
  const [items, setItems] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("0");

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setItems(await listProducts());
  }

  async function add() {
    if (!name.trim()) return alert("Informe o nome do perfume.");
    const now = Date.now();
    await createProduct({
      name,
      brand,
      olfactoryProfile: "",
      notesTop: "",
      notesMiddle: "",
      notesBase: "",
      occasion: "",
      price: Number(price || 0),
      stock: Number(stock || 0),
      active: true,
      createdAt: now,
    });
    setName(""); setBrand(""); setPrice("0"); setStock("0");
    await refresh();
  }

  async function toggleActive(p: Product) {
    await updateProduct(p.id, { active: !p.active });
    await refresh();
  }

  return (
    <div className="grid">
      <div className="card">
        <h1 className="h1">Produtos</h1>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Marca</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Ativo</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 800 }}>{p.name}</td>
                <td className="muted">{p.brand || "-"}</td>
                <td className="muted">R$ {Number(p.price || 0).toFixed(2)}</td>
                <td className="muted">{p.stock}</td>
                <td>
                  <button className={"btn " + (p.active ? "primary" : "")} onClick={() => toggleActive(p)}>
                    {p.active ? "Sim" : "Não"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="h2">Novo produto</div>
        <div style={{ display:"grid", gap:10 }}>
          <div>
            <label>Nome</label>
            <input className="input" value={name} onChange={(e)=>setName(e.target.value)} />
          </div>
          <div>
            <label>Marca</label>
            <input className="input" value={brand} onChange={(e)=>setBrand(e.target.value)} />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex: 1 }}>
              <label>Preço</label>
              <input className="input" value={price} onChange={(e)=>setPrice(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Estoque</label>
              <input className="input" value={stock} onChange={(e)=>setStock(e.target.value)} />
            </div>
          </div>
          <button className="btn primary" onClick={add}>Salvar produto</button>
          <button className="btn" onClick={refresh}>Atualizar lista</button>
        </div>
      </div>
    </div>
  );
}

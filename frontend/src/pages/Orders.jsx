import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const STATUS_BADGE = {
  awaiting_credentials: "warn",
  credentials_submitted: "info",
  completed: "active",
  disputed: "danger",
  cancelled: "muted",
  refunded: "muted",
};

const TABS = [
  { v: "all", label: "All" },
  { v: "buyer", label: "Purchases" },
  { v: "seller", label: "Sales" },
];

export default function Orders() {
  const { user } = useAuth();
  const [role, setRole] = useState("all");
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/orders", { params: { role } }).then((r) => setOrders(r.data || []));
  }, [role]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-10 has-mobile-nav">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="overline mb-1">// ledger</div>
          <h1 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tighter">Orders</h1>
        </div>
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.v} onClick={() => setRole(t.v)}
              data-testid={`tab-${t.v}`}
              className={`px-4 py-2 font-mono text-[11px] tracking-widest uppercase border ${
                role === t.v ? "border-cyan text-cyan bg-cyan/10" : "border-cyan/20 text-muted-foreground hover:border-cyan/50"
              }`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      <div className="surface p-0 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 font-mono text-[10px] tracking-widest text-muted-foreground border-b border-cyan/20">
          <div className="col-span-5">LISTING</div>
          <div className="col-span-2">SIDE</div>
          <div className="col-span-2">COUNTERPARTY</div>
          <div className="col-span-1">PRICE</div>
          <div className="col-span-2 text-right">STATUS</div>
        </div>
        {orders.length === 0 && (
          <div className="text-center py-16 font-mono text-sm text-muted-foreground">
            No orders found.
          </div>
        )}
        {orders.map((o) => {
          const isBuyer = o.buyer_id === user?.id;
          return (
            <Link
              key={o.id}
              to={`/orders/${o.id}`}
              data-testid={`order-link-${o.id}`}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 border-b border-cyan/10 hover:bg-cyan/[0.03] transition-colors"
            >
              <div className="md:col-span-5">
                <div className="font-display font-bold text-sm">{o.listing_title}</div>
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground mt-1">{o.platform} · {o.id}</div>
              </div>
              <div className="md:col-span-2 text-xs font-mono">{isBuyer ? "BUYING" : "SELLING"}</div>
              <div className="md:col-span-2 text-sm">{isBuyer ? o.seller_name : o.buyer_name}</div>
              <div className="md:col-span-1 font-display font-bold text-cyan">${o.price.toFixed(2)}</div>
              <div className="md:col-span-2 md:text-right">
                <span className={`badge-${STATUS_BADGE[o.status] || "muted"}`}>{o.status.replace(/_/g, " ")}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

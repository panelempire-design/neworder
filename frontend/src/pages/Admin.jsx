import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Users, ShoppingBag, AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("disputes");

  const load = async () => {
    const [s, o, u] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/orders", { params: tab === "disputes" ? { status: "disputed" } : {} }),
      api.get("/admin/users"),
    ]);
    setStats(s.data); setOrders(o.data || []); setUsers(u.data || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const resolve = async (id, decision) => {
    try {
      await api.post(`/admin/orders/${id}/resolve`, null, { params: { decision } });
      toast.success(`Order ${decision === "release" ? "released" : "refunded"}.`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || e.message); }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10 has-mobile-nav">
      <div className="overline mb-1">// command</div>
      <h1 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tighter mb-6 flex items-center gap-2">
        <Shield className="w-7 h-7 text-cyan" /> Admin Console
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatBlock label="Users" value={stats?.users ?? "—"} icon={Users} testid="admin-stat-users" />
        <StatBlock label="Active Listings" value={stats?.active_listings ?? "—"} icon={ShoppingBag} testid="admin-stat-listings" />
        <StatBlock label="Orders" value={stats?.orders ?? "—"} icon={ShoppingBag} testid="admin-stat-orders" />
        <StatBlock label="Disputes" value={stats?.disputes ?? "—"} icon={AlertTriangle} testid="admin-stat-disputes" />
        <StatBlock label="Completed" value={stats?.completed ?? "—"} icon={CheckCircle} testid="admin-stat-completed" />
      </div>

      <div className="flex gap-1 mb-3">
        {["disputes", "all_orders", "users"].map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            data-testid={`admin-tab-${t}`}
            className={`px-4 py-2 font-mono text-[11px] tracking-widest uppercase border ${
              tab === t ? "border-cyan text-cyan bg-cyan/10" : "border-cyan/20 text-muted-foreground hover:border-cyan/50"
            }`}
          >{t.replace("_", " ")}</button>
        ))}
      </div>

      {tab !== "users" ? (
        <div className="surface p-0 overflow-hidden">
          {orders.length === 0 && <div className="text-center py-16 text-sm font-mono text-muted-foreground">No orders.</div>}
          {orders.map((o) => (
            <div key={o.id} className="px-5 py-4 border-b border-cyan/10 grid grid-cols-1 md:grid-cols-12 gap-3 items-center" data-testid={`admin-order-${o.id}`}>
              <div className="md:col-span-5">
                <Link to={`/orders/${o.id}`} className="font-display font-bold text-sm hover:text-cyan">{o.listing_title}</Link>
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground">{o.id} • {o.platform.toUpperCase()}</div>
              </div>
              <div className="md:col-span-3 text-xs">
                <div><span className="text-muted-foreground">Buyer:</span> {o.buyer_name}</div>
                <div><span className="text-muted-foreground">Seller:</span> {o.seller_name}</div>
              </div>
              <div className="md:col-span-1 font-display font-bold text-cyan">${o.price.toFixed(2)}</div>
              <div className="md:col-span-3 flex flex-wrap gap-2 justify-end">
                <span className={`badge-${o.status === "disputed" ? "danger" : o.status === "completed" ? "active" : "info"}`}>{o.status.replace(/_/g, " ")}</span>
                {(o.status === "disputed" || o.status === "credentials_submitted" || o.status === "awaiting_credentials") && (
                  <>
                    <button onClick={() => resolve(o.id, "release")} data-testid={`release-${o.id}`} className="btn-ghost text-[10px] inline-flex items-center gap-1 px-2 py-1">
                      <CheckCircle className="w-3 h-3" /> Release
                    </button>
                    <button onClick={() => resolve(o.id, "refund")} data-testid={`refund-${o.id}`} className="btn-danger text-[10px] inline-flex items-center gap-1 px-2 py-1">
                      <RotateCcw className="w-3 h-3" /> Refund
                    </button>
                  </>
                )}
              </div>
              {o.dispute_reason && (
                <div className="md:col-span-12 text-xs font-mono text-pink bg-pink/5 border border-pink/20 p-2">
                  REASON: {o.dispute_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="surface p-0 overflow-hidden">
          {users.map((u) => (
            <div key={u.id} className="px-5 py-3 border-b border-cyan/10 grid grid-cols-12 gap-2 items-center text-sm" data-testid={`admin-user-${u.id}`}>
              <div className="col-span-4 font-bold">{u.name}</div>
              <div className="col-span-4 font-mono text-xs truncate">{u.email}</div>
              <div className="col-span-2 font-mono text-[10px]">{u.role.toUpperCase()} · {u.auth_method}</div>
              <div className="col-span-2 text-right font-display font-bold text-cyan">${u.balance.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, value, icon: Icon, testid }) {
  return (
    <div className="surface p-4" data-testid={testid}>
      <div className="flex items-start justify-between mb-2">
        <div className="overline">{label}</div>
        <Icon className="w-4 h-4 text-cyan/60" />
      </div>
      <div className="font-display font-black text-2xl">{value}</div>
    </div>
  );
}

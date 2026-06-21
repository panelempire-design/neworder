import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, TrendingUp, ShoppingBag, ListPlus, Bot, ArrowUpRight, Activity, Star } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AddFundsModal from "@/components/AddFundsModal";

const STATUS_BADGE = {
  awaiting_credentials: "warn",
  credentials_submitted: "info",
  completed: "active",
  disputed: "danger",
  cancelled: "muted",
  refunded: "muted",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [txs, setTxs] = useState([]);
  const [showFunds, setShowFunds] = useState(false);

  const refresh = () => {
    api.get("/orders").then((r) => setOrders(r.data || []));
    api.get("/me/listings").then((r) => setListings(r.data || []));
    api.get("/wallet/transactions").then((r) => setTxs(r.data || []));
  };
  useEffect(refresh, []);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10 has-mobile-nav">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="overline mb-1">// console</div>
          <h1 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tighter">
            Welcome, <span className="neon-cyan">{user?.name?.split(" ")[0] || "Operator"}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to="/marketplace" data-testid="cta-browse" className="btn-ghost text-xs">Browse</Link>
          <Link to="/my-listings/new" data-testid="cta-create-listing" className="btn-primary text-xs">+ Create Listing</Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="surface p-5 relative col-span-2 md:col-span-1">
          <div className="overline">Wallet</div>
          <div className="font-display font-black text-3xl md:text-4xl text-cyan mt-2" data-testid="kpi-balance">
            ${user?.balance?.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground font-mono mt-1">
            HELD ${user?.held_balance?.toFixed(2)}
          </div>
          <button
            onClick={() => setShowFunds(true)}
            data-testid="dashboard-add-funds"
            className="mt-4 btn-primary text-xs w-full inline-flex items-center justify-center gap-1"
          >
            <Wallet className="w-3.5 h-3.5" /> Add Funds
          </button>
        </div>

        <StatCard label="Orders" value={orders.length} icon={ShoppingBag} testid="kpi-orders" />
        <StatCard label="Listings" value={listings.length} icon={ListPlus} testid="kpi-listings" />
        <StatCard label="Rating" value={(user?.rating || 0).toFixed(2)} suffix={`★ (${user?.rating_count || 0})`} icon={Star} testid="kpi-rating" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Orders */}
        <div className="lg:col-span-2 surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Recent Orders</h3>
            <Link to="/orders" data-testid="see-all-orders" className="overline hover:text-white">See all →</Link>
          </div>
          {orders.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground font-mono">
              No orders yet. Hit the marketplace.
            </div>
          )}
          <div className="space-y-2">
            {orders.slice(0, 6).map((o) => (
              <Link
                key={o.id} to={`/orders/${o.id}`} data-testid={`order-row-${o.id}`}
                className="flex items-center justify-between gap-3 p-3 border border-cyan/10 hover:border-cyan/40 hover:bg-cyan/[0.03] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-sm truncate">{o.listing_title}</div>
                  <div className="font-mono text-[10px] tracking-widest text-muted-foreground mt-0.5">
                    {o.buyer_id === user?.id ? `BUY · ${o.seller_name}` : `SELL · ${o.buyer_name}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-cyan">${o.price.toFixed(2)}</div>
                  <span className={`badge-${STATUS_BADGE[o.status] || "muted"}`}>{o.status.replace(/_/g, " ")}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Wallet Activity</h3>
            <Activity className="w-4 h-4 text-cyan" />
          </div>
          {txs.length === 0 && (
            <div className="text-center py-10 text-xs text-muted-foreground font-mono">
              No transactions yet.
            </div>
          )}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {txs.slice(0, 12).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b border-cyan/10 py-2" data-testid={`tx-row-${t.id}`}>
                <div>
                  <div className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">{t.type.replace(/_/g, " ")}</div>
                  <div className="text-xs truncate max-w-[160px]">{t.note}</div>
                </div>
                <div className={`font-display font-bold text-sm ${t.amount >= 0 ? "text-success" : "text-pink"}`}>
                  {t.amount >= 0 ? "+" : ""}${t.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Robot/quick tips */}
      <div className="mt-6 surface p-5 flex items-center gap-4 relative overflow-hidden">
        <div className="w-12 h-12 border border-cyan/40 grid place-items-center shrink-0">
          <Bot className="w-6 h-6 text-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="overline mb-1">// vault.ai whispers</div>
          <div className="text-sm">
            Sellers with verified credentials sell <span className="text-cyan font-bold">3.4x faster</span>.
            Add a clear screenshot + niche tag to your listing.
          </div>
        </div>
        <ArrowUpRight className="w-5 h-5 text-cyan hidden sm:block" />
      </div>

      <AddFundsModal open={showFunds} onClose={() => { setShowFunds(false); refresh(); }} />
    </div>
  );
}

function StatCard({ label, value, suffix, icon: Icon, testid }) {
  return (
    <div className="surface p-5 relative" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div className="overline">{label}</div>
        <Icon className="w-4 h-4 text-cyan/60" />
      </div>
      <div className="font-display font-black text-3xl mt-2">{value}</div>
      {suffix && <div className="text-xs font-mono text-muted-foreground mt-1">{suffix}</div>}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, Lock } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AddFundsModal from "@/components/AddFundsModal";

export default function Wallet() {
  const { user } = useAuth();
  const [txs, setTxs] = useState([]);
  const [open, setOpen] = useState(false);

  const load = () => api.get("/wallet/transactions").then((r) => setTxs(r.data || []));
  useEffect(load, []);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-10 has-mobile-nav">
      <div className="overline mb-1">// vault</div>
      <h1 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tighter mb-6">Wallet</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="surface p-6 md:col-span-2 relative overflow-hidden">
          <div className="scan-line" />
          <div className="overline mb-2">Available Balance</div>
          <div className="font-display font-black text-5xl md:text-6xl text-cyan" data-testid="wallet-balance">
            ${user?.balance?.toFixed(2)}
          </div>
          <div className="text-sm font-mono text-muted-foreground mt-2 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" /> Held in escrow: ${user?.held_balance?.toFixed(2)}
          </div>
          <button onClick={() => setOpen(true)} data-testid="wallet-add-funds" className="btn-primary mt-5 inline-flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4" /> Add Funds
          </button>
        </div>
        <div className="surface p-6">
          <WalletIcon className="w-7 h-7 text-cyan mb-2" />
          <h3 className="font-display font-bold mb-1">Mock Payments</h3>
          <p className="text-xs text-muted-foreground">
            This wallet uses mock processors for the MVP. Real Stripe / UPI / Crypto rails will plug in next.
          </p>
        </div>
      </div>

      <div className="surface p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-cyan/20 flex items-center justify-between">
          <h3 className="font-display font-bold">Transactions</h3>
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">{txs.length} entries</span>
        </div>
        {txs.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground font-mono">No transactions yet.</div>
        )}
        {txs.map((t) => (
          <div key={t.id} className="px-5 py-3 border-b border-cyan/10 grid grid-cols-12 gap-2 items-center" data-testid={`wallet-tx-${t.id}`}>
            <div className="col-span-1">
              {t.amount >= 0 ? <ArrowDownToLine className="w-4 h-4 text-success" /> : <ArrowUpFromLine className="w-4 h-4 text-pink" />}
            </div>
            <div className="col-span-5">
              <div className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">{t.type.replace(/_/g, " ")}</div>
              <div className="text-sm truncate">{t.note}</div>
            </div>
            <div className="col-span-3 font-mono text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
            <div className={`col-span-3 text-right font-display font-bold ${t.amount >= 0 ? "text-success" : "text-pink"}`}>
              {t.amount >= 0 ? "+" : ""}${t.amount.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <AddFundsModal open={open} onClose={() => { setOpen(false); load(); }} />
    </div>
  );
}

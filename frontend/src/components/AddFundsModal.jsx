import React, { useState } from "react";
import { X, CreditCard, Bitcoin, Smartphone, ShieldCheck } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const QUICK = [25, 50, 100, 250, 500];

export default function AddFundsModal({ open, onClose }) {
  const { setUser } = useAuth();
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState("card");
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/wallet/deposit", { amount: Number(amount), method });
      setUser(data);
      toast.success(`+ $${Number(amount).toFixed(2)} added to wallet`);
      onClose();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md grid place-items-center p-4"
      data-testid="add-funds-modal"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md surface p-6 relative"
      >
        <button type="button" onClick={onClose} data-testid="close-funds-modal" className="absolute top-3 right-3 text-muted-foreground hover:text-cyan">
          <X className="w-5 h-5" />
        </button>
        <div className="overline mb-1">// secure deposit</div>
        <h3 className="font-display font-black text-2xl mb-1">Add Funds</h3>
        <p className="text-sm text-muted-foreground mb-5 font-mono">
          Mock deposit • Real processor integration deferred.
        </p>

        <label className="block overline mb-2">Amount (USD)</label>
        <input
          type="number" min="1" step="1" value={amount}
          onChange={(e) => setAmount(e.target.value)} required
          className="input-cyber mb-3" data-testid="funds-amount-input"
        />
        <div className="flex flex-wrap gap-2 mb-5">
          {QUICK.map((q) => (
            <button
              type="button" key={q} data-testid={`quick-amount-${q}`}
              onClick={() => setAmount(q)}
              className={`px-3 py-1.5 border font-mono text-xs tracking-wider ${
                Number(amount) === q
                  ? "border-cyan text-cyan bg-cyan/10"
                  : "border-cyan/30 text-muted-foreground hover:text-cyan hover:border-cyan/60"
              }`}
            >
              ${q}
            </button>
          ))}
        </div>

        <label className="block overline mb-2">Method</label>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { v: "card", label: "Card", Icon: CreditCard },
            { v: "crypto", label: "Crypto", Icon: Bitcoin },
            { v: "upi", label: "UPI", Icon: Smartphone },
          ].map(({ v, label, Icon }) => (
            <button
              type="button" key={v} data-testid={`method-${v}`}
              onClick={() => setMethod(v)}
              className={`p-3 border flex flex-col items-center gap-1 ${
                method === v
                  ? "border-cyan text-cyan bg-cyan/5"
                  : "border-cyan/20 text-muted-foreground hover:border-cyan/40"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-mono text-[10px] tracking-widest uppercase">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-5 font-mono">
          <ShieldCheck className="w-4 h-4 text-cyan" />
          <span>Funds added immediately to your balance.</span>
        </div>

        <button type="submit" disabled={busy} data-testid="confirm-deposit-btn" className="btn-primary w-full">
          {busy ? "Processing..." : `Deposit $${Number(amount).toFixed(2)}`}
        </button>
      </form>
    </div>
  );
}

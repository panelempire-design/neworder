import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot, KeyRound, AtSign, User, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function startGoogleLogin() {
  const redirectUrl = window.location.origin + "/auth/callback";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    const res = await register(form.email, form.password, form.name);
    setBusy(false);
    if (res.ok) nav("/dashboard", { replace: true });
    else setError(res.error);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-10 order-2 lg:order-1">
        <form onSubmit={submit} className="w-full max-w-md surface p-8" data-testid="register-form">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-6">
            <Bot className="w-6 h-6 text-cyan" />
            <span className="font-display font-black">CYBER<span className="neon-cyan">VAULT</span></span>
          </Link>
          <div className="overline mb-2">// /auth/register</div>
          <h1 className="font-display font-black text-3xl mb-1">Create Vault</h1>
          <p className="text-sm text-muted-foreground mb-6">Set up your operator profile.</p>

          <button
            type="button" onClick={startGoogleLogin} data-testid="google-register-btn"
            className="w-full btn-ghost mb-4 inline-flex items-center justify-center gap-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v3.83h5.4c-.24 1.43-1.7 4.2-5.4 4.2-3.25 0-5.9-2.7-5.9-6.03s2.65-6.03 5.9-6.03c1.85 0 3.1.79 3.8 1.47l2.6-2.5C16.78 4.46 14.6 3.5 12 3.5 6.94 3.5 2.85 7.6 2.85 12.6S6.94 21.7 12 21.7c6.92 0 9.5-4.85 9.5-9.3 0-.63-.07-1.1-.15-1.3z"/></svg>
            Sign up with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-cyan/20" />
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-cyan/20" />
          </div>

          {error && (
            <div className="mb-3 p-3 border border-pink/40 bg-pink/5 text-pink text-sm flex items-start gap-2" data-testid="register-error">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <label className="block overline mb-1">Display Name</label>
          <div className="relative mb-4">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/60" />
            <input
              type="text" required minLength={1} maxLength={80} value={form.name}
              data-testid="register-name"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-cyber pl-10" placeholder="Cyber Operator"
            />
          </div>

          <label className="block overline mb-1">Email</label>
          <div className="relative mb-4">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/60" />
            <input
              type="email" required value={form.email} data-testid="register-email"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-cyber pl-10" placeholder="you@cybervault.io"
            />
          </div>

          <label className="block overline mb-1">Password</label>
          <div className="relative mb-6">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/60" />
            <input
              type="password" required minLength={6} value={form.password} data-testid="register-password"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-cyber pl-10" placeholder="min 6 chars"
            />
          </div>

          <button type="submit" disabled={busy} data-testid="register-submit" className="btn-primary w-full">
            {busy ? "Creating..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Already have a vault?{" "}
            <Link to="/login" data-testid="goto-login" className="text-cyan hover:underline">Sign in</Link>
          </p>
        </form>
      </div>

      <div className="relative hidden lg:block order-1 lg:order-2">
        <div className="absolute inset-0 cyber-grid opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-bl from-violet/15 via-transparent to-cyan/10" />
        <div className="relative h-full flex flex-col justify-between p-12 items-end text-right">
          <Link to="/" className="flex items-center gap-2">
            <Bot className="w-7 h-7 text-cyan" />
            <span className="font-display font-black text-lg">CYBER<span className="neon-cyan">VAULT</span></span>
          </Link>
          <div className="max-w-md">
            <div className="overline mb-2 justify-end flex">// onboarding</div>
            <h2 className="font-display font-black text-4xl uppercase tracking-tighter leading-none mb-3">
              Join 12K+<br/><span className="neon-pink">cyber traders.</span>
            </h2>
            <p className="text-muted-foreground">
              Lock in protected trades, build a reputation, and cash out.
            </p>
          </div>
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
            // ZERO COMMISSIONS DURING BETA
          </div>
        </div>
      </div>
    </div>
  );
}

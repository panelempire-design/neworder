import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot, ShieldCheck, Lock, Zap, Activity, Users, ArrowRight, ChevronRight, Cpu, KeyRound, MessageCircle, Star } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ListingCard from "@/components/marketplace/ListingCard";

const ROBOT_IMG = "https://images.pexels.com/photos/20486250/pexels-photo-20486250.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const GRID_BG  = "https://images.unsplash.com/photo-1768527858342-037cff722276?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHwyfHxkYXJrJTIwbmVvbiUyMGdyaWQlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc4MjA1NTAzNnww&ixlib=rb-4.1.0&q=85";

const STEPS = [
  { n: "01", icon: KeyRound, title: "Add Funds", desc: "Securely top up your wallet. Funds remain yours until you confirm a purchase." },
  { n: "02", icon: Lock, title: "Escrow Holds", desc: "The platform freezes the buyer's funds. The seller submits account credentials." },
  { n: "03", icon: ShieldCheck, title: "Buyer Confirms", desc: "Buyer verifies access. Confirmation triggers automatic release to the seller." },
  { n: "04", icon: Star, title: "Review & Done", desc: "Both parties leave reviews. Reputation is built on completed escrows only." },
];

const PLATFORMS = ["instagram", "youtube", "tiktok", "twitter", "facebook", "telegram", "twitch"];

export default function Landing() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.get("/listings/featured").then((r) => setFeatured(r.data || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Marketing nav */}
      <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-xl border-b border-cyan/20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" data-testid="landing-logo" className="flex items-center gap-2">
            <div className="w-9 h-9 border border-cyan/40 grid place-items-center">
              <Bot className="w-5 h-5 text-cyan" />
            </div>
            <div className="leading-none">
              <div className="font-display text-base font-black">CYBER<span className="neon-cyan">VAULT</span></div>
              <div className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground">ESCROW.NET</div>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6 font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground">
            <a href="#how" className="hover:text-cyan">How it works</a>
            <a href="#listings" className="hover:text-cyan">Marketplace</a>
            <a href="#trust" className="hover:text-cyan">Security</a>
            <a href="#apk" className="hover:text-cyan">Mobile App</a>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <button onClick={() => nav("/dashboard")} className="btn-primary text-xs" data-testid="cta-dashboard">Dashboard</button>
            ) : (
              <>
                <Link to="/login" data-testid="cta-login" className="btn-ghost text-xs hidden sm:inline-flex">Sign In</Link>
                <Link to="/register" data-testid="cta-register" className="btn-primary text-xs">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 cyber-grid opacity-40" />
        <img src={GRID_BG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />

        <div className="relative max-w-[1400px] mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-16 md:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="overline">// Escrow-secured marketplace • v2.6</div>
              <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-7xl leading-[0.95] tracking-tighter uppercase">
                Buy & sell social accounts —{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan via-cyan to-violet">
                  protected
                </span>{" "}
                by machine escrow.
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
                Every transaction is held by an automated escrow engine. Sellers submit credentials, buyers verify access, and funds release only when both sides are satisfied.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to={user ? "/marketplace" : "/register"} data-testid="hero-cta-primary" className="btn-primary inline-flex items-center gap-2">
                  Enter Marketplace <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#how" data-testid="hero-cta-secondary" className="btn-ghost inline-flex items-center gap-2">
                  How escrow works <ChevronRight className="w-4 h-4" />
                </a>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-6 max-w-md">
                {[
                  { k: "12,480", l: "Trades" },
                  { k: "$4.2M", l: "Escrowed" },
                  { k: "99.6%", l: "Success" },
                ].map((s) => (
                  <div key={s.l} className="surface p-3">
                    <div className="font-display text-xl font-black text-cyan">{s.k}</div>
                    <div className="font-mono text-[10px] tracking-widest text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="absolute -inset-8 bg-cyan/10 blur-3xl rounded-full" />
              <div className="relative surface overflow-hidden floaty">
                <div className="scan-line" />
                <img src={ROBOT_IMG} alt="Robot mascot" className="w-full h-[420px] md:h-[520px] object-cover" />
                <div className="absolute top-3 left-3 right-3 flex justify-between font-mono text-[10px] tracking-widest">
                  <span className="text-cyan">VAULT.AI</span>
                  <span className="text-success">● ONLINE</span>
                </div>
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <div className="overline mb-1">// guardian</div>
                  <div className="font-display font-bold text-lg">Meet V.X-1 — Your Escrow Sentinel</div>
                  <div className="font-mono text-xs text-muted-foreground mt-1">monitors every trade · 24/7 dispute review</div>
                </div>
              </div>
            </div>
          </div>

          {/* Platform marquee */}
          <div className="mt-12 md:mt-20">
            <div className="overline mb-3">// supported platforms</div>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <span key={p} className="tag">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative py-16 md:py-28 border-t border-cyan/10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="max-w-2xl mb-12">
            <div className="overline mb-2">// protocol</div>
            <h2 className="font-display font-black text-3xl md:text-5xl uppercase tracking-tighter mb-4">
              Four steps. Zero <span className="neon-pink">trust gaps</span>.
            </h2>
            <p className="text-muted-foreground">
              CyberVault sits between buyer and seller, enforcing each step so neither side can rug the other.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="surface p-6 relative hover:border-cyan/50 transition-colors">
                <div className="absolute top-4 right-4 font-mono text-[10px] tracking-widest text-muted-foreground">{s.n}</div>
                <s.icon className="w-7 h-7 text-cyan mb-4" />
                <div className="font-display font-bold text-lg mb-2">{s.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-cyan/40" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured listings */}
      <section id="listings" className="py-16 md:py-28 border-t border-cyan/10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
            <div>
              <div className="overline mb-2">// live feed</div>
              <h2 className="font-display font-black text-3xl md:text-5xl uppercase tracking-tighter">Featured Listings</h2>
            </div>
            <Link to="/marketplace" data-testid="view-all-listings" className="btn-ghost text-xs inline-flex items-center gap-2">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((l) => <ListingCard key={l.id} listing={l} />)}
            {featured.length === 0 && (
              <div className="col-span-full surface p-10 text-center font-mono text-sm text-muted-foreground">
                NO LISTINGS YET — Check back soon.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="trust" className="py-16 md:py-28 border-t border-cyan/10 relative">
        <div className="absolute inset-0 cyber-grid opacity-20" />
        <div className="relative max-w-[1400px] mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="overline mb-2">// shielded</div>
            <h2 className="font-display font-black text-3xl md:text-5xl uppercase tracking-tighter mb-4">
              Built for paranoid<br/><span className="neon-cyan">traders</span>.
            </h2>
            <ul className="space-y-3 mt-6">
              {[
                ["Bcrypt + JWT auth, plus Google OAuth", Lock],
                ["Automated escrow ledger — every $ tracked", Activity],
                ["Encrypted credential vault per order", ShieldCheck],
                ["Admin dispute resolution in <24h", MessageCircle],
                ["Public seller reputation scores", Star],
              ].map(([t, Icon], i) => (
                <li key={i} className="flex items-start gap-3 surface p-4">
                  <Icon className="w-5 h-5 text-cyan shrink-0 mt-0.5" />
                  <span className="text-sm">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="surface p-8 relative overflow-hidden">
            <div className="scan-line" />
            <div className="font-mono text-xs tracking-widest text-cyan mb-3">VAULT.STATUS</div>
            <div className="space-y-3 font-mono text-sm">
              {[
                ["Escrow Engine", "OPERATIONAL", "success"],
                ["Auth Layer", "OPERATIONAL", "success"],
                ["Payment Rails", "MOCK MODE", "warn"],
                ["Dispute Queue", "12 open", "info"],
                ["Network", "127ms RTT", "info"],
              ].map(([k, v, c]) => (
                <div key={k} className="flex items-center justify-between border-b border-cyan/10 pb-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className={`badge-${c}`}>{v}</span>
                </div>
              ))}
            </div>
            <Cpu className="absolute -bottom-6 -right-6 w-40 h-40 text-cyan/5" />
          </div>
        </div>
      </section>

      {/* APK */}
      <section id="apk" className="py-16 md:py-28 border-t border-cyan/10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 text-center">
          <div className="overline mb-2">// mobile-first</div>
          <h2 className="font-display font-black text-3xl md:text-5xl uppercase tracking-tighter mb-4">
            Native APK. <span className="neon-cyan">Coming next.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            The web app is fully responsive and wrapped with Capacitor — ready to compile into an Android APK in one command.
          </p>
          <code className="inline-block font-mono text-xs bg-black/60 border border-cyan/30 px-4 py-2 text-cyan">
            $ npx cap add android && npx cap run android
          </code>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cyan/10 py-10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-display font-black">CYBER<span className="neon-cyan">VAULT</span></div>
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
            // BUILT WITH ZERO TRUST · {new Date().getFullYear()}
          </div>
        </div>
      </footer>
    </div>
  );
}

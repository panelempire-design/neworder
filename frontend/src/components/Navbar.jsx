import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bot, LayoutDashboard, ShoppingBag, ListPlus, Wallet, Shield,
  LogOut, Menu, X, ScrollText, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const baseLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/marketplace", label: "Marketplace", icon: ShoppingBag, testid: "nav-marketplace" },
  { to: "/orders", label: "Orders", icon: ScrollText, testid: "nav-orders" },
  { to: "/my-listings", label: "My Listings", icon: ListPlus, testid: "nav-mylistings" },
  { to: "/wallet", label: "Wallet", icon: Wallet, testid: "nav-wallet" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const links = [...baseLinks];
  if (user?.role === "admin") {
    links.push({ to: "/admin", label: "Admin", icon: Shield, testid: "nav-admin" });
  }

  const handleLogout = async () => {
    await logout();
    nav("/");
  };

  return (
    <>
      {/* Top bar */}
      <nav
        data-testid="top-navbar"
        className="sticky top-0 z-50 bg-black/85 backdrop-blur-xl border-b border-cyan/20"
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" data-testid="logo-link" className="flex items-center gap-2 group">
            <div className="w-9 h-9 border border-cyan/40 grid place-items-center group-hover:border-cyan transition-colors">
              <Bot className="w-5 h-5 text-cyan" />
            </div>
            <div className="leading-none">
              <div className="font-display text-base font-black tracking-tight">
                CYBER<span className="neon-cyan">VAULT</span>
              </div>
              <div className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground">ESCROW.NET</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => {
              const active = loc.pathname === l.to || loc.pathname.startsWith(l.to + "/");
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  data-testid={l.testid}
                  className={`px-3 py-2 font-mono text-[11px] tracking-[0.15em] uppercase border transition-all ${
                    active
                      ? "text-cyan border-cyan bg-cyan/5"
                      : "text-muted-foreground border-transparent hover:text-cyan hover:border-cyan/40"
                  }`}
                >
                  <l.icon className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="font-mono text-[10px] tracking-widest text-muted-foreground">BALANCE</div>
              <div className="font-display font-bold text-cyan" data-testid="navbar-balance">
                ${user?.balance?.toFixed(2) ?? "0.00"}
              </div>
            </div>
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              title="Logout"
              className="hidden md:grid place-items-center w-10 h-10 border border-pink/40 text-pink hover:bg-pink/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOpen(true)}
              data-testid="mobile-menu-btn"
              className="md:hidden w-10 h-10 grid place-items-center border border-cyan/30 text-cyan"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xl md:hidden"
          data-testid="mobile-drawer"
        >
          <div className="flex items-center justify-between p-4 border-b border-cyan/20">
            <div className="font-display font-black">MENU</div>
            <button onClick={() => setOpen(false)} data-testid="mobile-menu-close" className="w-10 h-10 grid place-items-center border border-cyan/30">
              <X className="w-5 h-5 text-cyan" />
            </button>
          </div>
          <div className="p-4 space-y-2">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                data-testid={`m-${l.testid}`}
                className="flex items-center gap-3 p-4 border border-cyan/20 hover:border-cyan hover:bg-cyan/5"
              >
                <l.icon className="w-5 h-5 text-cyan" />
                <span className="font-mono text-sm tracking-wider uppercase">{l.label}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              data-testid="m-logout-btn"
              className="w-full flex items-center gap-3 p-4 border border-pink/40 text-pink"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-mono text-sm tracking-wider uppercase">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile bottom-nav (compact) */}
      <div
        data-testid="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-black/90 backdrop-blur-xl border-t border-cyan/20"
      >
        <div className="grid grid-cols-5">
          {baseLinks.slice(0, 5).map((l) => {
            const active = loc.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                data-testid={`mb-${l.testid}`}
                className={`flex flex-col items-center justify-center py-2.5 gap-0.5 ${
                  active ? "text-cyan" : "text-muted-foreground"
                }`}
              >
                <l.icon className="w-4 h-4" />
                <span className="font-mono text-[9px] tracking-widest uppercase">{l.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

import React, { useEffect, useState } from "react";
import { Search, Filter } from "lucide-react";
import api from "@/lib/api";
import ListingCard from "@/components/marketplace/ListingCard";

const PLATFORMS = ["all", "instagram", "youtube", "tiktok", "twitter", "facebook", "telegram", "twitch"];
const CATEGORIES = ["all", "account", "followers", "likes", "views", "subscribers"];

export default function Marketplace() {
  const [items, setItems] = useState([]);
  const [platform, setPlatform] = useState("all");
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = {};
    if (platform !== "all") params.platform = platform;
    if (category !== "all") params.category = category;
    if (q.trim()) params.q = q.trim();
    const { data } = await api.get("/listings", { params });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [platform, category]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10 has-mobile-nav">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="overline mb-1">// marketplace</div>
          <h1 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tighter">
            Live <span className="neon-cyan">Listings</span>
          </h1>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); load(); }}
          className="flex gap-2 w-full sm:w-auto" data-testid="marketplace-search-form"
        >
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/60" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title…"
              data-testid="marketplace-search-input"
              className="input-cyber pl-10"
            />
          </div>
          <button type="submit" data-testid="marketplace-search-submit" className="btn-primary text-xs">Search</button>
        </form>
      </div>

      {/* Filters */}
      <div className="surface p-4 mb-6">
        <div className="flex items-center gap-2 mb-3 font-mono text-[10px] tracking-widest text-muted-foreground">
          <Filter className="w-3 h-3" /> PLATFORM
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              data-testid={`filter-platform-${p}`}
              className={`px-3 py-1.5 font-mono text-[11px] tracking-widest uppercase border ${
                platform === p
                  ? "border-cyan text-cyan bg-cyan/10"
                  : "border-cyan/20 text-muted-foreground hover:border-cyan/50"
              }`}
            >{p}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-3 font-mono text-[10px] tracking-widest text-muted-foreground">
          <Filter className="w-3 h-3" /> CATEGORY
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c} onClick={() => setCategory(c)}
              data-testid={`filter-category-${c}`}
              className={`px-3 py-1.5 font-mono text-[11px] tracking-widest uppercase border ${
                category === c
                  ? "border-cyan text-cyan bg-cyan/10"
                  : "border-cyan/20 text-muted-foreground hover:border-cyan/50"
              }`}
            >{c}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 font-mono text-sm text-muted-foreground pulse-line">LOADING_FEED…</div>
      ) : items.length === 0 ? (
        <div className="surface p-10 text-center font-mono text-sm text-muted-foreground">NO MATCHES</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  );
}

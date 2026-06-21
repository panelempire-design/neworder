import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pause, Play, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function MyListings() {
  const [items, setItems] = useState([]);

  const load = () => api.get("/me/listings").then((r) => setItems(r.data || []));
  useEffect(load, []);

  const togglePause = async (id) => {
    await api.patch(`/listings/${id}/pause`);
    toast.success("Updated");
    load();
  };
  const remove = async (id) => {
    if (!window.confirm("Remove this listing?")) return;
    await api.delete(`/listings/${id}`);
    toast.success("Removed");
    load();
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-10 has-mobile-nav">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="overline mb-1">// inventory</div>
          <h1 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tighter">My Listings</h1>
        </div>
        <Link to="/my-listings/new" data-testid="new-listing-btn" className="btn-primary text-xs inline-flex items-center gap-1">
          <Plus className="w-4 h-4" /> New Listing
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((l) => (
          <div key={l.id} className="surface p-5 flex gap-4" data-testid={`my-listing-${l.id}`}>
            <div className="w-20 h-20 border border-cyan/20 overflow-hidden shrink-0">
              {l.image_url ? <img src={l.image_url} alt="" className="w-full h-full object-cover" /> : <div className="cyber-grid w-full h-full" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="tag">{l.platform}</span>
                <span className={`badge-${l.status === "active" ? "active" : l.status === "paused" ? "warn" : "muted"}`}>{l.status}</span>
              </div>
              <Link to={`/marketplace/${l.id}`} className="font-display font-bold text-sm hover:text-cyan line-clamp-2">{l.title}</Link>
              <div className="font-display font-black text-cyan text-lg mt-1">${l.price.toFixed(2)}</div>
              <div className="flex gap-2 mt-2">
                {(l.status === "active" || l.status === "paused") && (
                  <button onClick={() => togglePause(l.id)} data-testid={`toggle-${l.id}`} className="btn-ghost text-[10px] inline-flex items-center gap-1 px-3 py-1">
                    {l.status === "active" ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Resume</>}
                  </button>
                )}
                <button onClick={() => remove(l.id)} data-testid={`remove-${l.id}`} className="btn-danger text-[10px] inline-flex items-center gap-1 px-3 py-1">
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="md:col-span-2 surface p-12 text-center font-mono text-sm text-muted-foreground">
            You have no listings yet.
          </div>
        )}
      </div>
    </div>
  );
}

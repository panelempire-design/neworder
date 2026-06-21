import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ListPlus } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

const PLATFORMS = ["instagram", "youtube", "tiktok", "twitter", "facebook", "telegram", "twitch"];
const CATEGORIES = ["account", "followers", "likes", "views", "subscribers"];

export default function CreateListing() {
  const nav = useNavigate();
  const [f, setF] = useState({
    platform: "instagram", category: "account",
    title: "", description: "", price: 50, followers: 0,
    niche: "", image_url: "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...f, price: Number(f.price), followers: Number(f.followers) || 0 };
      await api.post("/listings", payload);
      toast.success("Listing published");
      nav("/my-listings");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-6 md:py-10 has-mobile-nav">
      <Link to="/my-listings" data-testid="back-my-listings" className="overline mb-4 inline-flex items-center gap-2 hover:text-white">
        <ArrowLeft className="w-3 h-3" /> Back
      </Link>
      <div className="overline mb-1">// new asset</div>
      <h1 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tighter mb-6 flex items-center gap-2">
        <ListPlus className="w-7 h-7 text-cyan" /> Create Listing
      </h1>

      <form onSubmit={submit} className="surface p-6 space-y-4" data-testid="create-listing-form">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block overline mb-1">Platform</label>
            <select value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} className="input-cyber" data-testid="cl-platform">
              {PLATFORMS.map((p) => <option key={p} value={p} className="bg-surface">{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block overline mb-1">Category</label>
            <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="input-cyber" data-testid="cl-category">
              {CATEGORIES.map((c) => <option key={c} value={c} className="bg-surface">{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block overline mb-1">Title</label>
          <input required minLength={4} maxLength={140} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="input-cyber" placeholder="e.g. 50K Travel IG Account — US audience" data-testid="cl-title" />
        </div>

        <div>
          <label className="block overline mb-1">Description</label>
          <textarea required minLength={10} rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="input-cyber" placeholder="Engagement rate, audience, monetization, etc." data-testid="cl-description" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block overline mb-1">Price (USD)</label>
            <input type="number" min="1" step="1" required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="input-cyber" data-testid="cl-price" />
          </div>
          <div>
            <label className="block overline mb-1">Followers</label>
            <input type="number" min="0" value={f.followers} onChange={(e) => setF({ ...f, followers: e.target.value })} className="input-cyber" data-testid="cl-followers" />
          </div>
          <div className="col-span-2">
            <label className="block overline mb-1">Niche</label>
            <input value={f.niche} onChange={(e) => setF({ ...f, niche: e.target.value })} className="input-cyber" placeholder="Travel / Crypto / Fitness…" data-testid="cl-niche" />
          </div>
        </div>

        <div>
          <label className="block overline mb-1">Image URL (optional)</label>
          <input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} className="input-cyber" placeholder="https://…" data-testid="cl-image" />
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={busy} data-testid="cl-submit" className="btn-primary">
            {busy ? "Publishing…" : "Publish Listing"}
          </button>
        </div>
      </form>
    </div>
  );
}

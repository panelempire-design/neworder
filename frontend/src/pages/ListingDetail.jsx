import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Star, ShieldCheck, Wallet, Users, ArrowLeft, Tag } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import AddFundsModal from "@/components/AddFundsModal";

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [listing, setListing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showFunds, setShowFunds] = useState(false);

  const load = () => api.get(`/listings/${id}`).then((r) => setListing(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const buy = async () => {
    if (!user) return nav("/login");
    setBusy(true);
    try {
      const { data } = await api.post("/orders", { listing_id: id });
      toast.success("Escrow opened — funds held by vault.");
      nav(`/orders/${data.id}`);
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || e.message;
      toast.error(msg);
      if (e.response?.status === 402) setShowFunds(true);
    } finally {
      setBusy(false);
    }
  };

  if (!listing) {
    return <div className="text-center py-20 font-mono text-sm text-muted-foreground pulse-line">LOADING…</div>;
  }

  const isOwn = listing.seller_id === user?.id;
  const insufficient = (user?.balance ?? 0) < listing.price;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-10 has-mobile-nav">
      <Link to="/marketplace" data-testid="back-marketplace" className="overline mb-4 inline-flex items-center gap-2 hover:text-white">
        <ArrowLeft className="w-3 h-3" /> Back to marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="surface overflow-hidden relative">
            <div className="scan-line" />
            {listing.image_url ? (
              <img src={listing.image_url} alt={listing.title} className="w-full h-[280px] sm:h-[380px] object-cover" />
            ) : (
              <div className="w-full h-[380px] grid place-items-center cyber-grid">
                <Tag className="w-16 h-16 text-cyan/40" />
              </div>
            )}
            <div className="absolute top-3 left-3 flex gap-2">
              <span className="tag">{listing.platform}</span>
              <span className="tag">{listing.category}</span>
            </div>
          </div>

          <div className="surface p-6 mt-4">
            <h1 className="font-display font-black text-2xl md:text-3xl mb-2" data-testid="listing-title">{listing.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{listing.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
              <Stat label="Followers" value={listing.followers?.toLocaleString() || "—"} />
              <Stat label="Niche" value={listing.niche || "—"} />
              <Stat label="Platform" value={listing.platform.toUpperCase()} />
            </div>
          </div>

          {/* Reviews */}
          <div className="surface p-6 mt-4">
            <h3 className="font-display font-bold text-lg mb-3">Seller Reviews</h3>
            {listing.reviews?.length ? (
              <div className="space-y-3">
                {listing.reviews.map((r) => (
                  <div key={r.id} className="border-b border-cyan/10 pb-3" data-testid={`review-${r.id}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-cyan text-cyan" : "text-cyan/20"}`} />
                        ))}
                      </div>
                      <span className="font-mono text-[10px] tracking-widest text-muted-foreground">{r.buyer_name}</span>
                    </div>
                    <p className="text-sm">{r.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-mono">No reviews yet.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="surface p-6 lg:sticky lg:top-20">
            <div className="overline mb-2">// price</div>
            <div className="font-display font-black text-4xl md:text-5xl text-cyan mb-2" data-testid="listing-detail-price">
              ${listing.price.toFixed(2)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan" /> Escrow-protected
            </div>

            {!user ? (
              <Link to="/login" data-testid="login-to-buy" className="btn-primary w-full block text-center">Sign in to buy</Link>
            ) : isOwn ? (
              <div className="badge-info text-center py-2">Your listing</div>
            ) : listing.status !== "active" ? (
              <div className="badge-muted text-center py-2">Not available</div>
            ) : (
              <>
                <button onClick={buy} disabled={busy} data-testid="buy-now-btn" className="btn-primary w-full">
                  {busy ? "Opening escrow…" : "Buy now"}
                </button>
                {insufficient && (
                  <div className="mt-3 text-xs text-warning font-mono flex items-start gap-2">
                    <Wallet className="w-3.5 h-3.5 mt-0.5" />
                    Wallet balance is ${user.balance.toFixed(2)} — you need ${(listing.price - user.balance).toFixed(2)} more.
                    <button onClick={() => setShowFunds(true)} data-testid="add-funds-cta" className="underline text-cyan ml-1">Top up</button>
                  </div>
                )}
              </>
            )}

            <div className="mt-6 pt-6 border-t border-cyan/10">
              <div className="overline mb-2">// seller</div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-cyan/40 grid place-items-center">
                  <Users className="w-5 h-5 text-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{listing.seller?.name}</div>
                  <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                    {listing.seller?.rating || 0}★ · {listing.seller?.rating_count || 0} reviews
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddFundsModal open={showFunds} onClose={() => setShowFunds(false)} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-cyan/15 p-3">
      <div className="overline mb-1">{label}</div>
      <div className="font-display font-bold">{value}</div>
    </div>
  );
}

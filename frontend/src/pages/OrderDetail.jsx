import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, KeyRound, MessageSquare, AlertTriangle, Send, Copy, Star, CheckCircle } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const STEPS = [
  { key: "awaiting_credentials", label: "Funds Held", desc: "Buyer paid into escrow" },
  { key: "credentials_submitted", label: "Credentials Sent", desc: "Seller submitted account details" },
  { key: "completed", label: "Confirmed", desc: "Buyer confirmed — funds released" },
];

const STATUS_INDEX = {
  awaiting_credentials: 0,
  credentials_submitted: 1,
  completed: 2,
};

export default function OrderDetail() {
  const { id } = useParams();
  const { user, refresh: refreshUser } = useAuth();
  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [creds, setCreds] = useState("");
  const [body, setBody] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [review, setReview] = useState({ rating: 5, comment: "" });
  const [hasReviewed, setHasReviewed] = useState(false);
  const msgEnd = useRef(null);

  const load = async () => {
    const [o, m] = await Promise.all([
      api.get(`/orders/${id}`),
      api.get(`/orders/${id}/messages`),
    ]);
    setOrder(o.data);
    setMessages(m.data || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!order) return <div className="text-center py-20 font-mono text-sm pulse-line">LOADING…</div>;

  const isBuyer = order.buyer_id === user?.id;
  const isSeller = order.seller_id === user?.id;
  const idx = STATUS_INDEX[order.status] ?? -1;
  const completed = order.status === "completed";
  const disputed = order.status === "disputed";

  const submitCreds = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/orders/${id}/credentials`, { credentials: creds });
      toast.success("Credentials sent. Buyer must verify access.");
      setCreds("");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
  };

  const confirm = async () => {
    try {
      await api.post(`/orders/${id}/confirm`);
      toast.success("Confirmed — funds released to seller.");
      await refreshUser();
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
  };

  const openDispute = async () => {
    if (!disputeReason.trim()) return toast.error("Describe the issue first.");
    try {
      await api.post(`/orders/${id}/dispute`, { reason: disputeReason });
      toast.success("Dispute opened. Admin will review shortly.");
      setDisputeReason("");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      const { data } = await api.post(`/orders/${id}/messages`, { body });
      setMessages((prev) => [...prev, data]);
      setBody("");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
  };

  const leaveReview = async () => {
    try {
      await api.post(`/orders/${id}/review`, review);
      toast.success("Review submitted.");
      setHasReviewed(true);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
  };

  const copyCreds = () => {
    navigator.clipboard.writeText(order.credentials || "");
    toast.success("Copied to clipboard");
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-10 has-mobile-nav">
      <Link to="/orders" data-testid="back-orders" className="overline mb-4 inline-flex items-center gap-2 hover:text-white">
        <ArrowLeft className="w-3 h-3" /> Back to orders
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Escrow + creds + dispute */}
        <div className="lg:col-span-2 space-y-4">
          <div className="surface p-6">
            <div className="overline mb-1">// order</div>
            <h1 className="font-display font-black text-2xl mb-1" data-testid="order-title">{order.listing_title}</h1>
            <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
              <span>ID {order.id}</span>
              <span>•</span>
              <span>{order.platform.toUpperCase()}</span>
              <span>•</span>
              <span className="text-cyan font-bold">${order.price.toFixed(2)}</span>
            </div>

            {/* Stepper */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mt-6">
              {STEPS.map((s, i) => {
                const active = idx >= i && !disputed;
                return (
                  <div key={s.key} className={`border p-3 md:p-4 ${active ? "border-cyan bg-cyan/5" : "border-cyan/15"}`} data-testid={`step-${s.key}`}>
                    <div className="font-mono text-[10px] tracking-widest text-cyan">STEP {i + 1}</div>
                    <div className="font-display font-bold text-sm mt-1">{s.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{s.desc}</div>
                  </div>
                );
              })}
            </div>

            {disputed && (
              <div className="mt-4 p-4 border border-pink/40 bg-pink/5">
                <div className="flex items-center gap-2 text-pink font-bold">
                  <AlertTriangle className="w-4 h-4" /> Disputed
                </div>
                <p className="text-xs text-muted-foreground mt-1">{order.dispute_reason}</p>
              </div>
            )}
          </div>

          {/* Seller credentials submit */}
          {isSeller && order.status === "awaiting_credentials" && (
            <form onSubmit={submitCreds} className="surface p-6" data-testid="seller-credentials-form">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-4 h-4 text-cyan" />
                <h3 className="font-display font-bold">Submit Account Credentials</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Enter the username/email + password (or transfer instructions). Funds are released only when the buyer confirms access.
              </p>
              <textarea
                value={creds} onChange={(e) => setCreds(e.target.value)} required minLength={4}
                rows={5} className="input-cyber font-mono text-sm"
                placeholder="username: travelhub_official&#10;password: ********&#10;recovery email: ..."
                data-testid="credentials-input"
              />
              <button className="btn-primary mt-3 w-full" data-testid="submit-credentials-btn">Send to Buyer</button>
            </form>
          )}

          {/* Buyer view credentials */}
          {isBuyer && order.credentials && order.status !== "completed" && (
            <div className="surface p-6 relative" data-testid="buyer-credentials-view">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan" />
                  <h3 className="font-display font-bold">Credentials Received</h3>
                </div>
                <button onClick={copyCreds} data-testid="copy-credentials-btn" className="btn-ghost text-xs inline-flex items-center gap-1">
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <pre className="bg-black/50 border border-cyan/20 p-4 font-mono text-xs whitespace-pre-wrap break-all">
                {order.credentials}
              </pre>
              <div className="mt-3 text-xs text-warning font-mono">
                ⚠ Verify access before confirming. Once confirmed, funds release to seller.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                <button onClick={confirm} data-testid="confirm-escrow-btn" className="btn-primary inline-flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Confirm & Release
                </button>
              </div>
            </div>
          )}

          {/* Buyer also shown completed credentials */}
          {isBuyer && completed && order.credentials && (
            <div className="surface p-6">
              <h3 className="font-display font-bold mb-2">Credentials</h3>
              <pre className="bg-black/50 border border-cyan/20 p-4 font-mono text-xs whitespace-pre-wrap break-all">
                {order.credentials}
              </pre>
            </div>
          )}

          {/* Dispute */}
          {(order.status === "credentials_submitted" || order.status === "awaiting_credentials") && (
            <div className="surface p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-pink" />
                <h3 className="font-display font-bold">Open Dispute</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Use only if something is wrong. An admin will review.</p>
              <textarea
                value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
                rows={3} className="input-cyber text-sm" placeholder="Describe the issue…"
                data-testid="dispute-reason-input"
              />
              <button onClick={openDispute} data-testid="open-dispute-btn" className="btn-danger mt-3 text-xs">Submit Dispute</button>
            </div>
          )}

          {/* Review */}
          {isBuyer && completed && !hasReviewed && (
            <div className="surface p-6" data-testid="leave-review-card">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-cyan" />
                <h3 className="font-display font-bold">Leave a Review</h3>
              </div>
              <div className="flex gap-2 mb-3">
                {[1,2,3,4,5].map((n) => (
                  <button
                    key={n} type="button" onClick={() => setReview({ ...review, rating: n })}
                    data-testid={`rating-${n}`}
                    className={`w-9 h-9 grid place-items-center border ${n <= review.rating ? "border-cyan bg-cyan/10 text-cyan" : "border-cyan/20 text-muted-foreground"}`}
                  >
                    <Star className={`w-4 h-4 ${n <= review.rating ? "fill-cyan" : ""}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })}
                rows={3} className="input-cyber text-sm" placeholder="Share your experience…"
                data-testid="review-comment-input"
              />
              <button onClick={leaveReview} data-testid="submit-review-btn" className="btn-primary mt-3 text-xs">Submit Review</button>
            </div>
          )}
        </div>

        {/* RIGHT: Chat */}
        <div className="lg:col-span-1">
          <div className="surface flex flex-col h-[560px] lg:sticky lg:top-20">
            <div className="p-4 border-b border-cyan/20 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan" />
              <h3 className="font-display font-bold">Chat</h3>
              <span className="ml-auto font-mono text-[10px] tracking-widest text-muted-foreground">
                {isBuyer ? `with ${order.seller_name}` : `with ${order.buyer_name}`}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2" data-testid="chat-messages">
              {messages.length === 0 && (
                <p className="text-center text-xs text-muted-foreground font-mono py-10">No messages yet.</p>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-2.5 text-sm border ${mine ? "border-cyan/40 bg-cyan/10 text-white" : "border-cyan/15 bg-black/40 text-white"}`}>
                      <div className="font-mono text-[9px] tracking-widest text-muted-foreground mb-0.5">{m.sender_name}</div>
                      <div>{m.body}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={msgEnd} />
            </div>
            <form onSubmit={sendMsg} className="p-3 border-t border-cyan/20 flex gap-2" data-testid="chat-form">
              <input
                value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="Message…" className="input-cyber py-2 text-sm"
                data-testid="chat-input"
              />
              <button type="submit" data-testid="chat-send-btn" className="btn-primary text-xs px-3">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="surface p-6 mt-6">
        <div className="overline mb-3">// timeline</div>
        <ul className="space-y-2 font-mono text-xs">
          {order.timeline?.map((t, i) => (
            <li key={i} className="flex items-center gap-3" data-testid={`timeline-${i}`}>
              <span className="w-1.5 h-1.5 bg-cyan rounded-full" />
              <span className="text-cyan tracking-widest uppercase">{t.event.replace(/_/g, " ")}</span>
              <span className="text-muted-foreground ml-auto">{new Date(t.at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

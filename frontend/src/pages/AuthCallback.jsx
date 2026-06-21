import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const ran = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      nav("/login", { replace: true });
      return;
    }
    const session_id = decodeURIComponent(m[1]);
    api.post("/auth/google-session", { session_id })
      .then(({ data }) => {
        setUser(data);
        // Clear hash and navigate
        window.history.replaceState(null, "", "/");
        nav("/dashboard", { replace: true });
      })
      .catch((e) => {
        setError(formatApiError(e.response?.data?.detail) || e.message);
        setTimeout(() => nav("/login", { replace: true }), 2500);
      });
  }, [nav, setUser]);

  return (
    <div className="min-h-screen grid place-items-center px-4" data-testid="auth-callback">
      <div className="surface p-8 text-center max-w-md">
        <div className="overline mb-2">// google oauth</div>
        <div className="font-display font-black text-2xl mb-2">
          {error ? "Authentication failed" : "Linking your vault..."}
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          {error || "Verifying session with Emergent Auth Service."}
        </p>
      </div>
    </div>
  );
}

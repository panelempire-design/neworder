import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Marketplace from "@/pages/Marketplace";
import ListingDetail from "@/pages/ListingDetail";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import MyListings from "@/pages/MyListings";
import CreateListing from "@/pages/CreateListing";
import Wallet from "@/pages/Wallet";
import Admin from "@/pages/Admin";

function AppLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Outlet />
    </div>
  );
}

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Landing />;
}

function AppRouter() {
  const location = useLocation();
  // OAuth callback detection (synchronous, before route resolution)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/:id" element={<ListingDetail />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/my-listings" element={<MyListings />} />
        <Route path="/my-listings/new" element={<CreateListing />} />
        <Route path="/wallet" element={<Wallet />} />
      </Route>

      <Route element={<ProtectedRoute adminOnly><AppLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<Admin />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "rgba(12,13,20,0.95)",
                border: "1px solid rgba(0,240,255,0.3)",
                color: "#fff",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
                letterSpacing: "0.05em",
                borderRadius: 0,
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

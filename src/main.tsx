import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/use-auth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const DashboardLayout = lazy(() => import("./pages/dashboard/DashboardLayout.tsx"));
const Marketplace = lazy(() => import("./pages/dashboard/Marketplace.tsx"));
const ProductDetail = lazy(() => import("./pages/dashboard/ProductDetail.tsx"));
const Orders = lazy(() => import("./pages/dashboard/Orders.tsx"));
const Chat = lazy(() => import("./pages/dashboard/Chat.tsx"));
const AllMessages = lazy(() => import("./pages/dashboard/AllMessages.tsx"));
const SupplierOverview = lazy(() => import("./pages/dashboard/SupplierOverview.tsx"));
const SupplierProducts = lazy(() => import("./pages/dashboard/SupplierProducts.tsx"));
const SupplierOrders = lazy(() => import("./pages/dashboard/SupplierOrders.tsx"));
const AdminOverview = lazy(() => import("./pages/dashboard/AdminOverview.tsx"));
const AdminSuppliers = lazy(() => import("./pages/dashboard/AdminSuppliers.tsx"));
const AdminUsers = lazy(() => import("./pages/dashboard/AdminUsers.tsx"));
const AdminOrders = lazy(() => import("./pages/dashboard/AdminOrders.tsx"));

const ROLE_HOME: Record<string, string> = {
  client: "/dashboard/marketplace",
  supplier: "/dashboard/supplier",
  admin: "/dashboard/admin",
};

/** Redirect to the dashboard home of the current user's role. */
function RoleHome() {
  const { user } = useAuth();
  if (!user?.role) return <Navigate to="/auth" replace />;
  return <Navigate to={ROLE_HOME[user.role] ?? "/dashboard/marketplace"} replace />;
}

/** Restrict a dashboard route to a single role. */
function RoleGate({ role, children }: { role: string; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user?.role) return <Navigate to="/auth" replace />;
  if (user.role !== role) {
    return <Navigate to={ROLE_HOME[user.role] ?? "/dashboard/marketplace"} replace />;
  }
  return <>{children}</>;
}

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground font-mono text-xs">
        $ chargement…
      </div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/dashboard" />}
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <DashboardLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<RoleHome />} />
                {/* client */}
                <Route
                  path="marketplace"
                  element={
                    <RoleGate role="client">
                      <Marketplace />
                    </RoleGate>
                  }
                />
                <Route
                  path="product/:productId"
                  element={
                    <RoleGate role="client">
                      <ProductDetail />
                    </RoleGate>
                  }
                />
                <Route
                  path="orders"
                  element={
                    <RoleGate role="client">
                      <Orders />
                    </RoleGate>
                  }
                />
                {/* shared chat (client + supplier) */}
                <Route path="chat" element={<Chat />} />
                <Route path="chat/:conversationId" element={<Chat />} />
                <Route path="messages" element={<AllMessages />} />
                {/* supplier */}
                <Route
                  path="supplier"
                  element={
                    <RoleGate role="supplier">
                      <SupplierOverview />
                    </RoleGate>
                  }
                />
                <Route
                  path="supplier/products"
                  element={
                    <RoleGate role="supplier">
                      <SupplierProducts />
                    </RoleGate>
                  }
                />
                <Route
                  path="supplier/orders"
                  element={
                    <RoleGate role="supplier">
                      <SupplierOrders />
                    </RoleGate>
                  }
                />
                {/* admin */}
                <Route
                  path="admin"
                  element={
                    <RoleGate role="admin">
                      <AdminOverview />
                    </RoleGate>
                  }
                />
                <Route
                  path="admin/suppliers"
                  element={
                    <RoleGate role="admin">
                      <AdminSuppliers />
                    </RoleGate>
                  }
                />
                <Route
                  path="admin/users"
                  element={
                    <RoleGate role="admin">
                      <AdminUsers />
                    </RoleGate>
                  }
                />
                <Route
                  path="admin/orders"
                  element={
                    <RoleGate role="admin">
                      <AdminOrders />
                    </RoleGate>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);

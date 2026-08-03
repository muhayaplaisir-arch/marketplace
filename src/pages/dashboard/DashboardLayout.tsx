import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquareText,
  Package,
  ShoppingCart,
  Store,
  Terminal,
  Truck,
  Users,
} from "lucide-react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { SUPPLIER_STATUS_LABELS } from "@/lib/format";

const NAV_ITEMS: Record<string, { to: string; label: string; icon: any; end?: boolean }[]> = {
  client: [
    { to: "/dashboard/marketplace", label: "Marché", icon: ShoppingCart, end: true },
    { to: "/dashboard/orders", label: "Mes commandes", icon: Truck },
    { to: "/dashboard/chat", label: "Messages", icon: MessageSquareText },
    { to: "/dashboard/messages", label: "Tous les messages", icon: Inbox },
  ],
  supplier: [
    { to: "/dashboard/supplier", label: "Tableau de bord", icon: LayoutDashboard, end: true },
    { to: "/dashboard/supplier/products", label: "Mes produits", icon: Package },
    { to: "/dashboard/supplier/orders", label: "Commandes", icon: Truck },
    { to: "/dashboard/chat", label: "Messages", icon: MessageSquareText },
    { to: "/dashboard/messages", label: "Tous les messages", icon: Inbox },
  ],
  admin: [
    { to: "/dashboard/admin", label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
    { to: "/dashboard/admin/suppliers", label: "Fournisseurs", icon: Store },
    { to: "/dashboard/admin/users", label: "Utilisateurs", icon: Users },
    { to: "/dashboard/admin/orders", label: "Commandes", icon: Truck },
  ],
};

export default function DashboardLayout() {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const pendingSuppliers = useQuery(
    api.admin.listSuppliers,
    user?.role === "admin" ? { status: "pending" } : "skip",
  );
  const unread = useQuery(api.chat.getUnreadSummary, user?.role ? {} : "skip");
  const unreadPulse = user?.role === "admin" && (pendingSuppliers?.length ?? 0) > 0;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  // Not authenticated or profile incomplete -> back to auth
  if (!user?.role) {
    return <Navigate to="/auth" replace />;
  }

  const items = NAV_ITEMS[user.role] ?? NAV_ITEMS.client;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const unreadTotal = unread?.total ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* mobile top bar */}
      <div className="md:hidden flex items-center justify-between border-b border-border bg-card px-4 h-14">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 font-bold text-sm"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded border border-primary/40 bg-primary/10 text-primary">
            <Terminal className="h-3.5 w-3.5" />
          </span>
          innovax<span className="text-primary">$</span>
        </button>
        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex">
        {/* sidebar */}
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-card/70 sticky top-0 h-screen">
          <div className="flex items-center gap-2 px-4 h-16 border-b border-border">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 font-bold text-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded border border-primary/40 bg-primary/10 text-primary">
                <Terminal className="h-4 w-4" />
              </span>
              innovax<span className="text-primary">$</span>
            </button>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary/[0.09] text-primary border border-primary/25"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.label === "Fournisseurs" && unreadPulse && (
                  <Badge className="ml-auto h-5 min-w-5 rounded-full px-1.5 text-[9px] bg-amber-600 text-white">
                    {pendingSuppliers?.length}
                  </Badge>
                )}
                {item.label === "Messages" && unreadTotal > 0 && (
                  <Badge className="ml-auto h-5 min-w-5 rounded-full px-1.5 text-[9px] bg-destructive text-white">
                    {unreadTotal > 99 ? "99+" : unreadTotal}
                  </Badge>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-border space-y-3">
            {user.role === "supplier" && (
              <div
                className={cn(
                  "rounded-md border px-3 py-2 text-[10px]",
                  user.supplierStatus === "approved" &&
                    "border-primary/30 bg-primary/[0.06] text-primary",
                  user.supplierStatus === "pending" &&
                    "border-amber-600/30 bg-amber-600/[0.06] text-amber-700",
                  user.supplierStatus === "rejected" &&
                    "border-destructive/30 bg-destructive/[0.06] text-destructive",
                )}
              >
                {user.supplierStatus === "approved" ? (
                  <>✓ Fournisseur validé — produits en ligne</>
                ) : (
                  <>
                    ⚠ Statut : {SUPPLIER_STATUS_LABELS[user.supplierStatus ?? "pending"]}.
                    {user.supplierStatus === "pending"
                      ? " En attente de validation admin."
                      : " Compte refusé."}
                  </>
                )}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">
                  {user.company || user.name || "Utilisateur"}
                </p>
                <p className="truncate text-[10px] text-muted-foreground capitalize">
                  {user.role} {user.country ? `· ${user.country}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Déconnexion">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>

        {/* main */}
        <main className="flex-1 min-w-0">
          {/* mobile nav */}
          <div className="md:hidden flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-[11px] font-medium",
                    isActive
                      ? "bg-primary/[0.09] text-primary border border-primary/25"
                      : "text-muted-foreground border border-transparent",
                  )
                }
              >
                {item.label}
                {item.label === "Messages" && unreadTotal > 0 && (
                  <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-destructive" />
                )}
              </NavLink>
            ))}
          </div>
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

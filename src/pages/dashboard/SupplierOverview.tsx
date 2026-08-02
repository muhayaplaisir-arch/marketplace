import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, ORDER_STATUS_LABELS } from "@/lib/format";
import { Package, ShoppingBag, Store, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SupplierOverview() {
  const { user } = useAuth();
  const products = useQuery(api.products.listMyProducts);
  const orders = useQuery(api.orders.listSupplierOrders);
  const pendingSuppliers = useQuery(
    api.admin.listSuppliers,
    user?.role === "admin" ? { status: "pending" } : "skip",
  );

  const revenue =
    orders?.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0) ?? 0;
  const stats = [
    { label: "Produits publiés", value: String(products?.length ?? "…"), icon: Package },
    { label: "Commandes reçues", value: String(orders?.length ?? "…"), icon: ShoppingBag },
    { label: "Chiffre d'affaires payé", value: orders ? formatMoney(revenue) : "…", icon: Wallet },
    {
      label: "Fournisseurs en attente",
      value: user?.role === "admin" ? String(pendingSuppliers?.length ?? "…") : "—",
      icon: Store,
      adminOnly: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          $ innovax --dashboard
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Bonjour, {user?.company || user?.name}
        </h1>
        <p className="text-xs text-muted-foreground">Voici l'activité de votre espace.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats
          .filter((s) => !s.adminOnly || user?.role === "admin")
          .map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-primary/30 bg-primary/[0.07] text-primary">
                <s.icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-xl font-bold">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold">Commandes récentes</h2>
        </div>
        {orders === undefined ? (
          <div className="p-6 text-xs text-muted-foreground">Chargement…</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">
            Aucune commande pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.slice(0, 5).map((o) => (
              <div key={o._id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {o.orderNumber} · {o.productName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {o.clientName} {o.clientCountry ? `· ${o.clientCountry}` : ""} ·{" "}
                    {formatDate(o.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-xs font-bold text-primary">{formatMoney(o.total)}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px]",
                      o.status === "delivered" && "border-emerald-600/30 text-emerald-700",
                      o.status === "cancelled" && "border-destructive/30 text-destructive",
                      o.paymentStatus !== "paid" && "border-amber-600/30 text-amber-700",
                    )}
                  >
                    {ORDER_STATUS_LABELS[o.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

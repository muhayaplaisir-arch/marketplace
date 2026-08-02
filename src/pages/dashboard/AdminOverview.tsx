import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, ORDER_STATUS_LABELS } from "@/lib/format";
import { DEFAULT_CURRENCY } from "@/convex/adminConfig";
import {
  Boxes,
  CreditCard,
  Loader2,
  MessagesSquare,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminOverview() {
  const stats = useQuery(api.admin.adminStats);

  if (stats === undefined) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cards = [
    { label: "Utilisateurs", value: stats.totals.users, icon: Users, sub: `${stats.totals.clients} clients` },
    { label: "Fournisseurs", value: stats.totals.suppliers, icon: Store, sub: `${stats.totals.pendingSuppliers} en attente` },
    { label: "Produits", value: stats.totals.products, icon: Boxes, sub: "catalogue actif" },
    { label: "Commandes", value: stats.totals.orders, icon: MessagesSquare, sub: `${stats.totals.conversations} conversations` },
    { label: "Revenus payés", value: formatMoney(stats.totals.totalRevenue), icon: Wallet, sub: DEFAULT_CURRENCY },
    { label: "Admins", value: stats.totals.admins, icon: CreditCard, sub: "accès protégé par code" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          $ innovax --admin --stats
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Vue d'ensemble</h1>
        <p className="text-xs text-muted-foreground">
          Toute la plateforme en un coup d'œil.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-primary/30 bg-primary/[0.07] text-primary">
                <c.icon className="h-4 w-4" />
              </span>
              <Badge variant="outline" className="text-[9px] text-muted-foreground">{c.sub}</Badge>
            </div>
            <p className="mt-3 text-2xl font-bold">{c.value}</p>
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold">Commandes récentes</h2>
        </div>
        {stats.recentOrders.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">Aucune commande pour le moment.</div>
        ) : (
          <div className="divide-y divide-border">
            {stats.recentOrders.map((o: any) => (
              <div key={o._id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {o.orderNumber} · {o.productName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {o.clientName} → {o.supplierName} · {formatDate(o.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-xs font-bold text-primary">{formatMoney(o.total, o.currency)}</p>
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

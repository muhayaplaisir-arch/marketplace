import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, ORDER_STATUS_LABELS } from "@/lib/format";
import { Loader2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminOrders() {
  const orders = useQuery(api.admin.listAllOrders);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          $ innovax --admin --orders
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Commandes</h1>
        <p className="text-xs text-muted-foreground">
          Toutes les commandes de la plateforme, quel que soit l'état.
        </p>
      </div>

      {orders === undefined ? (
        <div className="py-20 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center">
          <Truck className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Aucune commande</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Commande</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Fournisseur</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Paiement</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{o.orderNumber}</p>
                    <p className="text-[10px] text-muted-foreground">{o.productName}</p>
                  </td>
                  <td className="px-4 py-3">{o.clientName}</td>
                  <td className="px-4 py-3">{o.supplierName}</td>
                  <td className="px-4 py-3 font-bold text-primary">{formatMoney(o.total)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px]",
                        o.status === "delivered" && "border-emerald-600/30 text-emerald-700",
                        o.status === "cancelled" && "border-destructive/30 text-destructive",
                        o.status === "pending" && "border-amber-600/30 text-amber-700",
                      )}
                    >
                      {ORDER_STATUS_LABELS[o.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px]",
                        o.paymentStatus === "paid"
                          ? "border-primary/30 text-primary"
                          : "border-amber-600/30 text-amber-700",
                      )}
                    >
                      {o.paymentStatus === "paid" ? "Payée" : "Non payée"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

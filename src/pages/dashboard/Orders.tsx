import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentModal } from "@/components/PaymentModal";
import { formatDate, formatMoney, ORDER_STATUS_LABELS } from "@/lib/format";
import { CheckCircle2, CreditCard, PackageSearch, Truck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-600/15 text-amber-700 border-amber-600/30",
  confirmed: "bg-primary/10 text-primary border-primary/30",
  shipped: "bg-blue-600/10 text-blue-700 border-blue-600/30",
  in_transit: "bg-purple-600/10 text-purple-700 border-purple-600/30",
  delivered: "bg-emerald-600/10 text-emerald-700 border-emerald-600/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

function TrackingTimeline({ order }: { order: any }) {
  const entries = [...order.tracking].sort((a, b) => a.time - b.time);
  return (
    <div className="relative pl-5">
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
      <div className="space-y-4">
        {entries.map((t: any, i: number) => (
          <div key={i} className="relative">
            <span
              className={cn(
                "absolute -left-5 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 bg-card",
                i === entries.length - 1 ? "border-primary" : "border-border",
              )}
            >
              {i === entries.length - 1 && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </span>
            <p className="text-xs font-semibold capitalize">
              {ORDER_STATUS_LABELS[t.status] ?? t.status}
            </p>
            {t.location && <p className="text-[11px] text-muted-foreground">📍 {t.location}</p>}
            {t.note && <p className="text-[11px] text-muted-foreground">{t.note}</p>}
            <p className="text-[10px] text-muted-foreground/70">{formatDate(t.time)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Orders() {
  const orders = useQuery(api.orders.listMyOrders);
  const payOrder = useMutation(api.orders.payOrder);
  const [payingOrder, setPayingOrder] = useState<any>(null);

  if (orders === undefined) {
    return <div className="py-24 text-center text-sm text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          $ innovax --orders
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Mes commandes</h1>
        <p className="text-xs text-muted-foreground">
          Suivez chaque commande jusqu'à la livraison.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center">
          <PackageSearch className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Aucune commande</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Parcourez le marché et commandez votre premier produit.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const paid = order.paymentStatus === "paid";
            const showPay = order.status === "pending" && !paid;
            return (
              <div key={order._id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded border border-primary/30 bg-primary/[0.07] text-primary">
                      <Truck className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold">Commande {order.orderNumber}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {order.supplierName} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("border text-[10px]", STATUS_COLORS[order.status])}>
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        paid
                          ? "border-primary/30 bg-primary/[0.06] text-primary"
                          : "border-amber-600/30 bg-amber-600/[0.06] text-amber-700",
                      )}
                    >
                      {paid ? "Payée" : "Non payée"}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-4 p-4 md:grid-cols-[1fr_240px]">
                  <div>
                    <p className="text-sm font-semibold">{order.productName}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {order.quantity} × {formatMoney(order.unitPrice)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Quantité : {order.quantity}</p>
                    {order.tracking.length > 0 && (
                      <div className="mt-4">
                        <TrackingTimeline order={order} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-between gap-3">
                    <div className="rounded border border-border bg-muted/40 px-3 py-2 text-right">
                      <p className="text-[10px] uppercase text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-primary">{formatMoney(order.total)}</p>
                    </div>
                    {showPay && (
                      <Button className="w-full gap-1.5" onClick={() => setPayingOrder(order)}>
                        <CreditCard className="h-3.5 w-3.5" /> Payer maintenant
                      </Button>
                    )}
                    {paid && (
                      <p className="flex items-center justify-center gap-1.5 text-[11px] text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Paiement confirmé
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PaymentModal
        open={!!payingOrder}
        onOpenChange={(open) => !open && setPayingOrder(null)}
        amount={payingOrder?.total ?? 0}
        label={`Commande ${payingOrder?.orderNumber ?? ""}`}
        onPay={async () => {
          if (!payingOrder) return;
          await payOrder({ orderId: payingOrder._id });
          toast.success("Paiement accepté — le fournisseur peut maintenant expédier.");
        }}
      />
    </div>
  );
}

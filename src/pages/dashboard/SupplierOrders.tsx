import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoney, ORDER_STATUS_LABELS } from "@/lib/format";
import { Layers, Loader2, MapPin, Minus, PackageSearch, Plus, Truck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NEXT_STEPS: Record<string, { status: string; label: string }[]> = {
  confirmed: [
    { status: "shipped", label: "Expédier la commande" },
    { status: "cancelled", label: "Annuler" },
  ],
  shipped: [
    { status: "in_transit", label: "Marquer en transit" },
    { status: "cancelled", label: "Annuler" },
  ],
  in_transit: [
    { status: "delivered", label: "Marquer livrée" },
    { status: "cancelled", label: "Annuler" },
  ],
};

export default function SupplierOrders() {
  const orders = useQuery(api.orders.listSupplierOrders);
  const movements = useQuery(api.orders.listSupplierStockMovements);
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);
  const [active, setActive] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Group stock movements by order so each order card shows its own history.
  const movementsByOrder = useMemo(() => {
    const map = new Map<string, NonNullable<typeof movements>[number][]>();
    if (movements) {
      for (const m of movements) {
        if (!m.orderId) continue;
        const list = map.get(m.orderId) ?? [];
        list.push(m);
        map.set(m.orderId, list);
      }
    }
    return map;
  }, [movements]);

  const openUpdate = (orderId: string) => {
    setActive(orderId);
    setLocation("");
    setNote("");
  };

  const handleUpdate = async (status: string) => {
    if (!active) return;
    setBusy(true);
    try {
      await updateOrderStatus({
        orderId: active as any,
        status: status as any,
        location: location || undefined,
        note: note || undefined,
      });
      toast.success("Suivi de commande mis à jour.");
      setActive(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de mise à jour.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          $ innovax --commandes
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Commandes reçues</h1>
        <p className="text-xs text-muted-foreground">
          Confirmez, expédiez et suivez chaque commande jusqu'à la livraison.
        </p>
      </div>

      {orders === undefined || movements === undefined ? (
        <div className="py-20 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center">
          <PackageSearch className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Aucune commande</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vos commandes apparaîtront ici dès qu'un client commande.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const paid = order.paymentStatus === "paid";
            const steps = NEXT_STEPS[order.status] ?? [];
            const orderMovements = movementsByOrder.get(order._id) ?? [];
            return (
              <div key={order._id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold">Commande {order.orderNumber}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {order.clientName} {order.clientCountry ? `· ${order.clientCountry}` : ""} ·{" "}
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        order.status === "delivered" && "border-emerald-600/30 text-emerald-700",
                        order.status === "cancelled" && "border-destructive/30 text-destructive",
                        order.status === "pending" && "border-amber-600/30 text-amber-700",
                      )}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        paid ? "border-primary/30 text-primary" : "border-amber-600/30 text-amber-700",
                      )}
                    >
                      {paid ? "Payée" : "Non payée"}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-4 p-4 md:grid-cols-[1fr_220px]">
                  <div>
                    <p className="text-sm font-semibold">{order.productName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {order.quantity} × {formatMoney(order.unitPrice)} ={" "}
                      <span className="font-bold text-foreground">{formatMoney(order.total)}</span>
                    </p>
                    {order.stockRemaining !== null && (
                      <p
                        className={cn(
                          "mt-2 inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px]",
                          order.stockRemaining <= 0
                            ? "border-destructive/30 bg-destructive/[0.06] text-destructive"
                            : order.stockRemaining < 10
                              ? "border-amber-600/30 bg-amber-600/[0.06] text-amber-700"
                              : "border-border bg-muted/40 text-muted-foreground",
                        )}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Stock restant :{" "}
                        <span className="font-bold">
                          {order.stockRemaining} {order.stockRemaining > 1 ? "unités" : "unité"}
                        </span>
                      </p>
                    )}
                    <div className="mt-3 space-y-1.5">
                      {order.tracking.map((t: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-[11px]">
                          <Truck
                            className={cn(
                              "mt-0.5 h-3.5 w-3.5 shrink-0",
                              i === order.tracking.length - 1 ? "text-primary" : "text-muted-foreground/50",
                            )}
                          />
                          <p className="text-muted-foreground">
                            <span className="font-semibold capitalize text-foreground">
                              {ORDER_STATUS_LABELS[t.status] ?? t.status}
                            </span>
                            {t.location ? ` — ${t.location}` : ""}
                            {t.note ? ` — ${t.note}` : ""}
                            <span className="text-muted-foreground/60"> · {formatDate(t.time)}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                    {orderMovements.length > 0 && (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                          Historique de stock
                        </p>
                        <div className="mt-2 space-y-1.5">
                          {orderMovements.map((m) => (
                            <div key={m._id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px]">
                              <span className="flex items-center gap-1.5">
                                {m.type === "decrement" ? (
                                  <Minus className="h-3 w-3 shrink-0 text-destructive" />
                                ) : (
                                  <Plus className="h-3 w-3 shrink-0 text-emerald-600" />
                                )}
                                <span
                                  className={cn(
                                    "font-bold",
                                    m.type === "decrement" ? "text-destructive" : "text-emerald-700",
                                  )}
                                >
                                  {m.type === "decrement" ? "−" : "+"}
                                  {m.quantity} {m.quantity > 1 ? "unités" : "unité"}
                                </span>
                                <span className="text-muted-foreground/60">· {m.reason ?? ""}</span>
                              </span>
                              <span className="text-muted-foreground">
                                restant : <span className="font-semibold text-foreground">{m.stockAfter}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {!paid && order.status === "pending" && (
                      <p className="rounded border border-amber-600/30 bg-amber-600/[0.06] px-3 py-2 text-[11px] text-amber-700">
                        En attente du paiement client.
                      </p>
                    )}
                    {steps.length > 0 && (
                      <div className="space-y-2">
                        {active === order._id ? (
                          <>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase text-muted-foreground">Localisation</Label>
                              <div className="relative">
                                <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                  value={location}
                                  onChange={(e) => setLocation(e.target.value)}
                                  placeholder="Ex : Douala, dépôt central"
                                  className="pl-8 font-mono text-xs"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase text-muted-foreground">Note</Label>
                              <Textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Ex : colis remis au transporteur"
                                rows={2}
                                className="font-mono text-xs"
                              />
                            </div>
                            <div className="flex gap-1.5">
                              {steps.map((s) => (
                                <Button
                                  key={s.status}
                                  size="sm"
                                  variant={s.status === "cancelled" ? "outline" : "default"}
                                  className={cn(
                                    "flex-1 text-[10px] h-8",
                                    s.status === "cancelled" && "text-destructive border-destructive/30",
                                  )}
                                  disabled={busy}
                                  onClick={() => handleUpdate(s.status)}
                                >
                                  {s.label}
                                </Button>
                              ))}
                              <Button size="sm" variant="ghost" className="text-[10px] h-8" onClick={() => setActive(null)}>
                                ✕
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" className="w-full text-[11px]" onClick={() => openUpdate(order._id)}>
                            Mettre à jour le suivi
                          </Button>
                        )}
                      </div>
                    )}
                    {order.status === "delivered" && (
                      <p className="rounded border border-primary/30 bg-primary/[0.06] px-3 py-2 text-[11px] text-primary">
                        ✓ Commande livrée — terminée.
                      </p>
                    )}
                    {order.status === "cancelled" && (
                      <p className="rounded border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-[11px] text-destructive">
                        Commande annulée.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

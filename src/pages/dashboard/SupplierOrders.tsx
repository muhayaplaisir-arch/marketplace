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
           

[FILE_TOO_LARGE]: The combined read_files output exceeded the 100 000 character hard limit. This file was truncated after 4 050 characters. Read it separately or use code_search for the relevant section.
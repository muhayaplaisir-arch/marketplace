import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatMoney, ORDER_STATUS_LABELS } from "@/lib/format";
import {
  Activity,
  History,
  Layers,
  Package,
  ShoppingBag,
  Store,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StockPoint = {
  time: number;
  stock: number;
  label: string;
  type?: string;
  quantity?: number;
  reason?: string;
  orderNumber?: string;
  isToday?: boolean;
};

const chartConfig = {
  stock: { label: "Stock", color: "var(--chart-1)" },
} satisfies ChartConfig;

function StockTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as StockPoint;
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-mono font-bold">{p.label}</p>
      <p className={cn("mt-1 font-mono text-sm font-bold", p.isToday ? "text-primary" : "text-foreground")}>
        {p.stock} {p.stock > 1 ? "unités" : "unité"}
      </p>
      {p.type && (
        <p
          className={cn(
            "mt-0.5 font-mono",
            p.type === "decrement" ? "text-destructive" : "text-emerald-700",
          )}
        >
          {p.type === "decrement" ? "▼ −" : "▲ +"}
          {p.quantity} {p.quantity && p.quantity > 1 ? "unités" : "unité"}
        </p>
      )}
      {p.reason && <p className="mt-0.5 text-muted-foreground">{p.reason}</p>}
      {p.orderNumber && (
        <p className="mt-0.5 text-[10px] text-muted-foreground/70">Commande {p.orderNumber}</p>
      )}
    </div>
  );
}

export default function SupplierOverview() {
  const { user } = useAuth();
  const products = useQuery(api.products.listMyProducts);
  const orders = useQuery(api.orders.listSupplierOrders);
  const movements = useQuery(api.orders.listSupplierStockMovements);
  const pendingSuppliers = useQuery(
    api.admin.listSuppliers,
    user?.role === "admin" ? { status: "pending" } : "skip",
  );

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

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

  // Products that actually have stock movements, sorted by most activity.
  const productsWithMovements = useMemo(() => {
    if (!movements || !products) return [];
    const count = new Map<string, number>();
    for (const m of movements) count.set(m.productId, (count.get(m.productId) ?? 0) + 1);
    return products
      .map((p) => ({ product: p, count: count.get(p._id) ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [movements, products]);

  const selectedEntry =
    productsWithMovements.find((x) => x.product._id === selectedProductId) ??
    productsWithMovements[0];

  // Reconstruct the stock timeline for the selected product from its movements.
  const points = useMemo(() => {
    if (!selectedEntry || !movements) return [];
    const productId = selectedEntry.product._id;
    const moves = movements
      .filter((m) => m.productId === productId)
      .sort((a, b) => a.createdAt - b.createdAt);
    if (moves.length === 0) return [];
    const pts: StockPoint[] = [];
    const first = moves[0];
    const startStock =
      first.type === "decrement"
        ? first.stockAfter + first.quantity
        : Math.max(0, first.stockAfter - first.quantity);
    pts.push({ time: first.createdAt - 1, stock: startStock, label: "Début du suivi" });
    for (const m of moves) {
      pts.push({
        time: m.createdAt,
        stock: m.stockAfter,
        label: formatDate(m.createdAt),
        type: m.type,
        quantity: m.quantity,
        reason: m.reason ?? undefined,
        orderNumber: m.orderNumber ?? undefined,
      });
    }
    const last = pts[pts.length - 1];
    if (selectedEntry.product.stock !== last.stock) {
      pts.push({
        time: Date.now(),
        stock: selectedEntry.product.stock,
        label: "Aujourd'hui",
        isToday: true,
      });
    }
    return pts;
  }, [selectedEntry, movements]);

  const firstStock = points.length ? points[0].stock : 0;
  const lastStock = points.length ? points[points.length - 1].stock : 0;
  const delta = lastStock - firstStock;

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

      {/* Évolution du stock */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold">Évolution du stock</h2>
            <p className="text-[10px] text-muted-foreground font-mono">$ innovax --stock --area</p>
          </div>
          {productsWithMovements.length > 0 && (
            <Select
              value={selectedEntry?.product._id ?? ""}
              onValueChange={(v) => setSelectedProductId(v)}
            >
              <SelectTrigger className="h-8 w-[220px] max-w-full font-mono text-xs">
                <SelectValue placeholder="Choisir un produit" />
              </SelectTrigger>
              <SelectContent>
                {productsWithMovements.map((x) => (
                  <SelectItem key={x.product._id} value={x.product._id} className="font-mono text-xs">
                    {x.product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {movements === undefined ? (
          <div className="p-6 text-xs text-muted-foreground">Chargement…</div>
        ) : productsWithMovements.length === 0 || !selectedEntry || points.length < 2 ? (
          <div className="p-10 text-center">
            <Activity className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">Pas encore de suivi de stock</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
              Le graphique se remplira dès qu'une commande sera payée : chaque paiement fait
              apparaître un mouvement de stock sur ce produit.
            </p>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded border border-border bg-muted/30 p-3">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                  <Layers className="h-3 w-3" /> Stock actuel
                </p>
                <p className="mt-1 text-lg font-bold">{selectedEntry.product.stock}</p>
              </div>
              <div className="rounded border border-border bg-muted/30 p-3">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                  <Activity className="h-3 w-3" /> Variation
                </p>
                <p
                  className={cn(
                    "mt-1 flex items-center gap-1 text-lg font-bold",
                    delta >= 0 ? "text-emerald-700" : "text-destructive",
                  )}
                >
                  {delta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {delta >= 0 ? "+" : ""}
                  {delta}
                </p>
              </div>
              <div className="rounded border border-border bg-muted/30 p-3">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                  <History className="h-3 w-3" /> Mouvements
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-lg font-bold">
                  {selectedEntry.count}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({points.filter((p) => p.type).length} événements)
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <AreaChart data={points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stockAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-stock)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-stock)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={40}
                    tickFormatter={(t: number) =>
                      new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(t)
                    }
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, "dataMax + 2"]}
                    tickLine={false}
                    axisLine={false}
                    width={34}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
                    content={<StockTooltip />}
                  />
                  <Area
                    dataKey="stock"
                    type="monotone"
                    stroke="var(--color-stock)"
                    strokeWidth={2}
                    fill="url(#stockAreaFill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        )}
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


[FILE_TOO_LARGE]: The combined read_files output exceeded the 100 000 character hard limit. This file was truncated after 12 602 characters. Read it separately or use code_search for the relevant section.
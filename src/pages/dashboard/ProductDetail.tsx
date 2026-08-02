import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import {
  ArrowLeft,
  BadgeCheck,
  Minus,
  MessageSquareText,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const product = useQuery(api.products.getProduct, { id: productId as any });
  const createOrder = useMutation(api.orders.createOrder);
  const startConversation = useMutation(api.chat.startConversation);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  if (product === undefined) {
    return <div className="py-24 text-center text-sm text-muted-foreground">Chargement…</div>;
  }
  if (!product) {
    return <div className="py-24 text-center text-sm text-muted-foreground">Produit introuvable.</div>;
  }

  const clampQty = (v: number) => Math.max(1, Math.min(product.stock, v));

  const handleOrder = async () => {
    setBusy(true);
    try {
      const res = await createOrder({ productId: product._id, quantity: qty });
      toast.success(`Commande ${res.orderId.slice(0, 6)} créée — passez au paiement.`);
      navigate("/dashboard/orders");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la commande.");
      setBusy(false);
    }
  };

  const handleChat = async () => {
    if (!product.supplier) return;
    setBusy(true);
    try {
      const conversationId = await startConversation({
        supplierId: product.supplier._id,
        productId: product._id,
      });
      navigate(`/dashboard/chat/${conversationId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-3.5 w-3.5" /> Retour au marché
      </Button>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* image */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="relative flex h-72 items-center justify-center bg-muted/50 border-b border-border text-8xl">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center">
              {product.category === "Électronique"
                ? "📱"
                : product.category === "Textile"
                  ? "👕"
                  : product.category === "Alimentaire"
                    ? "🥫"
                    : product.category === "Machines"
                      ? "⚙️"
                      : product.category === "Construction"
                        ? "🏗️"
                        : "📦"}
            </span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <Badge variant="secondary" className="text-[10px]">
              {product.category}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {product.stock} en stock
            </Badge>
          </div>
        </div>

        {/* info */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
              prix
            </p>
            <p className="mt-1 text-3xl font-bold text-primary">
              {formatMoney(product.price, product.currency)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/ {product.unit}</span>
            </p>
            {product.moq ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Quantité minimale de commande : {product.moq} {product.unit}(s)
              </p>
            ) : null}
          </div>

          {product.supplier && (
            <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded border border-primary/30 bg-primary/[0.07] text-primary">
                <BadgeCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {product.supplier.company || product.supplier.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Fournisseur vérifié {product.supplier.country ? `· ${product.supplier.country}` : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" className="text-xs" onClick={handleChat} disabled={busy}>
                <MessageSquareText className="h-3.5 w-3.5" /> Discuter
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Quantité</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty(clampQty(qty - 1))}>
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <Input
                  type="number"
                  value={qty}
                  min={1}
                  max={product.stock}
                  onChange={(e) => setQty(clampQty(parseInt(e.target.value) || 1))}
                  className="h-8 w-16 text-center font-mono text-sm"
                />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty(clampQty(qty + 1))}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded border border-primary/30 bg-primary/[0.05] px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Total</p>
              <p className="text-sm font-bold text-primary">{formatMoney(product.price * qty, product.currency)}</p>
            </div>
            <Button className="w-full gap-2" onClick={handleOrder} disabled={busy}>
              <ShoppingCart className="h-4 w-4" /> Commander maintenant
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              Paiement simulé — le bouton de paiement sera aussi disponible dans le chat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

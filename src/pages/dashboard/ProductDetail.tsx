import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Minus,
  MessageSquareText,
  Plus,
  ShoppingCart,
  Sparkles,
  Store,
} from "lucide-react";
import { toast } from "sonner";

function fallbackImage(category: string) {
  const emoji: Record<string, string> = {
    Électronique: "📱",
    Textile: "👕",
    Alimentaire: "🥫",
    Machines: "⚙️",
    Beauté: "🧴",
    Construction: "🏗️",
    Autre: "📦",
  };
  return emoji[category] ?? "📦";
}

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const product = useQuery(api.products.getProduct, { id: productId as any });
  const similar = useQuery(
    api.products.listMarketplaceProducts,
    product ? { category: product.category } : "skip",
  );
  const createOrder = useMutation(api.orders.createOrder);
  const startConversation = useMutation(api.chat.startConversation);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setActiveImage(0);
  }, [productId]);

  if (product === undefined) {
    return <div className="py-24 text-center text-sm text-muted-foreground">Chargement…</div>;
  }
  if (!product) {
    return <div className="py-24 text-center text-sm text-muted-foreground">Produit introuvable.</div>;
  }

  const images = [product.imageUrl, ...(product.galleryUrls ?? [])].filter(
    (u): u is string => !!u,
  );
  const safeIndex = Math.min(activeImage, Math.max(0, images.length - 1));
  const similarProducts = (similar ?? []).filter((p) => p._id !== product._id).slice(0, 6);

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
        {/* image gallery */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="relative flex h-80 items-center justify-center overflow-hidden border-b border-border bg-muted/50 text-8xl">
            {/* emoji fallback behind the image */}
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
            {images.length > 0 && (
              <img
                key={safeIndex}
                src={images[safeIndex]}
                alt={product.name}
                className="relative z-10 h-full w-full animate-fade-in object-contain p-4"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 z-20 h-8 w-8 -translate-y-1/2 cursor-pointer rounded-full border border-border bg-background/80 hover:bg-background"
                  onClick={() =>
                    setActiveImage((safeIndex - 1 + images.length) % images.length)
                  }
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 z-20 h-8 w-8 -translate-y-1/2 cursor-pointer rounded-full border border-border bg-background/80 hover:bg-background"
                  onClick={() => setActiveImage((safeIndex + 1) % images.length)}
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex flex-wrap gap-2 p-3">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    "cursor-pointer overflow-hidden rounded border transition-all",
                    i === safeIndex
                      ? "border-primary ring-1 ring-primary"
                      : "border-border opacity-70 hover:opacity-100",
                  )}
                  aria-label={`Photo ${i + 1}`}
                >
                  <img src={src} alt="" className="h-14 w-14 object-contain bg-muted/40 p-1" />
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border p-4">
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

      {/* similar products */}
      {similarProducts.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                $ innovax --similaires
              </p>
              <h2 className="mt-0.5 flex items-center gap-1.5 text-lg font-bold tracking-tight">
                <Sparkles className="h-4 w-4 text-primary" /> Produits similaires
              </h2>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Même catégorie · {product.category}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similarProducts.map((p) => (
              <button
                key={p._id}
                onClick={() => navigate(`/dashboard/product/${p._id}`)}
                className="group rounded-lg border border-border bg-card overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="relative flex h-36 items-center justify-center bg-muted/50 border-b border-border text-5xl">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-contain p-3 group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  <span className="absolute inset-0 flex items-center justify-center">
                    {fallbackImage(p.category)}
                  </span>
                  <Badge variant="secondary" className="absolute left-2 top-2 text-[9px] bg-background/90">
                    {p.category}
                  </Badge>
                </div>
                <div className="p-3">
                  <h3 className="text-xs font-semibold line-clamp-1">{p.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                    <Store className="h-3 w-3 shrink-0" /> {p.supplierName}
                  </p>
                  <p className="mt-2 text-sm font-bold text-primary">
                    {formatMoney(p.price, p.currency)}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">/ {p.unit}</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

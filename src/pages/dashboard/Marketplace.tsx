import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataPagination } from "@/components/DataPagination";
import { usePagination } from "@/hooks/use-pagination";
import { formatMoney } from "@/lib/format";
import { PackageSearch, Search, Store } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 9;

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

export default function Marketplace() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const products = useQuery(api.products.listMarketplaceProducts, {
    search: search || undefined,
    category: category || undefined,
  });
  const categories = useQuery(api.products.listCategories);
  const { page, setPage, totalPages, slice, from, to, total } = usePagination(
    products,
    PAGE_SIZE,
    `${search}|${category ?? "all"}`,
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          $ innovax --marketplace
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Le marché B2B</h1>
        <p className="text-xs text-muted-foreground">
          Produits publiés par des fournisseurs validés.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="pl-9 font-mono text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            key="all"
            variant={category === null ? "default" : "outline"}
            size="sm"
            className="text-[11px] h-7"
            onClick={() => setCategory(null)}
          >
            Tous
          </Button>
          {(categories ?? []).map((c) => (
            <Button
              key={c}
              variant={category === c ? "default" : "outline"}
              size="sm"
              className="text-[11px] h-7"
              onClick={() => setCategory(category === c ? null : c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {products === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg border border-border bg-card/50" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center">
          <PackageSearch className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Aucun produit trouvé</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Essayez une autre recherche ou revenez plus tard.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {slice!.map((p) => (
              <button
                key={p._id}
                onClick={() => navigate(`/dashboard/product/${p._id}`)}
                className="group rounded-lg border border-border bg-card overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="relative flex h-44 items-center justify-center bg-muted/50 border-b border-border text-6xl">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{fallbackImage(p.category)}</span>
                  )}
                  {!p.imageUrl && (
                    <span className="absolute inset-0 flex items-center justify-center text-6xl">
                      {fallbackImage(p.category)}
                    </span>
                  )}
                  <Badge
                    variant="secondary"
                    className="absolute left-2 top-2 text-[9px] bg-background/90"
                  >
                    {p.category}
                  </Badge>
                  {p.moq ? (
                    <Badge className="absolute right-2 top-2 text-[9px] bg-amber-600 text-white">
                      MOQ {p.moq}
                    </Badge>
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold line-clamp-1">{p.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Store className="h-3 w-3" /> {p.supplierName}
                  </p>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-lg font-bold text-primary">
                      {formatMoney(p.price, p.currency)}
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        / {p.unit}
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.stock} en stock
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <DataPagination
            page={page}
            totalPages={totalPages}
            total={total}
            from={from}
            to={to}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataPagination, RowNumber } from "@/components/DataPagination";
import { usePagination } from "@/hooks/use-pagination";
import { formatMoney, SUPPLIER_STATUS_LABELS } from "@/lib/format";
import { CheckCircle2, Loader2, Store, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "pending" | "approved" | "rejected";

const PAGE_SIZE = 10;

export default function AdminSuppliers() {
  const [tab, setTab] = useState<Tab>("pending");
  const pending = useQuery(api.admin.listSuppliers, { status: "pending" });
  const approved = useQuery(api.admin.listSuppliers, { status: "approved" });
  const rejected = useQuery(api.admin.listSuppliers, { status: "rejected" });
  const approveSupplier = useMutation(api.admin.approveSupplier);
  const rejectSupplier = useMutation(api.admin.rejectSupplier);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const data: Record<Tab, any[] | undefined> = { pending, approved, rejected };

  const list = data[tab];
  const { page, setPage, totalPages, slice, from, to, total } = usePagination(
    list,
    PAGE_SIZE,
    tab,
  );

  const handleApprove = async (id: string) => {
    setBusy(true);
    try {
      await approveSupplier({ supplierId: id as any });
      toast.success("Fournisseur validé — ses produits sont maintenant en ligne.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!reason.trim()) {
      toast.error("Indiquez un motif de refus.");
      return;
    }
    setBusy(true);
    try {
      await rejectSupplier({ supplierId: id as any, reason: reason.trim() });
      toast.success("Fournisseur refusé.");
      setRejecting(null);
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          $ innovax --admin --suppliers
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Fournisseurs</h1>
        <p className="text-xs text-muted-foreground">
          Validez les nouveaux fournisseurs pour qu'ils puissent publier leurs produits.
        </p>
      </div>

      <div className="flex gap-1.5">
        {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "default" : "outline"}
            className="text-[11px] h-8"
            onClick={() => setTab(t)}
          >
            {t === "pending" ? "En attente" : t === "approved" ? "Validés" : "Refusés"}
            {data[t] !== undefined && (
              <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-[9px]">
                {data[t]!.length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {list === undefined ? (
        <div className="py-20 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center">
          <Store className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Aucun fournisseur ici</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border/60">
            {slice!.map((s, i) => (
              <div key={s._id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <RowNumber index={i} page={page} pageSize={PAGE_SIZE} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{s.company || s.name}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px]",
                            s.supplierStatus === "approved" && "border-primary/30 text-primary",
                            s.supplierStatus === "pending" && "border-amber-600/30 text-amber-700",
                            s.supplierStatus === "rejected" && "border-destructive/30 text-destructive",
                          )}
                        >
                          {SUPPLIER_STATUS_LABELS[s.supplierStatus ?? "pending"]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {s.name} {s.email ? `· ${s.email}` : ""}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        {s.businessType && <span>🏭 {s.businessType}</span>}
                        {s.country && <span>🌍 {s.country}</span>}
                        {s.phone && <span>📞 {s.phone}</span>}
                      </div>
                      <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                        <span>{s.productCount} produits</span>
                        <span>{s.orderCount} commandes</span>
                        <span>{formatMoney(s.totalRevenue)} de revenus</span>
                      </div>
                      {s.supplierStatus === "rejected" && s.rejectedReason && (
                        <p className="mt-2 rounded border border-destructive/20 bg-destructive/[0.05] px-3 py-1.5 text-[11px] text-destructive">
                          Motif : {s.rejectedReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {s.supplierStatus !== "approved" && (
                      <Button
                        size="sm"
                        className="gap-1 text-[11px]"
                        disabled={busy}
                        onClick={() => handleApprove(s._id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Valider
                      </Button>
                    )}
                    {s.supplierStatus !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-[11px] text-destructive border-destructive/30"
                        disabled={busy}
                        onClick={() => setRejecting(s._id)}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Refuser
                      </Button>
                    )}
                  </div>
                </div>
                {rejecting === s._id && (
                  <div className="mt-3 space-y-2 rounded-md border border-destructive/20 bg-muted/40 p-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground">
                        Motif du refus
                      </Label>
                      <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ex : informations d'entreprise incomplètes"
                        rows={2}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={busy || !reason.trim()}
                        onClick={() => handleReject(s._id)}
                      >
                        Confirmer le refus
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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
        </div>
      )}
    </div>
  );
}

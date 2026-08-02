import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import { Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Électronique", "Textile", "Alimentaire", "Machines", "Beauté", "Construction", "Autre"];
const UNITS = ["unité", "pièce", "kg", "tonne", "carton", "litre", "mètre"];

interface FormState {
  name: string;
  description: string;
  category: string;
  price: string;
  unit: string;
  imageUrl: string;
  stock: string;
  moq: string;
}

const emptyForm: FormState = {
  name: "",
  description: "",
  category: CATEGORIES[0],
  price: "",
  unit: UNITS[0],
  imageUrl: "",
  stock: "",
  moq: "",
};

export default function SupplierProducts() {
  const products = useQuery(api.products.listMyProducts);
  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const deleteProduct = useMutation(api.products.deleteProduct);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (p: any) => {
    setEditing(p._id);
    setForm({
      name: p.name,
      description: p.description,
      category: p.category,
      price: String(p.price),
      unit: p.unit,
      imageUrl: p.imageUrl ?? "",
      stock: String(p.stock),
      moq: p.moq ? String(p.moq) : "",
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        price: Number(form.price) || 0,
        unit: form.unit,
        imageUrl: form.imageUrl || undefined,
        stock: Number(form.stock) || 0,
        moq: form.moq ? Number(form.moq) : undefined,
      };
      if (editing) {
        await updateProduct({ id: editing as any, ...payload });
        toast.success("Produit mis à jour.");
      } else {
        await createProduct(payload);
        toast.success("Produit publié sur le marché.");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await deleteProduct({ id: id as any });
      toast.success("Produit supprimé.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    }
  };

  const toggleActive = async (p: any) => {
    try {
      await updateProduct({ id: p._id, active: !p.active });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    }
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            $ innovax --produits
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Mes produits</h1>
          <p className="text-xs text-muted-foreground">
            Gérez votre catalogue — visibles uniquement après validation admin.
          </p>
        </div>
        <Button className="gap-1.5 text-xs" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nouveau produit
        </Button>
      </div>

      {products === undefined ? (
        <div className="py-20 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Aucun produit</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajoutez votre premier produit pour commencer à vendre.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p._id} className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded border border-border bg-muted/50 text-2xl">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>📦</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <Badge
                    variant={p.active ? "outline" : "secondary"}
                    className={cn(
                      "text-[9px]",
                      p.active && "border-primary/30 text-primary",
                    )}
                  >
                    {p.active ? "Publié" : "Masqué"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {p.category} · {p.stock} en stock
                  {p.moq ? ` · MOQ ${p.moq}` : ""}
                </p>
                <p className="mt-0.5 text-sm font-bold text-primary">
                  {formatMoney(p.price)} <span className="text-[10px] font-normal text-muted-foreground">/ {p.unit}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="text-[11px]" onClick={() => toggleActive(p)}>
                  {p.active ? "Masquer" : "Publier"}
                </Button>
                <Button variant="outline" size="icon" onClick={() => openEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDelete(p._id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              {editing ? "$ produit --edit" : "$ produit --create"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground">Nom du produit *</Label>
              <Input value={form.name} onChange={set("name")} required className="font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground">Description</Label>
              <Textarea value={form.description} onChange={set("description")} rows={2} className="font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Unité</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Prix (XAF) *</Label>
                <Input type="number" min={0} value={form.price} onChange={set("price")} required className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Stock *</Label>
                <Input type="number" min={0} value={form.stock} onChange={set("stock")} required className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">MOQ</Label>
                <Input type="number" min={0} value={form.moq} onChange={set("moq")} className="font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground">Image (URL)</Label>
              <Input value={form.imageUrl} onChange={set("imageUrl")} placeholder="https://…" className="font-mono text-xs" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" className="flex-1" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {editing ? "Enregistrer" : "Publier"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...args: (string | false | null | undefined)[]) {
  return args.filter(Boolean).join(" ");
}

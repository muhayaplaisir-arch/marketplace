import { useRef, useState } from "react";
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
import { DataPagination, RowNumber } from "@/components/DataPagination";
import { usePagination } from "@/hooks/use-pagination";
import { formatMoney } from "@/lib/format";
import {
  ImagePlus,
  Images,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Électronique", "Textile", "Alimentaire", "Machines", "Beauté", "Construction", "Autre"];
const UNITS = ["unité", "pièce", "kg", "tonne", "carton", "litre", "mètre"];
const CURRENCIES = ["USD", "EUR", "XAF", "XOF", "GBP", "CNY", "NGN", "GHS", "MAD", "ZAR", "KES", "EGP"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_GALLERY = 8;
const PAGE_SIZE = 8;

interface FormState {
  name: string;
  description: string;
  category: string;
  price: string;
  unit: string;
  imageUrl: string;
  stock: string;
  moq: string;
  currency: string;
}

interface GalleryItem {
  id: string; // storage id for existing images
  url: string; // resolved url for existing images ('' if not resolvable)
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
  currency: "USD",
};

export default function SupplierProducts() {
  const products = useQuery(api.products.listMyProducts);
  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const deleteProduct = useMutation(api.products.deleteProduct);
  const generateUploadUrl = useMutation(api.products.generateUploadUrl);
  const { page, setPage, totalPages, slice, from, to, total } = usePagination(
    products,
    PAGE_SIZE,
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gallery (additional photos)
  const [existingGallery, setExistingGallery] = useState<GalleryItem[]>([]);
  const [removedGalleryIds, setRemovedGalleryIds] = useState<string[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const resetImages = () => {
    galleryPreviews.forEach((p) => URL.revokeObjectURL(p));
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setExistingGallery([]);
    setRemovedGalleryIds([]);
    setGalleryFiles([]);
    setGalleryPreviews([]);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    resetImages();
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
      imageUrl: p.imageStorageId ? "" : (p.imageUrl ?? ""),
      stock: String(p.stock),
      moq: p.moq ? String(p.moq) : "",
      currency: p.currency ?? "USD",
    });
    setImageFile(null);
    setImagePreview(null);
    setExistingGallery(
      (p.galleryStorageIds ?? []).map((id: string, i: number) => ({
        id,
        url: p.galleryUrls?.[i] ?? "",
      })),
    );
    setRemovedGalleryIds([]);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez choisir un fichier image (PNG, JPG, WebP…).");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image trop lourde — maximum 5 Mo.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setForm((f) => ({ ...f, imageUrl: "" }));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setForm((f) => ({ ...f, imageUrl: "" }));
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const valid: File[] = [];
    for (const f of files) {
      if (!f.type.startsWith("image/")) {
        toast.error(`« ${f.name} » n'est pas une image.`);
        continue;
      }
      if (f.size > MAX_IMAGE_SIZE) {
        toast.error(`« ${f.name} » dépasse 5 Mo.`);
        continue;
      }
      valid.push(f);
    }
    const total = existingGallery.length + galleryFiles.length + valid.length;
    if (total > MAX_GALLERY) {
      toast.error(`Maximum ${MAX_GALLERY} photos dans la galerie.`);
    }
    const room = Math.max(0, MAX_GALLERY - (existingGallery.length + galleryFiles.length));
    const accepted = valid.slice(0, room);
    if (accepted.length === 0) return;
    setGalleryFiles((prev) => [...prev, ...accepted]);
    setGalleryPreviews((prev) => [...prev, ...accepted.map((f) => URL.createObjectURL(f))]);
  };

  const removeNewGallery = (index: number) => {
    setGalleryPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingGallery = (id: string) => {
    setRemovedGalleryIds((prev) => [...prev, id]);
    setExistingGallery((prev) => prev.filter((g) => g.id !== id));
  };

  const uploadFile = async (file: File): Promise<string> => {
    const uploadUrl = await generateUploadUrl();
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error("Échec du téléversement d'une image.");
    const data = (await res.json()) as { storageId: string };
    return data.storageId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let imageStorageId: string | undefined;
      if (imageFile) {
        imageStorageId = await uploadFile(imageFile);
      }
      const uploadedIds: string[] = [];
      for (const f of galleryFiles) {
        uploadedIds.push(await uploadFile(f));
      }
      const keptExisting = existingGallery
        .map((g) => g.id)
        .filter((id) => !removedGalleryIds.includes(id));
      const galleryStorageIds = [...keptExisting, ...uploadedIds];

      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        price: Number(form.price) || 0,
        unit: form.unit,
        imageUrl: imageFile ? "" : form.imageUrl || undefined,
        imageStorageId: imageStorageId as any,
        galleryStorageIds: (galleryStorageIds.length > 0 ? galleryStorageIds : undefined) as any,
        currency: form.currency,
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
      resetImages();
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

  const currentImage = imagePreview ?? (form.imageUrl ? form.imageUrl : null);
  const galleryCount = existingGallery.length + galleryFiles.length;

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
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="space-y-0 divide-y divide-border/60">
            {slice!.map((p, i) => (
              <div key={p._id} className="flex flex-wrap items-center gap-4 p-4">
                <RowNumber index={i} page={page} pageSize={PAGE_SIZE} />
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded border border-border bg-muted/50 text-2xl">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="h-full w-full object-contain p-1" />
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
                    {p.galleryUrls && p.galleryUrls.length > 0 ? ` · ${p.galleryUrls.length + (p.imageUrl ? 1 : 0)} photos` : ""}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-primary">
                    {formatMoney(p.price, p.currency)} <span className="text-[10px] font-normal text-muted-foreground">/ {p.unit}</span>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Prix *</Label>
                <Input type="number" min={0} value={form.price} onChange={set("price")} required className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Devise</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Stock *</Label>
                <Input type="number" min={0} value={form.stock} onChange={set("stock")} required className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">MOQ</Label>
                <Input type="number" min={0} value={form.moq} onChange={set("moq")} className="font-mono text-sm" />
              </div>
            </div>

            {/* Cover image */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground">Image principale</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 shrink-0 cursor-pointer text-[11px]"
                  onClick={() => fileInputRef.current?.click()}
                  title="Importer une photo depuis votre ordinateur"
                >
                  <ImagePlus className="h-4 w-4" /> Importer une photo
                </Button>
                <Input
                  value={form.imageUrl}
                  onChange={set("imageUrl")}
                  placeholder="ou URL https://…"
                  className="flex-1 font-mono text-xs"
                />
              </div>
              {currentImage && (
                <div className="flex items-center gap-2">
                  <span className="relative">
                    <img
                      src={currentImage}
                      alt="Aperçu"
                      className="h-16 w-16 rounded border border-primary/40 object-contain bg-muted/40"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Retirer l'image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground font-mono">
                    {imageFile ? imageFile.name : "Image actuelle"}
                  </span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                Photo principale (PNG, JPG, WebP — max 5 Mo) ou lien d'image.
              </p>
            </div>

            {/* Gallery */}
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground">
                  <Images className="h-3.5 w-3.5" /> Galerie photos ({galleryCount}/{MAX_GALLERY})
                </Label>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleGalleryChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 cursor-pointer text-[10px] h-7"
                  onClick={() => galleryInputRef.current?.click()}
                  title="Ajouter plusieurs photos"
                >
                  <Plus className="h-3 w-3" /> Ajouter des photos
                </Button>
              </div>
              {galleryCount === 0 ? (
                <p className="text-[10px] text-muted-foreground">
                  Montrez le produit sous plusieurs angles (jusqu'à {MAX_GALLERY} photos).
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {existingGallery.map((g) => (
                    <span key={g.id} className="relative">
                      {g.url ? (
                        <img
                          src={g.url}
                          alt=""
                          className="h-16 w-full rounded border border-border object-contain bg-muted/40"
                        />
                      ) : (
                        <span className="flex h-16 w-full items-center justify-center rounded border border-border bg-muted/40 text-lg">
                          📷
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingGallery(g.id)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Retirer la photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {galleryPreviews.map((src, i) => (
                    <span key={src} className="relative">
                      <img
                        src={src}
                        alt=""
                        className="h-16 w-full rounded border border-primary/40 object-contain bg-muted/40"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewGallery(i)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Retirer la photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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

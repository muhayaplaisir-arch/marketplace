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
import { formatMoney } from "@/lib/format";
import { ImagePlus, Loader2, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Électronique", "Textile", "Alimentaire", "Machines", "Beauté", "Construction", "Autre"];
const UNITS = ["unité", "pièce", "kg", "tonne", "carton", "litre", "mètre"];
const CURRENCIES = ["USD", "EUR", "XAF", "XOF", "GBP", "CNY", "NGN", "GHS", "MAD", "ZAR", "KES", "EGP"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

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

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let imageStorageId: string | undefined;
      if (imageFile) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });
        if (!res.ok) throw new Error("Échec du téléversement de l'image.");
        const data = (await res.json()) as { storageId: string };
        imageStorageId = data.storageId;
      }
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        price: Number(form.price) || 0,
        unit: form.unit,
        imageUrl: imageFile ? "" : form.imageUrl || undefined,
        imageStorageId: imageStorageId as any,
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
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview(null);
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
                <p className="text-[11px

[FILE_TOO_LARGE]: The combined read_files output exceeded the 100 000 character hard limit. This file was truncated after 8 312 characters. Read it separately or use code_search for the relevant section.
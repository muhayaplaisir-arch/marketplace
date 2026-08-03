import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentModal } from "@/components/PaymentModal";
import { formatDate, formatMoney, ROLE_LABELS, timeAgo } from "@/lib/format";
import { DEFAULT_CURRENCY } from "@/convex/adminConfig";
import {
  CheckCircle2,
  CreditCard,
  FileText,
  ImagePlus,
  Loader2,
  MessageSquareText,
  Send,
  Store,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ROLES } from "@/convex/constants";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DISCOUNT_PCT = 90;

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const conversations = useQuery(api.chat.listMyConversations);
  const conversation = useQuery(
    api.chat.getConversation,
    conversationId ? { id: conversationId as any } : "skip",
  );
  const messages = useQuery(
    api.chat.listMessages,
    conversationId ? { conversationId: conversationId as any } : "skip",
  );
  const unread = useQuery(api.chat.getUnreadSummary);
  const supplierProducts = useQuery(
    api.products.listMyProducts,
    user?.role === ROLES.SUPPLIER ? {} : "skip",
  );
  const sendMessage = useMutation(api.chat.sendMessage);
  const requestPayment = useMutation(api.chat.requestPayment);
  const payPaymentRequest = useMutation(api.chat.payPaymentRequest);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);
  const markConversationRead = useMutation(api.chat.markConversationRead);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [payReqOpen, setPayReqOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [payingPr, setPayingPr] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevPayReqOpenRef = useRef(false);

  // Payment request form (product + quantity + discount).
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [qty, setQty] = useState("1");
  const [discount, setDiscount] = useState("0");

  const isSupplier = user?.role === ROLES.SUPPLIER;
  const selectedProduct = supplierProducts?.find((p) => p._id === selectedProductId);

  // Mark the opened conversation as read once its messages are loaded
  // (and again whenever a new incoming message arrives while viewing).
  useEffect(() => {
    if (!conversationId || messages === undefined) return;
    const count = unread?.perConversation[conversationId] ?? 0;
    if (count > 0) {
      markConversationRead({ conversationId: conversationId as any });
    }
  }, [conversationId, messages, unread, markConversationRead]);

  // Reset the payment form each time the popup opens.
  useEffect(() => {
    if (payReqOpen && !prevPayReqOpenRef.current) {
      setQty("1");
      setDiscount("0");
      setNote("");
      setAmount("");
      setSelectedProductId((conversation as any)?.productId ?? "");
    }
    prevPayReqOpenRef.current = payReqOpen;
  }, [payReqOpen, conversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, conversationId]);

  // Revoke the local preview object URL when it changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const qtyNum = Math.max(1, parseInt(qty, 10) || 1);
  const discountPct = Math.min(MAX_DISCOUNT_PCT, Math.max(0, parseFloat(discount) || 0));
  const unitPriceAfter = selectedProduct
    ? Math.round(selectedProduct.price * (1 - discountPct / 100))
    : null;
  const computedTotal = selectedProduct && unitPriceAfter !== null ? qtyNum * unitPriceAfter : null;
  const finalAmount = computedTotal ?? (Number(amount) || 0);

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
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationId || sending) return;
    const trimmed = text.trim();
    if (!trimmed && !imageFile) return;
    setSending(true);
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
      await sendMessage({
        conversationId: conversationId as any,
        content: trimmed || undefined,
        imageStorageId: imageStorageId as any,
      });
      setText("");
      clearImage();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'envoi.");
    } finally {
      setSending(false);
    }
  };

  const handleRequestPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationId || finalAmount <= 0) return;
    try {
      await requestPayment({
        conversationId: conversationId as any,
        amount: finalAmount,
        note: note || undefined,
        productId: selectedProduct?._id as any,
        quantity: selectedProduct ? qtyNum : undefined,
      });
      setPayReqOpen(false);
      toast.success("Demande de paiement envoyée au client.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0 rounded-lg border border-border bg-card overflow-hidden">
      {/* conversation list */}
      <div className={cn("border-r border-border flex-col min-h-0", conversationId ? "hidden md:flex" : "flex")}>
        <div className="border-b border-border px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            $ innovax --chat
          </p>
          <h2 className="mt-0.5 text-sm font-bold">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations === undefined ? (
            <div className="p-4 text-xs text-muted-foreground">Chargement…</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquareText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">
                Aucune conversation. Les échanges démarrent depuis un produit.
              </p>
            </div>
          ) : (
            conversations.map((c) => {
              const unreadCount = unread?.perConversation[c._id] ?? 0;
              return (
                <button
                  key={c._id}
                  onClick={() => navigate(`/dashboard/chat/${c._id}`)}
                  className={cn(
                    "w-full border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                    conversationId === c._id && "bg-primary/[0.06]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-xs", unreadCount > 0 ? "font-bold" : "font-semibold")}>
                      {c.other?.company || c.other?.name || "Partenaire"}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {unreadCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                      {c.lastMessageAt && (
                        <span className="text-[9px] text-muted-foreground">
                          {timeAgo(c.lastMessageAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-[11px]",
                      unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {c.lastMessage || "Nouvelle conversation"}
                  </p>
                  {c.productName && (
                    <p className="mt-1 text-[10px] text-primary">📦 {c.productName}</p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* chat window */}
      <div className="flex flex-col min-h-0">
        {!conversationId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
            <MessageSquareText className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-semibold">Sélectionnez une conversation</p>
            <p className="text-xs text-muted-foreground">
              Choisissez un échange à gauche pour voir la discussion.
            </p>
          </div>
        ) : !conversation ? (
          <div className="flex flex-1 items-center justify-center p-6 text-xs text-muted-foreground">
            Chargement…
          </div>
        ) : (
          <>
            {/* header */}
            <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-primary/30 bg-primary/[0.07] text-primary">
                  <Store className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">
                    {conversation.other?.company || conversation.other?.name || "Partenaire"}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {conversation.other ? ROLE_LABELS[conversation.other.role ?? ""] ?? "" : ""}
                    {conversation.other?.country ? ` · ${conversation.other.country}` : ""}
                    {conversation.productName ? ` · 📦 ${conversation.productName}` : ""}
                  </p>
                </div>
              </div>
              {isSupplier && (
                <Button
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 text-[11px]"
                  onClick={() => setPayReqOpen(true)}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Demander un paiement
                </Button>
              )}
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-background/60 p-4 space-y-3">
              {messages === undefined ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-10">
                  Démarrez la discussion — négociez le prix, envoyez des photos ou commandez.
                </p>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === user?._id;
                  return (
                    <div key={m._id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-md border px-3 py-2 text-xs",
                          mine
                            ? "border-primary/30 bg-primary/[0.07]"
                            : "border-border bg-card",
                        )}
                      >
                        {m.type === "payment" ? (
                          m.paymentRequest ? (
                            <div className="w-60">
                              <p className="flex items-center gap-1.5 font-semibold text-amber-700">
                                <CreditCard className="h-3.5 w-3.5" /> Demande de paiement
                              </p>
                              {m.paymentRequest.productName && (
                                <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                  📦 {m.paymentRequest.productName}
                                  {m.paymentRequest.quantity && m.paymentRequest.quantity > 1
                                    ? ` × ${m.paymentRequest.quantity}`
                                    : ""}
                                </p>
                              )}
                              <p className="mt-1.5 text-xl font-bold text-primary">
                                {formatMoney(m.paymentRequest.amount, m.paymentRequest.currency)}
                              </p>
                              {m.paymentRequest.note && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {m.paymentRequest.note}
                                </p>
                              )}
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {formatDate(m.paymentRequest.createdAt)}
                              </p>
                              {m.paymentRequest.status === "paid" ? (
                                <p className="mt-2 flex items-center gap-1.5 rounded border border-primary/30 bg-primary/[0.06] px-2 py-1.5 text-[11px] text-primary">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Payée
                                </p>
                              ) : mine ? (
                                <p className="mt-2 rounded border border-amber-600/30 bg-amber-600/[0.06] px-2 py-1.5 text-[11px] text-amber-700">
                                  En attente du client…
                                </p>
                              ) : (
                                <Button
                                  className="mt-2 w-full h-8 text-[11px]"
                                  onClick={() => setPayingPr(m.paymentRequest)}
                                >
                                  Payer {formatMoney(m.paymentRequest.amount, m.paymentRequest.currency)}
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="w-60">
                              <p className="flex items-center gap-1.5 font-semibold text-amber-700">
                                <CreditCard className="h-3.5 w-3.5" /> Demande de paiement
                              </p>
                              {m.content && (
                                <p className="mt-1 text-[11px] text-muted-foreground">{m.content}</p>
                              )}
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {formatDate(m.createdAt)}
                              </p>
                              <p className="mt-2 rounded border border-amber-600/30 bg-amber-600/[0.06] px-2 py-1.5 text-[11px] text-amber-700">
                                Détails indisponibles — demandez une nouvelle demande.
                              </p>
                            </div>
                          )
                        ) : m.type === "order" ? (
                          <div className="w-64">
                            <p className="flex items-center gap-1.5 font-semibold">
                              <FileText className="h-3.5 w-3.5 text-primary" /> Commande
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {m.content}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 h-7 w-full text-[10px]"
                              onClick={() => navigate("/dashboard/orders")}
                            >
                              Suivre la commande →
                            </Button>
                          </div>
                        ) : (
                          <>
                            {m.imageUrl && (
                              <a
                                href={m.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mb-1.5 block max-w-[280px] cursor-pointer"
                                title="Ouvrir l'image"
                              >
                                <img
                                  src={m.imageUrl}
                                  alt="Image envoyée"
                                  className="max-h-52 w-auto max-w-full rounded border border-border object-cover"
                                />
                              </a>
                            )}
                            {m.content && (
                              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                            )}
                          </>
                        )}
                        {m.type === "text" && (
                          <p className="mt-1 text-right text-[9px] text-muted-foreground">
                            {timeAgo(m.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* composer */}
            <form onSubmit={handleSend} className="border-t border-border p-3 bg-card">
              {isSupplier && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mb-2 h-8 w-full gap-1.5 border-primary/40 text-[11px] text-primary transition-colors hover:bg-primary/[0.06]"
                  onClick={() => setPayReqOpen(true)}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Demander un paiement
                </Button>
              )}
              {imagePreview && (
                <div className="mb-2 flex items-center gap-2">
                  <span className="relative">
                    <img
                      src={imagePreview}
                      alt="Aperçu"
                      className="h-14 w-14 rounded border border-primary/40 object-cover"
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
                    {imageFile?.name}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
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
                  size="icon"
                  className="shrink-0 cursor-pointer"
                  disabled={sending}
                  onClick={() => fileInputRef.current?.click()}
                  title="Envoyer une image de votre ordinateur"
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Écrire un message…"
                  className="font-mono text-xs"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={sending || (!text.trim() && !imageFile)}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* supplier payment request dialog */}
      {payReqOpen && conversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4">
          <form
            onSubmit={handleRequestPayment}
            className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl"
          >
            <p className="font-mono text-sm font-bold">$ paiement --demande</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Choisissez le produit négocié, puis appliquez la réduction. Client :{" "}
              <span className="font-semibold text-foreground">
                {conversation.other?.name ?? "votre client"}
              </span>.
            </p>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Produit</Label>
                {supplierProducts === undefined ? (
                  <div className="text-[11px] text-muted-foreground">Chargement des produits…</div>
                ) : supplierProducts.length > 0 ? (
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="h-8 font-mono text-xs">
                      <SelectValue placeholder="Choisir un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierProducts.map((p) => (
                        <SelectItem key={p._id} value={p._id} className="font-mono text-xs">
                          {p.name} — {formatMoney(p.price, p.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="rounded border border-amber-600/30 bg-amber-600/[0.06] px-3 py-2 text-[11px] text-amber-700">
                    Aucun produit actif — ajoutez d'abord un produit dans « Mes produits ».
                  </p>
                )}
              </div>

              {selectedProduct && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground">Quantité</Label>
                      <Input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground">
                        Réduction (%)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={MAX_DISCOUNT_PCT}
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="font-mono"
                        placeholder="Ex : 10"
                      />
                    </div>
                  </div>

                  <div className="rounded border border-primary/30 bg-primary/[0.05] px-3 py-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Prix unitaire ({selectedProduct.unit})</span>
                      <span className="font-mono">
                        {formatMoney(selectedProduct.price, selectedProduct.currency)}
                        {discountPct > 0 && unitPriceAfter !== null && (
                          <span className="text-destructive">
                            {" "}
                            → {formatMoney(unitPriceAfter, selectedProduct.currency)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {qtyNum} × {formatMoney(unitPriceAfter ?? selectedProduct.price, selectedProduct.currency)}
                      </span>
                      <span className="font-mono text-base font-bold text-primary">
                        {formatMoney(computedTotal ?? 0, selectedProduct.currency)}
                      </span>
                    </div>
                    {selectedProduct.stock < qtyNum && (
                      <p className="mt-1 text-[10px] text-destructive">
                        ⚠ Stock insuffisant ({selectedProduct.stock} restant).
                      </p>
                    )}
                  </div>
                </>
              )}

              {!selectedProduct && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">
                    Montant ({DEFAULT_CURRENCY})
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1500"
                    className="font-mono"
                    autoFocus
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Note</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex : réduction fidélité, livraison incluse…"
                  rows={2}
                  className="font-mono text-xs"
                />
              </div>

              <p className="rounded border border-primary/30 bg-primary/[0.05] px-3 py-2 text-[10px] text-muted-foreground">
                Le client recevra un bouton « Payer » dans le chat. La commande sera créée au
                paiement avec le produit et la quantité choisis.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPayReqOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" className="flex-1" disabled={finalAmount <= 0}>
                  Envoyer
                  {selectedProduct && computedTotal !== null
                    ? ` ${formatMoney(computedTotal, selectedProduct.currency)}`
                    : ""}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      <PaymentModal
        open={!!payingPr}
        onOpenChange={(open) => !open && setPayingPr(null)}
        amount={payingPr?.amount ?? 0}
        label="Demande de paiement"
        onPay={async () => {
          if (!payingPr) return;
          await payPaymentRequest({ paymentRequestId: payingPr._id });
          toast.success("Paiement accepté — commande créée, suivi de livraison démarré.");
        }}
      />
    </div>
  );
}

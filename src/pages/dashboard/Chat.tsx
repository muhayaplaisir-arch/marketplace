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
import { PaymentModal } from "@/components/PaymentModal";
import { formatDate, formatMoney, ROLE_LABELS, timeAgo } from "@/lib/format";
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  MessageSquareText,
  Send,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ROLES } from "@/convex/constants";

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
  const sendMessage = useMutation(api.chat.sendMessage);
  const requestPayment = useMutation(api.chat.requestPayment);
  const payPaymentRequest = useMutation(api.chat.payPaymentRequest);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [payReqOpen, setPayReqOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [payingPr, setPayingPr] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isSupplier = user?.role === ROLES.SUPPLIER;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, conversationId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationId || !text.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage({ conversationId: conversationId as any, content: text });
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'envoi.");
    } finally {
      setSending(false);
    }
  };

  const handleRequestPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationId || !amount || Number(amount) <= 0) return;
    try {
      await requestPayment({
        conversationId: conversationId as any,
        amount: Number(amount),
        note: note || undefined,
      });
      setPayReqOpen(false);
      setAmount("");
      setNote("");
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
            conversations.map((c) => (
              <button
                key={c._id}
                onClick={() => navigate(`/dashboard/chat/${c._id}`)}
                className={cn(
                  "w-full border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                  conversationId === c._id && "bg-primary/[0.06]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold">
                    {c.other?.company || c.other?.name || "Partenaire"}
                  </p>
                  {c.lastMessageAt && (
                    <span className="shrink-0 text-[9px] text-muted-foreground">
                      {timeAgo(c.lastMessageAt)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {c.lastMessage || "Nouvelle conversation"}
                </p>
                {c.productName && (
                  <p className="mt-1 text-[10px] text-primary">📦 {c.productName}</p>
                )}
              </button>
            ))
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
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded border border-primary/30 bg-primary/[0.07] text-primary">
                  <Store className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold">
                    {conversation.other?.company || conversation.other?.name || "Partenaire"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {conversation.other ? ROLE_LABELS[conversation.other.role ?? ""] ?? "" : ""}
                    {conversation.other?.country ? ` · ${conversation.other.country}` : ""}
                    {conversation.productName ? ` · 📦 ${conversation.productName}` : ""}
                  </p>
                </div>
              </div>
              {isSupplier && (
                <Button size="sm" className="gap-1.5 text-[11px] h-8" onClick={() => setPayReqOpen(true)}>
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
                  Démarrez la discussion — négociez le prix ou commandez directement.
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
                        {m.type === "payment" && m.paymentRequest ? (
                          <div className="w-60">
                            <p className="flex items-center gap-1.5 font-semibold text-amber-700">
                              <CreditCard className="h-3.5 w-3.5" /> Demande de paiement
                            </p>
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
                                Payer {formatMoney(m.paymentRequest.amount)}
                              </Button>
                            )}
                          </div>
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
                          <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
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
            <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2 bg-card">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Écrire un message…"
                className="font-mono text-xs"
              />
              <Button type="submit" size="icon" disabled={sending || !text.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </>
        )}
      </div>

      {/* supplier payment request dialog */}
      {payReqOpen && conversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4">
          <form
            onSubmit={handleRequestPayment}
            className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl"
          >
            <p className="font-mono text-sm font-bold">$ paiement --demande</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Envoyez un bouton de paiement dans le chat à{" "}
              <span className="font-semibold text-foreground">
                {conversation.other?.name ?? "votre client"}
              </span>.
            </p>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Montant (XAF)</Label>
                <Input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="250000"
                  className="font-mono"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Note</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex : 500 unités × 4 500 FCFA"
                  rows={2}
                  className="font-mono text-xs"
                />
              </div>
              <p className="rounded border border-primary/30 bg-primary/[0.05] px-3 py-2 text-[10px] text-muted-foreground">
                Le client recevra un bouton « Payer » dans le chat. La commande sera créée
                automatiquement au paiement.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setPayReqOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="flex-1" disabled={!amount || Number(amount) <= 0}>
                  Envoyer
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

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  label?: string;
  onPay: () => Promise<void>;
}

export function PaymentModal({ open, onOpenChange, amount, label, onPay }: PaymentModalProps) {
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12/28");
  const [cvc, setCvc] = useState("123");

  useEffect(() => {
    if (open) {
      setProcessing(false);
      setDone(false);
      setError(null);
    }
  }, [open]);

  const handlePay = async () => {
    setProcessing(true);
    setError(null);
    // simulate gateway latency
    await new Promise((r) => setTimeout(r, 1400));
    try {
      await onPay();
      setDone(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paiement refusé, réessayez.");
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> $ pay — paiement sécurisé
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {label ?? "Commande"} — montant :{" "}
            <span className="font-bold text-primary">{formatMoney(amount)}</span>
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="text-sm font-semibold">Paiement accepté</p>
            <p className="text-xs text-muted-foreground">Transaction simulée ✓</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground">Numéro de carte</Label>
              <Input
                value={card}
                onChange={(e) => setCard(e.target.value)}
                className="font-mono text-sm tracking-wider"
                disabled={processing}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Expiration</Label>
                <Input
                  value={exp}
                  onChange={(e) => setExp(e.target.value)}
                  className="font-mono text-sm"
                  disabled={processing}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">CVC</Label>
                <Input
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  className="font-mono text-sm"
                  disabled={processing}
                />
              </div>
            </div>
            <p className="rounded border border-primary/30 bg-primary/[0.06] px-3 py-2 text-[10px] text-muted-foreground">
              💡 Paiement simulé pour la démo. En production, il sera traité par Stripe
              (cartes, Mobile Money…) avec une vraie clé API.
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button
              className={cn("w-full", processing && "opacity-70")}
              onClick={handlePay}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement...
                </>
              ) : (
                <>Payer {formatMoney(amount)}</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

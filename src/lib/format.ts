import { DEFAULT_CURRENCY } from "@/convex/adminConfig";

export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(
    new Date(ts),
  );
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "En attente de paiement",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  in_transit: "En transit",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export const SUPPLIER_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Validé",
  rejected: "Refusé",
};

export const ROLE_LABELS: Record<string, string> = {
  client: "Client",
  supplier: "Fournisseur",
  admin: "Administrateur",
};

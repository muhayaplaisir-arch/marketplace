import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS, timeAgo } from "@/lib/format";
import {
  Inbox,
  Loader2,
  MailOpen,
  MessageSquareText,
  Search,
  Store,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "unread";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

export default function AllMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const conversations = useQuery(api.chat.listMyConversations);
  const unread = useQuery(api.chat.getUnreadSummary);

  const [status, setStatus] = useState<StatusFilter>("all");
  const [partner, setPartner] = useState<string>("all");
  const [query, setQuery] = useState("");

  const unreadCount = (id: string) => unread?.perConversation[id] ?? 0;
  const partnerLabel = user?.role === "supplier" ? "Client" : "Fournisseur";

  // Distinct partners for the dropdown (supplier for clients, client for suppliers).
  const partners = useMemo(() => {
    if (!conversations) return [];
    const seen = new Map<string, string>();
    for (const c of conversations) {
      if (!c.other) continue;
      const name = c.other.company || c.other.name || "Partenaire";
      if (!seen.has(c.other._id)) seen.set(c.other._id, name);
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [conversations]);

  const filtered = useMemo(() => {
    if (!conversations) return [];
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (status === "unread" && unreadCount(c._id) === 0) return false;
      if (partner !== "all" && c.other?._id !== partner) return false;
      if (q) {
        const hay =
          `${c.other?.company ?? ""} ${c.other?.name ?? ""} ${c.lastMessage ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, status, partner, query, unread]);

  const totalUnread = unread?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          $ innovax --messages --all
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Tous les messages</h1>
        <p className="text-xs text-muted-foreground">
          {conversations === undefined
            ? "Chargement…"
            : `${conversations.length} conversation${conversations.length > 1 ? "s" : ""} · ${
                totalUnread > 0
                  ? `${totalUnread} non lue${totalUnread > 1 ? "s" : ""}`
                  : "tout est lu ✓"
              }`}
        </p>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border bg-muted/40 p-0.5">
          {(
            [
              { key: "all", label: "Tous" },
              { key: "unread", label: `Non lus${totalUnread > 0 ? ` (${totalUnread})` : ""}` },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                "rounded px-3 py-1 text-[11px] font-medium transition-colors",
                status === f.key
                  ? "border border-border bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Select value={partner} onValueChange={setPartner}>
          <SelectTrigger className="h-8 w-full font-mono text-xs sm:w-52">
            <SelectValue placeholder={`Tous les ${partnerLabel.toLowerCase()}s`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-mono text-xs">
              Tous les {partnerLabel.toLowerCase()}s
            </SelectItem>
            {partners.map((p) => (
              <SelectItem key={p.id} value={p.id} className="font-mono text-xs">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative w-full sm:w-60">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un échange…"
            className="h-8 pl-8 font-mono text-xs"
          />
        </div>
      </div>

      {/* list */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {conversations === undefined || unread === undefined ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">Aucune conversation</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Les échanges démarrent depuis un produit sur le marché.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <MailOpen className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">Aucun résultat</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aucune conversation ne correspond à ces filtres.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-[11px]"
              onClick={() => {
                setStatus("all");
                setPartner("all");
                setQuery("");
              }}
            >
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((c) => {
              const count = unreadCount(c._id);
              const name = c.other?.company || c.other?.name || "Partenaire";
              return (
                <button
                  key={c._id}
                  onClick={() => navigate(`/dashboard/chat/${c._id}`)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                    count > 0 && "bg-primary/[0.03]",
                  )}
                >
                  <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/[0.08] font-mono text-[11px] font-bold text-primary">
                    {initials(name)}
                    {count > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className={cn("truncate text-xs", count > 0 ? "font-bold" : "font-semibold")}>
                          {name}
                        </p>
                        {c.other?.role && (
                          <span className="flex shrink-0 items-center gap-0.5 text-[9px] text-muted-foreground">
                            {c.other.role === "supplier" ? (
                              <Store className="h-2.5 w-2.5" />
                            ) : (
                              <User className="h-2.5 w-2.5" />
                            )}
                            {ROLE_LABELS[c.other.role] ?? c.other.role}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {count > 0 && (
                          <Badge className="h-4 min-w-4 rounded-full px-1 text-[9px] font-bold leading-none bg-destructive text-white">
                            {count > 99 ? "99+" : count}
                          </Badge>
                        )}
                        {c.lastMessageAt && (
                          <span className="text-[9px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>
                        )}
                      </div>
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-[11px]",
                        count > 0 ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {c.lastMessage || "Nouvelle conversation"}
                    </p>
                    {c.productName && (
                      <p className="mt-0.5 text-[10px] text-primary">📦 {c.productName}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

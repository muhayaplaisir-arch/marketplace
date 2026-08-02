import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Users } from "lucide-react";
import { ROLE_LABELS, SUPPLIER_STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

const ROLE_COLOR: Record<string, string> = {
  client: "border-blue-600/30 text-blue-700",
  supplier: "border-primary/30 text-primary",
  admin: "border-amber-600/30 text-amber-700",
};

export default function AdminUsers() {
  const users = useQuery(api.admin.listAllUsers);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          $ innovax --admin --users
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Utilisateurs</h1>
        <p className="text-xs text-muted-foreground">
          Tous les comptes de la plateforme.
        </p>
      </div>

      {users === undefined ? (
        <div className="py-20 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Aucun utilisateur</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Utilisateur</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Statut fournisseur</th>
                <th className="px-4 py-3 font-medium">Entreprise / Pays</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 rounded border border-border">
                        <AvatarFallback className="bg-primary/[0.08] text-primary text-[10px]">
                          {(u.name ?? u.email ?? "?")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{u.name ?? "—"}</p>
                        {u.email && (
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("text-[10px]", ROLE_COLOR[u.role ?? ""] ?? "")}>
                      {ROLE_LABELS[u.role ?? ""] ?? u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === "supplier" ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          u.supplierStatus === "approved" && "border-primary/30 text-primary",
                          u.supplierStatus === "pending" && "border-amber-600/30 text-amber-700",
                          u.supplierStatus === "rejected" && "border-destructive/30 text-destructive",
                        )}
                      >
                        {SUPPLIER_STATUS_LABELS[u.supplierStatus ?? "pending"]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[u.company, u.country].filter(Boolean).join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

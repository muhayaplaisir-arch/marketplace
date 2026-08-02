import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CreditCard,
  MessageSquareText,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Terminal,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";

const TYPED_LINES = [
  { cmd: "innova$ register --role fournisseur", out: "✔ compte créé — en attente de validation admin" },
  { cmd: "innova$ approuver --fournisseur AcmeSARL", out: "✔ fournisseur validé — produits publiés" },
  { cmd: "innova$ chat --fournisseur AcmeSARL", out: "✔ négociation prix + demande de paiement dans le chat" },
  { cmd: "innova$ suivre --commande INX-482913", out: "✔ colis en transit — Douala → Yaoundé" },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Fournisseurs vérifiés",
    desc: "Chaque fournisseur est validé par un administrateur avant de pouvoir publier ses produits. Zéro compte douteux.",
  },
  {
    icon: MessageSquareText,
    title: "Chat & négociation",
    desc: "Discutez directement avec le fournisseur pour négocier les prix, comme sur Alibaba.",
  },
  {
    icon: CreditCard,
    title: "Paiement dans le chat",
    desc: "Le fournisseur envoie un bouton de paiement sécurisé dans la conversation. Un clic suffit.",
  },
  {
    icon: Truck,
    title: "Suivi de livraison",
    desc: "Suivez votre commande en temps réel : confirmée, expédiée, en transit, livrée.",
  },
  {
    icon: ShoppingCart,
    title: "Commande directe",
    desc: "Achetez en un clic avec quantité, prix unitaire et conditions claires.",
  },
  {
    icon: Terminal,
    title: "Interface terminal",
    desc: "Une UI monospace, rapide et précise. Chaque action est une commande claire.",
  },
];

const ROLES = [
  {
    role: "Client",
    tag: "acheteur",
    icon: ShoppingCart,
    color: "text-emerald-700",
    border: "border-emerald-700/30",
    bg: "bg-emerald-700/[0.06]",
    points: [
      "Parcourir le catalogue B2B",
      "Commander en 1 clic",
      "Négocier via le chat",
      "Suivre la livraison",
    ],
  },
  {
    role: "Fournisseur",
    tag: "vendeur",
    icon: PackageCheck,
    color: "text-amber-700",
    border: "border-amber-700/30",
    bg: "bg-amber-700/[0.06]",
    points: [
      "Publier vos produits",
      "Recevoir des commandes",
      "Envoyer des demandes de paiement",
      "Mettre à jour le suivi",
    ],
  },
  {
    role: "Admin",
    tag: "modérateur",
    icon: Bot,
    color: "text-foreground",
    border: "border-border",
    bg: "bg-muted/40",
    points: [
      "Valider les fournisseurs",
      "Superviser les commandes",
      "Voir les statistiques",
      "Accès protégé par code",
    ],
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const primaryCta = () => {
    navigate(isAuthenticated ? "/dashboard" : "/auth");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col bg-background"
    >
      {/* Top bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 font-bold text-sm tracking-tight"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded border border-primary/40 bg-primary/10 text-primary">
              <Terminal className="h-4 w-4" />
            </span>
            innovax<span className="text-primary">$</span>
          </button>
          <nav className="hidden md:flex items-center gap-6 text-xs text-muted-foreground">
            <a href="#fonctions" className="hover:text-foreground transition-colors">
              ~/fonctions
            </a>
            <a href="#roles" className="hover:text-foreground transition-colors">
              ~/roles
            </a>
            <a href="#demo" className="hover:text-foreground transition-colors">
              ~/demo
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
            >
              {isAuthenticated ? "Mon espace" : "Connexion"}
            </Button>
            <Button size="sm" className="text-xs gap-1" onClick={primaryCta}>
              S'inscrire <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1 text-[11px] text-primary"
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            Marketplace B2B nouvelle génération
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight text-balance"
          >
            Le commerce B2B,
            <br />
            <span className="text-primary">comme une ligne de commande.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mx-auto mt-5 max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed"
          >
            Innovax connecte acheteurs et fournisseurs : produits vérifiés, négociation
            dans le chat, paiement intégré et suivi de livraison de bout en bout — inspiré
            d'Alibaba, pensé pour l'Afrique francophone.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Button size="lg" className="gap-2 text-sm" onClick={primaryCta}>
              Commencer maintenant <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-sm"
              onClick={() => navigate("/auth")}
            >
              Devenir fournisseur
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex items-center justify-center gap-6 text-[11px] text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> Fournisseurs vérifiés
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-600" /> Paiement dans le chat
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground/60" /> Suivi en temps réel
            </span>
          </motion.div>
        </div>

        {/* Terminal demo window */}
        <div className="mx-auto max-w-3xl px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.36 }}
            className="term-border rounded-lg bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-muted/50">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <span className="text-[10px] text-muted-foreground">
                innovax — terminal de démonstration
              </span>
              <span className="text-[10px] text-muted-foreground">⌘K</span>
            </div>
            <div className="p-5 text-left text-[12px] leading-6 font-mono">
              <p className="text-muted-foreground">
                Bienvenue sur <span className="text-primary font-semibold">innovax</span> v1.0
              </p>
              {TYPED_LINES.map((line, i) => (
                <div key={i} className="mt-2">
                  <p className="text-foreground">
                    <span className="text-primary">❯</span> {line.cmd}
                  </p>
                  <p className="text-muted-foreground pl-4">{line.out}</p>
                </div>
              ))}
              <p className="mt-3 text-foreground">
                <span className="text-primary">❯</span>{" "}
                <span className="term-cursor" />
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            ["100%", "fournisseurs validés manuellement"],
            ["1 clic", "pour payer depuis le chat"],
            ["24/7", "suivi de livraison"],
            ["3", "rôles : client, fournisseur, admin"],
          ].map(([big, small]) => (
            <div key={big}>
              <p className="text-2xl font-bold text-primary">{big}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-primary">
            process
          </Badge>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">Comment ça marche</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              title: "Créez votre compte",
              desc: "Choisissez votre rôle : client, fournisseur ou administrateur (accès admin protégé par code).",
            },
            {
              n: "02",
              title: "Validation admin",
              desc: "Les fournisseurs sont examinés et validés par un administrateur avant de publier leurs produits.",
            },
            {
              n: "03",
              title: "Achetez, vendez, suivez",
              desc: "Négociez dans le chat, payez via le bouton de paiement intégré, et suivez chaque commande jusqu'à la livraison.",
            },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="term-border rounded-lg bg-card p-5"
            >
              <p className="text-[10px] text-muted-foreground">$ step_{s.n}</p>
              <h3 className="mt-2 font-bold">{s.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="fonctions" className="border-y border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-primary">
              features
            </Badge>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Tout Alibaba, sans la complexité
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
                className="rounded-lg border border-border bg-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded border border-primary/30 bg-primary/[0.07] text-primary">
                  <f.icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="mt-3 font-bold text-sm">{f.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-primary">
            roles
          </Badge>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">Un espace pour chacun</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Trois rôles, une seule plateforme, zéro friction.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {ROLES.map((r, i) => (
            <motion.div
              key={r.role}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`term-border rounded-lg bg-card p-5 ${r.border}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded border ${r.border} ${r.bg} ${r.color}`}
                >
                  <r.icon className="h-5 w-5" />
                </span>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {r.tag}
                </Badge>
              </div>
              <h3 className="mt-4 font-bold">{r.role}</h3>
              <ul className="mt-3 space-y-1.5">
                {r.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 text-primary">✓</span> {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button size="lg" className="gap-2" onClick={primaryCta}>
            Rejoindre Innovax <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Chat + payment demo */}
      <section id="demo" className="border-y border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-16 grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-primary">
              chat + paiement
            </Badge>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Le paiement arrive dans la conversation
            </h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Le fournisseur envoie une demande de paiement directement dans le chat — montant,
              note, et un bouton « Payer ». Le client règle en un clic, la commande est créée et
              le suivi de livraison démarre automatiquement.
            </p>
            <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <MessageSquareText className="h-3.5 w-3.5 text-primary" /> Négociation illimitée
                avant paiement
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-primary" /> Paiement simulé intégré (Stripe
                en production)
              </li>
              <li className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-primary" /> Timeline de livraison : expédiée,
                en transit, livrée
              </li>
            </ul>
          </div>
          <div className="term-border rounded-lg bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 bg-muted/50 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" /> Chat — Fournisseur Acme SARL
            </div>
            <div className="space-y-3 p-4">
              <div className="max-w-[85%] rounded border border-border bg-muted/40 px-3 py-2 text-xs">
                <p className="text-muted-foreground">Client :</p>
                <p>Bonjour, le prix de 500 unités est-il négociable ?</p>
              </div>
              <div className="max-w-[85%] ml-auto rounded border border-primary/30 bg-primary/[0.06] px-3 py-2 text-xs">
                <p className="text-primary">Fournisseur :</p>
                <p>Oui, je peux faire 4 500 FCFA/unité au lieu de 5 000.</p>
              </div>
              <div className="max-w-[85%] ml-auto rounded border border-primary/30 bg-primary/[0.06] px-3 py-2 text-xs">
                <p className="text-primary">Fournisseur :</p>
                <div className="mt-2 rounded border border-primary/40 bg-card p-3">
                  <p className="font-semibold">Demande de paiement</p>
                  <p className="mt-1 text-lg font-bold text-primary">2 250 000 FCFA</p>
                  <p className="text-[10px] text-muted-foreground">500 × 4 500 FCFA</p>
                  <button className="mt-2 w-full rounded bg-primary py-1.5 text-[11px] font-semibold text-primary-foreground">
                    Payer maintenant →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
          Prêt à passer votre première
          <br />
          <span className="text-primary">commande B2B ?</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
          Inscrivez-vous en 30 secondes. Les fournisseurs sont validés par un admin, le paiement
          se fait dans le chat, et chaque colis est suivi jusqu'à la livraison.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="gap-2" onClick={primaryCta}>
            Créer mon compte <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
            Se connecter
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/80">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-xs font-bold">
            <span className="flex h-6 w-6 items-center justify-center rounded border border-primary/40 bg-primary/10 text-primary">
              <Terminal className="h-3.5 w-3.5" />
            </span>
            innovax<span className="text-primary">$</span>
            <span className="font-normal text-muted-foreground">© 2026</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            $ echo "commerce B2B, sans friction" — powered by freebuff.com
          </p>
        </div>
      </footer>
    </motion.div>
  );
}

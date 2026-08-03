import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import logo from "@/assets/logo.svg";
import { ArrowRight, Loader2, Lock, Mail, PackageCheck, ShoppingCart } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

interface AuthProps {
  redirectAfterAuth?: string;
}

type Step = "signIn" | { email: string } | "profile";
type RoleChoice = "client" | "supplier" | "admin";

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, user, signIn } = useAuth();
  const completeProfile = useMutation(api.users.completeProfile);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<Step>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // role selection
  const [role, setRole] = useState<RoleChoice>("client");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [adminCode, setAdminCode] = useState("");

  // If already authenticated: with role -> go; without role -> complete profile
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && user) {
      if (user.role) {
        navigate(redirect, { replace: true });
      } else {
        setStep("profile");
      }
    }
  }, [authLoading, isAuthenticated, user, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Échec de l'envoi du code. Réessayez.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      // user is now authenticated; the effect above will navigate or show profile
      setIsLoading(false);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("Le code de vérification est incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await completeProfile({
        role,
        name,
        company: role === "supplier" ? company : undefined,
        phone: phone || undefined,
        country: country || undefined,
        businessType: role === "supplier" ? businessType || undefined : undefined,
        adminCode: role === "admin" ? adminCode : undefined,
      });
      toast.success(
        role === "supplier"
          ? "Compte fournisseur créé — en attente de validation admin."
          : "Profil complété avec succès !",
      );
      navigate(redirect, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue.";
      setError(message);
      setIsLoading(false);
    }
  };

  const roleCards: { id: RoleChoice; label: string; desc: string; icon: any }[] = [
    {
      id: "client",
      label: "Client",
      desc: "J'achète des produits en gros ou au détail.",
      icon: ShoppingCart,
    },
    {
      id: "supplier",
      label: "Fournisseur",
      desc: "Je vends mes produits sur la plateforme.",
      icon: PackageCheck,
    },
    {
      id: "admin",
      label: "Admin",
      desc: "Je valide les fournisseurs et supervise.",
      icon: Lock,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col term-grid">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border bg-card/95 backdrop-blur shadow-lg">
          {step === "signIn" && (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center">
                  <img
                    src={logo}
                    alt="Innovax"
                    width={56}
                    height={56}
                    className="rounded-lg mb-3 mt-2 cursor-pointer"
                    onClick={() => navigate("/")}
                  />
                </div>
                <CardTitle className="text-xl font-bold">
                  innovax<span className="text-primary">$</span> — connexion
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  $ innovax --login
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleEmailSubmit}>
                <CardContent>
                  <Label htmlFor="email" className="text-xs">Adresse e-mail</Label>
                  <div className="relative mt-1.5 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        placeholder="nom@entreprise.com"
                        type="email"
                        className="pl-9"
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      size="icon"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                  <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                    Un code à 6 chiffres sera envoyé à cette adresse. Pas de mot de passe à
                    retenir — première connexion = création de compte, choisissez ensuite votre
                    rôle.
                  </p>
                </CardContent>
              </form>
            </>
          )}

          {step !== "signIn" && step !== "profile" && (
            <>
              <CardHeader className="text-center mt-4">
                <CardTitle>Vérifiez votre e-mail</CardTitle>
                <CardDescription className="font-mono text-xs">
                  code envoyé à {step.email}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleOtpSubmit}>
                <CardContent className="pb-4">
                  <input type="hidden" name="email" value={step.email} />
                  <input type="hidden" name="code" value={otp} />
                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                          (e.target as HTMLElement).closest("form")?.requestSubmit();
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && (
                    <p className="mt-2 text-sm text-destructive text-center">{error}</p>
                  )}
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Vous n'avez pas reçu le code ?{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => setStep("signIn")}
                    >
                      Réessayer
                    </Button>
                  </p>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vérification...
                      </>
                    ) : (
                      <>
                        Vérifier le code <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </>
          )}

          {step === "profile" && (
            <>
              <CardHeader className="text-center mt-4">
                <CardTitle>Complétez votre profil</CardTitle>
                <CardDescription className="font-mono text-xs">
                  $ innovax register --role [client|supplier|admin]
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleProfileSubmit}>
                <CardContent className="space-y-4">
                  {/* role picker */}
                  <div className="grid grid-cols-3 gap-2">
                    {roleCards.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={`rounded-md border p-3 text-center transition-all ${
                          role === r.id
                            ? "border-primary bg-primary/[0.07] shadow-sm"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <r.icon
                          className={`mx-auto h-5 w-5 ${
                            role === r.id ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <p className="mt-1.5 text-xs font-semibold">{r.label}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {roleCards.find((r) => r.id === role)?.desc}
                  </p>

                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs">Nom complet</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Votre nom"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  {role === "supplier" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="company" className="text-xs">
                          Nom de l'entreprise *
                        </Label>
                        <Input
                          id="company"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Ex : Acme SARL"
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Type d'activité</Label>
                        <Select value={businessType} onValueChange={setBusinessType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fabricant">Fabricant</SelectItem>
                            <SelectItem value="grossiste">Grossiste / distributeur</SelectItem>
                            <SelectItem value="importateur">Importateur</SelectItem>
                            <SelectItem value="artisan">Artisan / producteur</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs">Téléphone</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+237 …"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="country" className="text-xs">Pays</Label>
                      <Input
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="Cameroun"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {role === "admin" && (
                    <div className="space-y-1.5 rounded-md border border-amber-600/30 bg-amber-600/[0.06] p-3">
                      <Label htmlFor="adminCode" className="text-xs text-amber-700">
                        Code d'inscription administrateur *
                      </Label>
                      <Input
                        id="adminCode"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        type="password"
                        placeholder="••••••••••••"
                        required
                        disabled={isLoading}
                      />
                      <p className="text-[10px] text-amber-700/80">
                        Sans le code secret, l'inscription côté admin est impossible.
                      </p>
                    </div>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...
                      </>
                    ) : (
                      <>
                        Valider mon profil <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate("/")}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Retour à l'accueil
                  </Button>
                </CardFooter>
              </form>
            </>
          )}

          <div className="py-3 px-6 text-[10px] text-center text-muted-foreground bg-muted border-t rounded-b-lg font-mono">
            $ secured_by freebuff.com
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}

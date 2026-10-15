"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Mail, Phone, Building2, Lock, User, MapPin, ShieldCheck, Eye, EyeOff, Loader2, ShoppingBag, Store, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { homeViewForRole, useApp } from "@/lib/store";
import { BRAND } from "@/lib/brand";

type AccountType = "BUYER" | "SUPPLIER";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Password policy: 8+ chars, at least one letter and one digit. */
function passwordIssues(pwd: string) {
  const issues: string[] = [];
  if (pwd.length < 8) issues.push("8 caractères minimum");
  if (!/[A-Za-z]/.test(pwd)) issues.push("au moins une lettre");
  if (!/\d/.test(pwd)) issues.push("au moins un chiffre");
  return issues;
}

/** Translate Supabase auth errors into clear French messages (no account enumeration). */
function authErrorMessage(message: string | undefined) {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Confirmez d'abord votre email (vérifiez votre boîte de réception).";
  if (m.includes("already registered") || m.includes("already been registered")) return "Un compte existe déjà avec cet email. Connectez-vous.";
  if (m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives. Patientez quelques minutes puis réessayez.";
  if (m.includes("weak") || m.includes("password should")) return "Mot de passe trop faible.";
  if (m.includes("same password") || m.includes("different from the old")) return "Le nouveau mot de passe doit être différent de l'ancien.";
  return "Une erreur est survenue. Veuillez réessayer.";
}

export function AuthView() {
  const { authMode: mode, setAuthMode, setView, refreshSession, user } = useApp();
  const supabase = getSupabaseBrowser();

  const [accountType, setAccountType] = useState<AccountType>("BUYER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Côte d'Ivoire");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<{ email: string; kind: "confirm" | "reset" } | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Make sure the user sees validation/auth errors, even on long forms
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  // Is Google sign-in enabled on the Supabase project? (public settings endpoint)
  useEffect(() => {
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } })
      .then((r) => r.json())
      .then((s) => setGoogleEnabled(Boolean(s?.external?.google)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  // Already signed in: go to the right space (except when setting a new password)
  useEffect(() => {
    if (user && mode !== "reset") setView(homeViewForRole(user.role));
  }, [user, mode, setView]);


  const setMode = (m: typeof mode) => { setError(null); setAuthMode(m); };
  const pwdIssues = useMemo(() => passwordIssues(password), [password]);
  const callbackUrl = (params: string) => `${window.location.origin}/auth/callback?${params}`;

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email)) return setError("Adresse email invalide.");
    if (!password) return setError("Entrez votre mot de passe.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      return setError(authErrorMessage(error.message));
    }
    const u = await refreshSession();
    setBusy(false);
    if (!u) return setError("Ce compte est suspendu ou indisponible. Contactez le support.");
    toast.success(`Bienvenue ${u.name ?? ""} !`);
    setView(homeViewForRole(u.role));
  }

  async function onSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Entrez votre nom complet.");
    if (!EMAIL_RE.test(email)) return setError("Adresse email invalide.");
    if (pwdIssues.length) return setError(`Mot de passe : ${pwdIssues.join(", ")}.`);
    if (password !== confirm) return setError("Les mots de passe ne correspondent pas.");
    if (accountType === "SUPPLIER" && company.trim().length < 2) return setError("Entrez le nom de votre entreprise.");
    if (accountType === "SUPPLIER" && phone.trim().length < 8) return setError("Entrez un numéro de téléphone valide.");
    if (!acceptTerms) return setError("Vous devez accepter les conditions d'utilisation.");

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: callbackUrl(`intent=${accountType}`),
        data: {
          name: name.trim(),
          intent: accountType,
          ...(accountType === "SUPPLIER"
            ? { company: company.trim(), phone: phone.trim(), city: city.trim(), country: country.trim() }
            : { phone: phone.trim() || undefined }),
        },
      },
    });
    if (error) {
      setBusy(false);
      return setError(authErrorMessage(error.message));
    }
    if (data.session) {
      // Email confirmation disabled on the project: signed in immediately
      const u = await refreshSession();
      setBusy(false);
      if (u) {
        toast.success("Compte créé avec succès !");
        setView(homeViewForRole(u.role));
      }
      return;
    }
    setBusy(false);
    setSentTo({ email: email.trim(), kind: "confirm" });
  }

  async function onForgot(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email)) return setError("Adresse email invalide.");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callbackUrl("next=reset") });
    setBusy(false);
    if (error && /rate|too many/i.test(error.message)) return setError(authErrorMessage(error.message));
    // Same message whether the account exists or not (prevents account enumeration)
    setSentTo({ email: email.trim(), kind: "reset" });
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pwdIssues.length) return setError(`Mot de passe : ${pwdIssues.join(", ")}.`);
    if (password !== confirm) return setError("Les mots de passe ne correspondent pas.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(authErrorMessage(error.message));
    toast.success("Mot de passe mis à jour.");
    const u = await refreshSession();
    setMode("login");
    setPassword(""); setConfirm("");
    if (u) setView(homeViewForRole(u.role));
  }

  async function onGoogle() {
    if (!googleEnabled) {
      toast.info("La connexion avec Google sera bientôt disponible.");
      return;
    }
    setBusy(true);
    const intent = mode === "signup" ? accountType : "BUYER";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(`intent=${intent}`), queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setBusy(false);
      setError(authErrorMessage(error.message));
    }
  }

  async function resendConfirmation() {
    if (!sentTo) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sentTo.email,
      options: { emailRedirectTo: callbackUrl(`intent=${accountType}`) },
    });
    setBusy(false);
    if (error) toast.error(authErrorMessage(error.message));
    else toast.success("Email renvoyé.");
  }

  const title =
    mode === "signup" ? "Créer un compte" : mode === "forgot" ? "Mot de passe oublié" : mode === "reset" ? "Nouveau mot de passe" : "Se connecter";

  return (
    <div className="bg-[#ECECEC] min-h-screen">
      <div className="max-w-[1100px] mx-auto px-3 py-6 lg:py-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#DADAD9] max-w-md w-full mx-auto lg:mx-0">
          <div className="benjamin-bar">{title}</div>

          {sentTo ? (
            <div className="p-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-[#16A34A]" />
              <h2 className="text-[17px] font-bold mt-3">Vérifiez votre boîte email</h2>
              <p className="text-[13px] text-[#555] mt-2 leading-relaxed">
                {sentTo.kind === "confirm"
                  ? <>Nous avons envoyé un lien de confirmation à <b>{sentTo.email}</b>. Cliquez dessus pour activer votre compte.</>
                  : <>Si un compte existe pour <b>{sentTo.email}</b>, vous recevrez un lien pour choisir un nouveau mot de passe.</>}
              </p>
              <p className="text-[11px] text-[#888] mt-2">Pensez à vérifier le dossier « Spam ».</p>
              {sentTo.kind === "confirm" && (
                <button onClick={resendConfirmation} disabled={busy} className="btn-outline-grey w-full mt-5 disabled:opacity-60">
                  Renvoyer l&apos;email
                </button>
              )}
              <button onClick={() => { setSentTo(null); setMode("login"); }} className="benjamin-link text-[12px] mt-4 inline-block">
                ← Retour à la connexion
              </button>
            </div>
          ) : (
            <>
              {(mode === "login" || mode === "signup") && (
                <div className="grid grid-cols-2 border-b border-[#DADAD9]" role="tablist">
                  {(["login", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      role="tab"
                      aria-selected={mode === m}
                      onClick={() => setMode(m)}
                      className={`py-3 text-[13px] font-bold uppercase tracking-wide transition-colors ${
                        mode === m ? "bg-[#1A1F8A] text-white" : "bg-white text-[#666] hover:bg-[#ECECEC]"
                      }`}
                    >
                      {m === "login" ? "Connexion" : "Inscription"}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-5">
                {error && (
                  <div ref={errorRef} role="alert" aria-live="assertive" className="mb-4 border border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C] text-[12px] px-3 py-2">
                    {error}
                  </div>
                )}

                {mode === "login" && (
                  <form onSubmit={onLogin} className="space-y-3.5" noValidate>
                    <Field label="Email" icon={<Mail className="w-4 h-4" />}>
                      <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" className="auth-input" />
                    </Field>
                    <Field label="Mot de passe" icon={<Lock className="w-4 h-4" />} trailing={<PwdToggle show={showPwd} onToggle={() => setShowPwd((s) => !s)} />}>
                      <input type={showPwd ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="auth-input" />
                    </Field>
                    <div className="text-right -mt-1">
                      <button type="button" onClick={() => setMode("forgot")} className="benjamin-link text-[12px]">Mot de passe oublié ?</button>
                    </div>
                    <SubmitButton busy={busy}>Se connecter</SubmitButton>
                  </form>
                )}

                {mode === "signup" && (
                  <form onSubmit={onSignup} className="space-y-3.5" noValidate>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1.5">Je suis</div>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { k: "BUYER", label: "Client", sub: "J'achète", icon: ShoppingBag },
                          { k: "SUPPLIER", label: "Marchand", sub: "Je vends", icon: Store },
                        ] as const).map((o) => (
                          <button
                            type="button"
                            key={o.k}
                            onClick={() => setAccountType(o.k)}
                            aria-pressed={accountType === o.k}
                            className={`border-2 p-3 text-left transition-colors ${accountType === o.k ? "border-[#1A1F8A] bg-[#E8EAFB]" : "border-[#DADAD9] hover:border-[#999]"}`}
                          >
                            <o.icon className={`w-5 h-5 ${accountType === o.k ? "text-[#1A1F8A]" : "text-[#888]"}`} />
                            <div className="text-[13px] font-bold mt-1">{o.label}</div>
                            <div className="text-[11px] text-[#666]">{o.sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Field label="Nom complet" icon={<User className="w-4 h-4" />}>
                      <input autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Aya Kouassi" className="auth-input" />
                    </Field>
                    <Field label="Email" icon={<Mail className="w-4 h-4" />}>
                      <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" className="auth-input" />
                    </Field>

                    {accountType === "SUPPLIER" && (
                      <>
                        <Field label="Nom de l'entreprise" icon={<Building2 className="w-4 h-4" />}>
                          <input autoComplete="organization" required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ex : Ivoire Textiles SARL" className="auth-input" />
                        </Field>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Ville" icon={<MapPin className="w-4 h-4" />}>
                            <input autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Abidjan" className="auth-input" />
                          </Field>
                          <Field label="Pays" icon={<MapPin className="w-4 h-4" />}>
                            <input autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} className="auth-input" />
                          </Field>
                        </div>
                      </>
                    )}
                    <Field label={accountType === "SUPPLIER" ? "Téléphone / WhatsApp" : "Téléphone (optionnel)"} icon={<Phone className="w-4 h-4" />}>
                      <input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 07 00 00 00 00" className="auth-input" />
                    </Field>

                    <Field label="Mot de passe" icon={<Lock className="w-4 h-4" />} trailing={<PwdToggle show={showPwd} onToggle={() => setShowPwd((s) => !s)} />}>
                      <input type={showPwd ? "text" : "password"} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères min., lettres et chiffres" className="auth-input" />
                    </Field>
                    {password && <PasswordHints issues={pwdIssues} />}
                    <Field label="Confirmer le mot de passe" icon={<Lock className="w-4 h-4" />}>
                      <input type={showPwd ? "text" : "password"} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="auth-input" />
                    </Field>

                    {accountType === "SUPPLIER" && (
                      <p className="text-[11px] text-[#555] bg-[#FFF7ED] border border-[#FED7AA] px-3 py-2">
                        Votre boutique sera vérifiée par notre équipe avant de pouvoir publier des produits.
                      </p>
                    )}

                    <label className="flex items-start gap-2 text-[12px] text-[#555] cursor-pointer">
                      <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 accent-[#1A1F8A]" />
                      <span>
                        J&apos;accepte les{" "}
                        <a href="/conditions" target="_blank" rel="noopener" className="benjamin-link">conditions d&apos;utilisation</a>{" "}
                        et la{" "}
                        <a href="/confidentialite" target="_blank" rel="noopener" className="benjamin-link">politique de confidentialité</a>{" "}
                        de {BRAND.name}.
                      </span>
                    </label>
                    <SubmitButton busy={busy}>Créer mon compte</SubmitButton>
                  </form>
                )}

                {mode === "forgot" && (
                  <form onSubmit={onForgot} className="space-y-3.5" noValidate>
                    <p className="text-[13px] text-[#555]">Entrez l&apos;email de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
                    <Field label="Email" icon={<Mail className="w-4 h-4" />}>
                      <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" className="auth-input" />
                    </Field>
                    <SubmitButton busy={busy}>Envoyer le lien</SubmitButton>
                    <button type="button" onClick={() => setMode("login")} className="benjamin-link text-[12px]">← Retour à la connexion</button>
                  </form>
                )}

                {mode === "reset" && (
                  <form onSubmit={onReset} className="space-y-3.5" noValidate>
                    <p className="text-[13px] text-[#555]">Choisissez un nouveau mot de passe pour votre compte.</p>
                    <Field label="Nouveau mot de passe" icon={<Lock className="w-4 h-4" />} trailing={<PwdToggle show={showPwd} onToggle={() => setShowPwd((s) => !s)} />}>
                      <input type={showPwd ? "text" : "password"} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" />
                    </Field>
                    {password && <PasswordHints issues={pwdIssues} />}
                    <Field label="Confirmer" icon={<Lock className="w-4 h-4" />}>
                      <input type={showPwd ? "text" : "password"} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="auth-input" />
                    </Field>
                    <SubmitButton busy={busy}>Enregistrer le mot de passe</SubmitButton>
                  </form>
                )}

                {(mode === "login" || mode === "signup") && (
                  <>
                    <div className="flex items-center gap-3 my-5">
                      <div className="h-px flex-1 bg-[#DADAD9]" />
                      <span className="text-[11px] text-[#999] uppercase font-bold tracking-wider">ou</span>
                      <div className="h-px flex-1 bg-[#DADAD9]" />
                    </div>
                    <button
                      type="button"
                      onClick={onGoogle}
                      disabled={busy}
                      className="btn-outline-grey w-full flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <GoogleIcon /> Continuer avec Google
                    </button>
                    {mode === "signup" && (
                      <p className="text-[11px] text-[#888] mt-2 text-center">
                        Avec Google, votre compte sera créé en tant que <b>{accountType === "SUPPLIER" ? "marchand" : "client"}</b>.
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Trust panel (desktop) */}
        <div className="hidden lg:block">
          <div className="bg-brand-gradient text-white h-full p-8">
            <ShieldCheck className="w-10 h-10 text-[#4ade80]" />
            <h2 className="text-[24px] font-extrabold leading-tight mt-4">Un compte sécurisé pour acheter et vendre en gros</h2>
            <ul className="mt-6 space-y-3 text-[14px]">
              {[
                "Mot de passe chiffré, jamais stocké en clair",
                "Connexion rapide avec votre compte Google",
                "Marchands vérifiés par notre équipe",
                "Paiement protégé par Trade Assurance",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ade80] mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[13px] italic text-[#CFD6F5]">{BRAND.slogan} !</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, trailing, children }: { label: string; icon: ReactNode; trailing?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">{label}</span>
      <span className="flex items-center border border-[#DADAD9] focus-within:border-[#1A1F8A] focus-within:ring-1 focus-within:ring-[#1A1F8A]">
        <span className="text-[#999] ml-3 shrink-0">{icon}</span>
        {children}
        {trailing}
      </span>
    </label>
  );
}

function PwdToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="px-3 text-[#888] hover:text-[#1A1F8A]" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}

function PasswordHints({ issues }: { issues: string[] }) {
  const rules = ["8 caractères minimum", "au moins une lettre", "au moins un chiffre"];
  return (
    <ul className="-mt-2 grid grid-cols-3 gap-1 text-[10px]">
      {rules.map((r) => (
        <li key={r} className={issues.includes(r) ? "text-[#999]" : "text-[#16A34A] font-semibold"}>
          {issues.includes(r) ? "○" : "✓"} {r}
        </li>
      ))}
    </ul>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={busy} className="btn-benjamin-orange w-full flex items-center justify-center gap-2 disabled:opacity-60">
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Crown, Lock, Shield, UserPlus, Trash2, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Pill, ReasonDialog, SkeletonRows, adminFetch, fmtDate, jsonInit } from "./shared";

type Admin = {
  id: string; name: string | null; email: string; adminLevel: string | null; isSuperAdmin: boolean; protected: boolean;
  status: string; lastLoginAt: string | null; createdAt: string;
};
type Invite = { id: string; email: string; level: string; createdAt: string; invitedBy: { name: string | null; email: string } | null };

/** Super admins: manage the admin team (invite by email, levels, removal). */
export function TeamTab() {
  const me = useApp((s) => s.user);
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<"standard" | "super">("standard");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; text: string; run: () => Promise<void> } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await adminFetch<{ admins: Admin[]; invites: Invite[] }>("/api/admin/admins");
      setAdmins(d.admins);
      setInvites(d.invites);
    } catch (e) {
      toast.error((e as Error).message);
      setAdmins((x) => x ?? []);
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await adminFetch<{ result: "promoted" | "invited" }>("/api/admin/admins", jsonInit("POST", { email, level }));
      toast.success(
        d.result === "promoted" ? `${email} est maintenant ${level === "super" ? "super admin" : "admin"}` : `Invitation enregistrée pour ${email}`,
        { description: d.result === "invited" ? "Les droits seront appliqués à sa première connexion (email vérifié ou Google)." : undefined },
      );
      setEmail("");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const patchUser = async (id: string, patch: Record<string, string>, ok: string) => {
    await adminFetch(`/api/admin/users/${id}`, jsonInit("PATCH", patch));
    toast.success(ok);
    await load();
  };

  if (!me?.isSuperAdmin) {
    return (
      <div className="p-8 text-center text-[13px] text-[#666]">
        <Lock className="w-8 h-8 mx-auto text-[#DADAD9] mb-2" />
        La gestion des administrateurs est réservée aux super administrateurs.
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Équipe d&apos;administration</h3>
        <p className="text-[11px] text-[#888] mt-0.5">
          <b>Super admin</b> : gère les administrateurs et tous les rôles. <b>Admin</b> : valide les marchands et modère les comptes clients / marchands.
        </p>
      </div>

      <form onSubmit={invite} className="p-4 border-b border-[#ECECEC] bg-[#FAFAFA] flex flex-col sm:flex-row gap-2">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com"
          aria-label="Email du nouvel administrateur" className="flex-1 h-10 border border-[#DADAD9] px-3 text-[13px] outline-none focus:border-[#1A1F8A] bg-white" />
        <select value={level} onChange={(e) => setLevel(e.target.value as "standard" | "super")} aria-label="Niveau"
          className="h-10 border border-[#DADAD9] px-2 text-[13px] bg-white">
          <option value="standard">Admin</option>
          <option value="super">Super admin</option>
        </select>
        <button type="submit" disabled={busy} className="btn-benjamin-orange h-10 flex items-center justify-center gap-1.5 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Ajouter
        </button>
      </form>
      <p className="px-4 pt-2 text-[11px] text-[#888] flex gap-1.5"><Info className="w-3.5 h-3.5 shrink-0" /> Si la personne n&apos;a pas encore de compte, les droits s&apos;appliquent automatiquement à sa première connexion avec cet email.</p>

      {admins === null ? (
        <SkeletonRows n={3} />
      ) : (
        <ul className="divide-y divide-[#ECECEC] mt-2">
          {admins.map((a) => {
            const self = a.id === me.id;
            return (
              <li key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${a.isSuperAdmin ? "bg-[#0A0F4D] text-[#FFD166]" : "bg-[#EEF0FF] text-[#1A1F8A]"}`}>
                  {a.isSuperAdmin ? <Crown className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[13px]">{a.name ?? a.email}</span>
                    <Pill tone={a.isSuperAdmin ? "navy" : "blue"}>{a.isSuperAdmin ? "Super admin" : "Admin"}</Pill>
                    {a.protected && <Pill tone="grey">Protégé</Pill>}
                    {a.status === "suspended" && <Pill tone="red">Suspendu</Pill>}
                    {self && <span className="text-[10px] text-[#888]">(vous)</span>}
                  </div>
                  <div className="text-[11px] text-[#888] mt-0.5">{a.email} · dernière connexion {fmtDate(a.lastLoginAt)}</div>
                </div>
                {!self && !a.protected && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => patchUser(a.id, { adminLevel: a.isSuperAdmin ? "standard" : "super" }, "Niveau mis à jour").catch((e) => toast.error(e.message))}
                      className="btn-outline-grey text-[11px]"
                    >
                      {a.isSuperAdmin ? "Passer admin" : "Passer super admin"}
                    </button>
                    <button
                      onClick={() =>
                        setConfirm({
                          title: "Retirer les droits d'administration",
                          text: `${a.email} redeviendra client.`,
                          run: () => patchUser(a.id, { role: "BUYER" }, "Droits d'administration retirés"),
                        })
                      }
                      className="text-[11px] font-bold uppercase text-[#B91C1C] px-2"
                    >
                      Retirer
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {invites.length > 0 && (
        <div className="border-t border-[#ECECEC]">
          <div className="px-4 pt-4 text-[11px] font-bold uppercase text-[#666]">Invitations en attente</div>
          <ul className="divide-y divide-[#ECECEC]">
            {invites.map((i) => (
              <li key={i.id} className="px-4 py-3 flex items-center gap-3 text-[12px]">
                <span className="flex-1 min-w-0 truncate">{i.email}</span>
                <Pill tone={i.level === "super" ? "navy" : "blue"}>{i.level === "super" ? "Super admin" : "Admin"}</Pill>
                <span className="text-[#888] hidden sm:inline">{fmtDate(i.createdAt)}</span>
                <button
                  aria-label={`Annuler l'invitation de ${i.email}`}
                  onClick={() =>
                    adminFetch(`/api/admin/admins/invites/${i.id}`, { method: "DELETE" })
                      .then(() => { toast.success("Invitation annulée"); return load(); })
                      .catch((e) => toast.error(e.message))
                  }
                  className="p-1.5 text-[#B91C1C]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirm && (
        <ReasonDialog
          title={confirm.title}
          description={confirm.text}
          confirmLabel="Confirmer"
          tone="red"
          requireReason={false}
          onConfirm={confirm.run}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

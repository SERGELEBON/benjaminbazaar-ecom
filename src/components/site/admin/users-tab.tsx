"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Pill, ROLE_LABEL, ReasonDialog, SHOP_STATUS_LABEL, SkeletonRows, adminFetch, fmtDate, jsonInit, shopTone, useAutoRefresh } from "./shared";

export type AdminUser = {
  id: string; name: string | null; email: string; role: "BUYER" | "SUPPLIER" | "ADMIN"; adminLevel: string | null;
  isSuperAdmin: boolean; protected: boolean; status: string; createdAt: string; lastLoginAt: string | null;
  supplier: { id: string; name: string; status: string } | null;
};

/** Role options encoded as "ROLE" or "ADMIN:level". */
const roleValue = (u: AdminUser) => (u.role === "ADMIN" ? `ADMIN:${u.isSuperAdmin ? "super" : "standard"}` : u.role);

export function UsersTab() {
  const me = useApp((s) => s.user);
  const iAmSuper = Boolean(me?.isSuperAdmin);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ user: AdminUser; patch: Record<string, string>; label: string; text: string } | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (role) params.set("role", role);
    try {
      const d = await adminFetch<{ users: AdminUser[]; total: number }>(`/api/admin/users?${params}`);
      setUsers(d.users);
      setTotal(d.total);
    } catch (e) {
      toast.error((e as Error).message);
      setUsers((x) => x ?? []);
    }
  }, [q, role]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);
  useAutoRefresh(() => void load(), 60_000);

  async function apply(u: AdminUser, patch: Record<string, string>, ok: string) {
    setBusyId(u.id);
    try {
      await adminFetch(`/api/admin/users/${u.id}`, jsonInit("PATCH", patch));
      toast.success(ok);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function onRoleChange(u: AdminUser, value: string) {
    const [r, level] = value.split(":");
    const patch: Record<string, string> = r === u.role && level ? { adminLevel: level } : { role: r, ...(level ? { adminLevel: level } : {}) };
    const label = value.startsWith("ADMIN") ? (level === "super" ? "Super admin" : "Admin") : ROLE_LABEL[r];
    const sensitive = r === "ADMIN" || u.role === "ADMIN" || (u.role === "SUPPLIER" && r === "BUYER" && u.supplier?.status === "approved");
    if (sensitive) {
      setConfirm({
        user: u,
        patch,
        label: "Confirmer",
        text:
          u.role === "SUPPLIER" && r === "BUYER"
            ? `${u.email} redevient client : sa boutique « ${u.supplier?.name} » sera suspendue.`
            : `${u.email} → ${label}. Cette action est enregistrée dans le journal.`,
      });
      return;
    }
    apply(u, patch, "Rôle mis à jour").catch((e) => toast.error(e.message));
  }

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="benjamin-section-title">Utilisateurs</h3>
          <p className="text-[11px] text-[#888] mt-0.5">
            {total} compte{total > 1 ? "s" : ""}
            {!iAmSuper && " · seuls les super admins peuvent gérer les administrateurs"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <label className="flex items-center border border-[#DADAD9] px-2 basis-full sm:basis-auto flex-1 sm:w-56 min-w-0">
            <Search className="w-3.5 h-3.5 text-[#888]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou email" aria-label="Rechercher un utilisateur" className="flex-1 px-2 py-1.5 text-[12px] outline-none" />
          </label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="border border-[#DADAD9] px-2 py-1.5 text-[12px] bg-white" aria-label="Filtrer par rôle">
            <option value="">Tous les rôles</option>
            <option value="BUYER">Clients</option>
            <option value="SUPPLIER">Marchands</option>
            <option value="ADMIN">Admins</option>
          </select>
          <button onClick={() => void load()} className="btn-outline-grey !px-2" aria-label="Actualiser"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {users === null ? (
        <SkeletonRows n={5} />
      ) : users.length === 0 ? (
        <p className="p-6 text-[13px] text-[#666] text-center">Aucun utilisateur.</p>
      ) : (
        <div className="overflow-x-auto benjamin-scroll">
          <table className="w-full text-[12px] min-w-[820px]">
            <thead className="bg-[#ECECEC] text-[#666] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="text-left px-4 py-2.5 font-bold">Utilisateur</th>
                <th className="text-left px-4 py-2.5 font-bold">Rôle</th>
                <th className="text-left px-4 py-2.5 font-bold">Boutique</th>
                <th className="text-center px-4 py-2.5 font-bold">Compte</th>
                <th className="text-left px-4 py-2.5 font-bold">Inscrit / vu</th>
                <th className="text-right px-4 py-2.5 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === me?.id;
                const locked = self || u.protected || (u.role === "ADMIN" && !iAmSuper);
                return (
                  <tr key={u.id} className="border-b border-[#ECECEC] hover:bg-[#FAFAFA] align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{u.name ?? "—"} {self && <span className="text-[10px] text-[#888]">(vous)</span>}</div>
                      <div className="text-[11px] text-[#888]">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {locked ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Pill tone={u.role === "ADMIN" ? "navy" : u.role === "SUPPLIER" ? "orange" : "blue"}>
                            {u.role === "ADMIN" ? (u.isSuperAdmin ? "Super admin" : "Admin") : ROLE_LABEL[u.role]}
                          </Pill>
                          {u.protected && <span title="Compte protégé (configuration)"><Lock className="w-3 h-3 text-[#888]" /></span>}
                        </span>
                      ) : (
                        <select
                          value={roleValue(u)}
                          disabled={busyId === u.id}
                          onChange={(e) => onRoleChange(u, e.target.value)}
                          className="border border-[#DADAD9] px-2 py-1 text-[11px] bg-white disabled:opacity-60"
                          aria-label={`Rôle de ${u.email}`}
                        >
                          <option value="BUYER">Client</option>
                          <option value="SUPPLIER" disabled={!u.supplier}>Marchand{!u.supplier ? " (sans boutique)" : ""}</option>
                          {iAmSuper && <option value="ADMIN:standard">Admin</option>}
                          {iAmSuper && <option value="ADMIN:super">Super admin</option>}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.supplier ? (
                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold truncate max-w-[180px]">{u.supplier.name}</div>
                          <Pill tone={shopTone(u.supplier.status)}>{SHOP_STATUS_LABEL[u.supplier.status] ?? u.supplier.status}</Pill>
                        </div>
                      ) : (
                        <span className="text-[#AAA]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Pill tone={u.status === "active" ? "green" : "grey"}>{u.status === "active" ? "Actif" : "Suspendu"}</Pill>
                    </td>
                    <td className="px-4 py-3 text-[#666]">
                      <div>{fmtDate(u.createdAt)}</div>
                      <div className="text-[10px] text-[#999]">vu {fmtDate(u.lastLoginAt)}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!locked && (
                        <button
                          disabled={busyId === u.id}
                          onClick={() =>
                            u.status === "suspended"
                              ? apply(u, { status: "active" }, "Compte réactivé").catch((e) => toast.error(e.message))
                              : setConfirm({ user: u, patch: { status: "suspended" }, label: "Suspendre", text: `${u.email} ne pourra plus se connecter${u.supplier?.status === "approved" ? " et sa boutique sera masquée" : ""}.` })
                          }
                          className="benjamin-link text-[12px] disabled:opacity-60"
                        >
                          {u.status === "suspended" ? "Réactiver" : "Suspendre"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <ReasonDialog
          title={confirm.label === "Suspendre" ? "Suspendre le compte" : "Changer le rôle"}
          description={confirm.text}
          confirmLabel={confirm.label}
          tone={confirm.label === "Suspendre" ? "red" : "navy"}
          requireReason={false}
          onConfirm={() => apply(confirm.user, confirm.patch, "Modification enregistrée")}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

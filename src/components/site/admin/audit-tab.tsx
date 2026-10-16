"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SkeletonRows, adminFetch, fmtDateTime } from "./shared";

type Entry = {
  id: string; action: string; targetType: string; targetId: string; createdAt: string;
  details: Record<string, unknown> | null; actor: { name: string | null; email: string } | null;
};

const LABEL: Record<string, string> = {
  "supplier.approved": "a validé la boutique",
  "supplier.rejected": "a refusé la boutique",
  "supplier.suspended": "a suspendu la boutique",
  "supplier.pending": "a remis en attente la boutique",
  "merchant.apply": "a demandé à devenir vendeur",
  "merchant.resubmit": "a renvoyé sa demande vendeur",
  "user.role": "a changé un rôle",
  "user.adminLevel": "a changé un niveau d'admin",
  "user.suspend": "a suspendu un compte",
  "user.reactivate": "a réactivé un compte",
  "admin.invite": "a invité un administrateur",
  "admin.invite.revoke": "a annulé une invitation",
  "admin.invite.accepted": "a accepté une invitation admin",
  "admin.grant": "a nommé un administrateur",
};

function summary(d: Record<string, unknown> | null) {
  if (!d) return "";
  const parts: string[] = [];
  if (d.shop) parts.push(`« ${d.shop} »`);
  if (d.email) parts.push(String(d.email));
  if (d.from !== undefined && d.to !== undefined) parts.push(`${d.from ?? "—"} → ${d.to ?? "—"}`);
  if (d.level) parts.push(`niveau ${d.level}`);
  if (d.reason) parts.push(`motif : ${d.reason}`);
  return parts.join(" · ");
}

/** Super admins: who did what and when. */
export function AuditTab() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  useEffect(() => {
    adminFetch<{ entries: Entry[] }>("/api/admin/audit")
      .then((d) => setEntries(d.entries))
      .catch((e) => {
        toast.error(e.message);
        setEntries([]);
      });
  }, []);
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Journal des actions</h3>
        <p className="text-[11px] text-[#888] mt-0.5">100 dernières actions sensibles (rôles, validations, suspensions).</p>
      </div>
      {entries === null ? (
        <SkeletonRows />
      ) : entries.length === 0 ? (
        <p className="p-6 text-center text-[13px] text-[#666]">Aucune action enregistrée pour le moment.</p>
      ) : (
        <ul className="divide-y divide-[#ECECEC]">
          {entries.map((e) => (
            <li key={e.id} className="px-4 py-3 text-[12px]">
              <div>
                <b>{e.actor?.name ?? e.actor?.email ?? "Système"}</b> {LABEL[e.action] ?? e.action}
              </div>
              <div className="text-[11px] text-[#777] mt-0.5">
                {fmtDateTime(e.createdAt)}
                {summary(e.details) && <> · {summary(e.details)}</>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

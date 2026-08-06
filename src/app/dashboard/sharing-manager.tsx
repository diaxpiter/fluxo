"use client";

import { useState, useTransition } from "react";
import { inviteMember, removeMember, respondToInvite, leaveSpace } from "@/app/dashboard/actions";
import { cardClass, fieldClass, btnPrimaryClass, btnGhostClass, actionLinkClass } from "@/lib/ui";
import { notify } from "@/lib/toast";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { PendingInvite, SpaceMember, SpaceWithRole } from "@/lib/types";

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-foreground/10 bg-foreground/[0.04] px-2 py-0.5 text-xs text-foreground/50">
      {label}
    </span>
  );
}

export function PendingInvitesBanner({ invites, t }: { invites: PendingInvite[]; t: Dictionary["spaces"] }) {
  const [, startTransition] = useTransition();
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());

  function respond(inviteId: string, accept: boolean) {
    setRespondedIds((prev) => new Set(prev).add(inviteId));
    startTransition(async () => {
      const formData = new FormData();
      formData.set("inviteId", inviteId);
      formData.set("accept", String(accept));
      const result = await respondToInvite(formData);
      if (!result.ok) notify(result.error, "error");
    });
  }

  const visible = invites.filter((i) => !respondedIds.has(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground/50">{t.pendingInvitesHeading}</h2>
      <div className={cardClass}>
        {visible.map((invite) => (
          <div
            key={invite.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/5 p-4 last:border-0"
          >
            <p className="text-sm">
              {invite.inviterDisplayName
                ? t.pendingInviteBody.replace("{inviter}", invite.inviterDisplayName).replace("{space}", invite.space.name)
                : t.pendingInviteBodyUnknownInviter.replace("{space}", invite.space.name)}
            </p>
            <div className="flex gap-2">
              <button type="button" className={btnGhostClass} onClick={() => respond(invite.id, false)}>
                {t.declineButton}
              </button>
              <button type="button" className={btnPrimaryClass} onClick={() => respond(invite.id, true)}>
                {t.acceptButton}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SharingManager({
  space,
  members,
  currentUserId,
  t,
}: {
  space: SpaceWithRole;
  members: (SpaceMember & { displayName: string | null })[];
  currentUserId: string;
  t: Dictionary;
}) {
  const [, startTransition] = useTransition();
  const [inviting, setInviting] = useState(false);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const spacesT = t.spaces;

  function submitInvite(formData: FormData) {
    startTransition(async () => {
      const result = await inviteMember(formData);
      if (result.ok) {
        setInviting(false);
        notify(spacesT.inviteButton);
      } else {
        notify(result.error, "error");
      }
    });
  }

  function removeById(memberId: string) {
    setRemovedIds((prev) => new Set(prev).add(memberId));
    startTransition(async () => {
      const formData = new FormData();
      formData.set("memberId", memberId);
      const result = await removeMember(formData);
      if (!result.ok) notify(result.error, "error");
    });
  }

  function leave() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("spaceId", space.id);
      const result = await leaveSpace(formData);
      if (!result.ok) notify(result.error, "error");
    });
  }

  const visibleMembers = members.filter((m) => !removedIds.has(m.id));

  return (
    <div className={`${cardClass} flex flex-col`}>
      {visibleMembers.length > 0 &&
        visibleMembers.map((member) => (
          <div key={member.id} className="flex items-center justify-between gap-3 border-b border-foreground/5 p-4 last:border-0">
            <span className="truncate text-sm">{member.displayName ?? member.invited_email}</span>
            <div className="flex items-center gap-3">
              {member.status === "pending" && <Badge label={spacesT.pendingBadge} />}
              {space.isOwner ? (
                <button type="button" className={actionLinkClass} onClick={() => removeById(member.id)}>
                  {spacesT.removeButton}
                </button>
              ) : member.user_id === currentUserId ? (
                <button type="button" className={actionLinkClass} onClick={leave}>
                  {spacesT.leaveButton}
                </button>
              ) : null}
            </div>
          </div>
        ))}

      {space.isOwner && (
        <div className="border-t border-foreground/5 p-4">
          {inviting ? (
            <form action={submitInvite} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                name="email"
                required
                placeholder={spacesT.inviteEmailPlaceholder}
                className={`${fieldClass} flex-1`}
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" className={btnGhostClass} onClick={() => setInviting(false)}>
                  {t.common.cancel}
                </button>
                <button type="submit" className={btnPrimaryClass}>
                  {spacesT.inviteButton}
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className={btnGhostClass} onClick={() => setInviting(true)}>
              {spacesT.inviteEmailLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { switchSpace, addSpace, updateSpace, deleteSpace, leaveSpace } from "@/app/dashboard/actions";
import { fieldClass, btnPrimaryClass, btnGhostClass, btnDestructiveClass, actionLinkClass } from "@/lib/ui";
import { format } from "@/lib/i18n/format";
import { notify } from "@/lib/toast";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Space, SpaceWithRole } from "@/lib/types";

const SPACE_COLORS = ["#10b981", "#f59e0b", "#38bdf8", "#a78bfa", "#fb7185", "#2dd4bf", "#94a3b8"];

function initialOf(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export function SpaceSwitcher({
  spaces,
  currentSpace,
  t,
  common,
}: {
  spaces: SpaceWithRole[];
  currentSpace: SpaceWithRole;
  t: Dictionary["spaces"];
  common: Dictionary["common"];
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  function close() {
    setOpen(false);
    setAdding(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t.switcherLabel}
        style={{ backgroundColor: currentSpace.color }}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-black/80 transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        {initialOf(currentSpace.name)}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm motion-reduce:transition-none"
            onClick={close}
          />
          <aside className="animate-fade-in-up absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col gap-4 border-r border-foreground/10 bg-background p-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">{t.heading}</h2>
              <button
                type="button"
                onClick={close}
                aria-label={t.closeLabel}
                className="cursor-pointer text-foreground/50 transition-colors hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <p className="-mt-2 text-xs text-foreground/50">{t.description}</p>

            <div className="flex flex-col gap-1.5 overflow-y-auto">
              {spaces.map((space) => (
                <SpaceRow
                  key={space.id}
                  space={space}
                  active={space.id === currentSpace.id}
                  canDelete={spaces.length > 1}
                  t={t}
                  common={common}
                  onSwitched={close}
                />
              ))}
            </div>

            {adding ? (
              <SpaceForm
                t={t}
                common={common}
                onDone={() => setAdding(false)}
                onCreated={() => {
                  notify(common.savedToast);
                  close();
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-foreground/15 px-2.5 py-2 text-left text-foreground/50 transition-colors duration-150 hover:border-foreground/30 hover:text-foreground"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-foreground/25 text-sm">
                  +
                </span>
                <span className="text-sm font-medium">{t.addButton}</span>
              </button>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function SpaceRow({
  space,
  active,
  canDelete,
  t,
  common,
  onSwitched,
}: {
  space: SpaceWithRole;
  active: boolean;
  canDelete: boolean;
  t: Dictionary["spaces"];
  common: Dictionary["common"];
  onSwitched: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <SpaceForm space={space} t={t} common={common} onDone={() => setEditing(false)} />
    );
  }

  return (
    <div
      className={`rounded-xl border px-2.5 py-2 transition-colors duration-150 ${
        active ? "border-emerald-500/25 bg-emerald-500/[0.08]" : "border-transparent"
      }`}
    >
      <form
        action={(formData) => {
          if (active) {
            onSwitched();
            return;
          }
          startTransition(async () => {
            const result = await switchSpace(formData);
            if (result.ok) {
              onSwitched();
            } else {
              notify(result.error, "error");
            }
          });
        }}
      >
        <input type="hidden" name="spaceId" value={space.id} />
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center gap-2.5 text-left disabled:opacity-60"
        >
          <span
            style={{ backgroundColor: space.color }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-black/80"
          >
            {initialOf(space.name)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{space.name}</span>
          {active && <span className="shrink-0 text-emerald-500">✓</span>}
        </button>
      </form>

      <div className="mt-1.5 flex items-center gap-3 pl-[42px] text-xs">
        <button type="button" onClick={() => setEditing(true)} className={actionLinkClass}>
          {common.edit}
        </button>
        {space.isOwner
          ? canDelete && <DeleteSpaceButton space={space} t={t} common={common} />
          : canDelete && <LeaveSpaceButton space={space} t={t} common={common} />}
      </div>
    </div>
  );
}

function LeaveSpaceButton({
  space,
  t,
  common,
}: {
  space: SpaceWithRole;
  t: Dictionary["spaces"];
  common: Dictionary["common"];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${actionLinkClass} hover:text-red-400`}>
        {t.leaveButton}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-modal-in w-full max-w-sm rounded-2xl border border-foreground/10 bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold tracking-tight">{t.leaveConfirmTitle}</h2>
            <p className="mt-2 text-sm text-foreground/60">{format(t.leaveConfirmBody, { name: space.name })}</p>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setOpen(false)} className={btnGhostClass}>
                {common.cancel}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const formData = new FormData();
                  formData.set("spaceId", space.id);
                  startTransition(async () => {
                    const result = await leaveSpace(formData);
                    if (result.ok) {
                      setOpen(false);
                    } else {
                      setError(result.error);
                    }
                  });
                }}
                className={`${btnDestructiveClass} w-full`}
              >
                {t.leaveButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DeleteSpaceButton({
  space,
  t,
  common,
}: {
  space: Space;
  t: Dictionary["spaces"];
  common: Dictionary["common"];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${actionLinkClass} hover:text-red-400`}>
        {common.delete}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-modal-in w-full max-w-sm rounded-2xl border border-foreground/10 bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold tracking-tight">{t.deleteTitle}</h2>
            <p className="mt-2 text-sm text-foreground/60">{format(t.deleteBody, { name: space.name })}</p>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setOpen(false)} className={btnGhostClass}>
                {common.cancel}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const formData = new FormData();
                  formData.set("id", space.id);
                  startTransition(async () => {
                    const result = await deleteSpace(formData);
                    if (result.ok) {
                      notify(common.deletedToast);
                      setOpen(false);
                    } else {
                      setError(result.error);
                    }
                  });
                }}
                className={`${btnDestructiveClass} w-full`}
              >
                {common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SpaceForm({
  space,
  t,
  common,
  onDone,
  onCreated,
}: {
  space?: Space;
  t: Dictionary["spaces"];
  common: Dictionary["common"];
  onDone: () => void;
  onCreated?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(space?.name ?? "");
  const [color, setColor] = useState(space?.color ?? SPACE_COLORS[1]);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          if (space) {
            const updateResult = await updateSpace(formData);
            if (updateResult.ok) {
              notify(common.savedToast);
              onDone();
            } else {
              setError(updateResult.error);
            }
            return;
          }
          const result = await addSpace(formData);
          if (result.ok) {
            onCreated?.();
          } else {
            setError(result.error);
          }
        });
      }}
      className="flex flex-col gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3"
    >
      {space && <input type="hidden" name="id" value={space.id} />}
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-foreground/50">{t.nameLabel}</label>
        <input
          type="text"
          name="name"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.namePlaceholder}
          className={`${fieldClass} py-1.5 text-sm`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-foreground/50">{t.colorLabel}</label>
        <div className="flex items-center gap-2">
          {SPACE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              aria-label={c}
              className={`h-6 w-6 shrink-0 cursor-pointer rounded-full border-2 transition-transform duration-150 hover:scale-110 ${
                color === c ? "border-foreground" : "border-transparent"
              }`}
            />
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
      </div>

      <div className="mt-1 flex items-center gap-3">
        <button type="submit" disabled={isPending || !name.trim()} className={`${btnPrimaryClass} px-3 py-1.5 text-xs`}>
          {space ? common.save : t.addButton}
        </button>
        <button type="button" onClick={onDone} className={`${btnGhostClass} px-3 py-1.5 text-xs`}>
          {common.cancel}
        </button>
      </div>
    </form>
  );
}

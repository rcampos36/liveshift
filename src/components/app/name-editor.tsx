"use client";

import { useEffect, useState } from "react";

export function NameEditor({
  value,
  canEdit,
  onSave,
  displayClassName,
  tone = "light",
}: {
  value: string;
  canEdit: boolean;
  onSave: (name: string) => Promise<void>;
  displayClassName: string;
  tone?: "light" | "dark";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (!canEdit) {
    return <p className={displayClassName}>{value}</p>;
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className={displayClassName}>{value}</p>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setEditing(true);
            setError(null);
          }}
          className={
            tone === "dark"
              ? "text-[11px] font-medium tracking-wide text-[#e8c9a0]/80 hover:text-[#fff6ea]"
              : "text-[11px] font-medium tracking-wide text-stone-400 hover:text-stone-700"
          }
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = draft.trim();
        if (next.length < 2) {
          setError("Enter at least 2 characters");
          return;
        }
        setPending(true);
        void onSave(next)
          .then(() => {
            setEditing(false);
            setError(null);
          })
          .catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : "Unable to save name");
          })
          .finally(() => setPending(false));
      }}
    >
      <label className="min-w-48 flex-1">
        <span className="sr-only">Name</span>
        <input
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          className={
            tone === "dark"
              ? "w-full rounded-xl border border-[#fff6ea]/30 bg-[#1c1410] px-3 py-2 text-lg text-[#fff6ea]"
              : "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-lg text-stone-950"
          }
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className={
          tone === "dark"
            ? "rounded-full bg-[#fff6ea] px-3 py-2 text-xs font-semibold text-[#1c1410] disabled:opacity-60"
            : "rounded-full bg-[#1c1410] px-3 py-2 text-xs font-semibold text-[#fff6ea] disabled:opacity-60"
        }
      >
        {pending ? "Saving..." : "Save"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDraft(value);
          setEditing(false);
          setError(null);
        }}
        className={
          tone === "dark"
            ? "rounded-full px-3 py-2 text-xs text-[#fff6ea]/80"
            : "rounded-full px-3 py-2 text-xs text-stone-600"
        }
      >
        Cancel
      </button>
      {error ? <p className="basis-full text-sm text-red-600">{error}</p> : null}
    </form>
  );
}

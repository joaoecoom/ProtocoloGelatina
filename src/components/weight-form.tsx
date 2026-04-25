"use client";

import { useState } from "react";
import { PrimaryButton } from "@/components/primary-button";

export function WeightForm({
  initial,
  disabled = false,
  onSaved,
}: {
  initial?: number;
  disabled?: boolean;
  onSaved?: (nextWeightKg: number) => void;
}) {
  const [value, setValue] = useState(initial ?? 70);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    if (disabled) return;
    setStatus(null);
    const res = await fetch("/api/user/weight", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightKg: value }),
    });
    if (!res.ok) {
      setStatus("Erro ao guardar.");
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { weightKg?: number };
    const next = typeof data.weightKg === "number" ? data.weightKg : value;
    setValue(next);
    onSaved?.(next);
    setStatus("Guardado");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input
        type="number"
        step="0.1"
        disabled={disabled}
        className="w-24 rounded-full border border-rose-100 bg-white px-3 py-1 text-sm disabled:opacity-50"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <PrimaryButton
        type="button"
        variant="ghost"
        className="h-9 px-4 text-xs"
        disabled={disabled}
        onClick={save}
      >
        Atualizar
      </PrimaryButton>
      {status ? <span className="text-xs text-emerald-600">{status}</span> : null}
    </div>
  );
}

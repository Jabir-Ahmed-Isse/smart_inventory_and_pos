"use client";

import { useRouter } from "next/navigation";
import { fieldCls } from "@/components/CrudDialog";

type Option = { id: string; code: string; name: string };

export function AccountPicker({ accounts, selected }: { accounts: Option[]; selected: string }) {
  const router = useRouter();
  return (
    <select
      value={selected}
      onChange={(e) => router.push(`/accounting/general-ledger?account=${e.target.value}`)}
      className={`${fieldCls} appearance-none max-w-sm`}
    >
      <option value="">Select an account…</option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.code} · {a.name}
        </option>
      ))}
    </select>
  );
}

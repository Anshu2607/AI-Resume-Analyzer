import {
  CheckCircle2,
  Ban,
} from "lucide-react";

import type {
  UserStatus,
} from "../types/adminUsers.types";

export default function UserStatusBadge({
  status,
}: {
  status: UserStatus;
}) {

  const active = status === "active";

  const Icon = active
    ? CheckCircle2
    : Ban;

  return (

    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full border px-2.5 py-1
        text-xs font-medium
        ${
          active
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            : "border-red-500/20 bg-red-500/10 text-red-400"
        }
      `}
    >

      <Icon size={13} />

      {active ? "Active" : "Suspended"}

    </span>
  );
}
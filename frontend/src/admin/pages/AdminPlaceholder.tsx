import {
  Construction,
  ArrowLeft,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

interface AdminPlaceholderProps {

  title: string;

}

export default function AdminPlaceholder({
  title,
}: AdminPlaceholderProps) {

  return (

    <div className="flex min-h-[65vh] items-center justify-center">

      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#111522] p-10 text-center">

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-500/10">

          <Construction
            size={36}
            className="text-violet-400"
          />

        </div>

        <h1 className="text-xl font-semibold text-white">

          {title}

        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">

          This administration module is currently
          under development.

        </p>

        <Link
          to="/admin/dashboard"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500"
        >

          <ArrowLeft size={17} />

          Back to Dashboard

        </Link>

      </div>

    </div>

  );
}

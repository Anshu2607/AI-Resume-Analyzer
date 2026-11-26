import { Construction, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface ModulePlaceholderProps {
  title: string;
  description: string;
}

const ModulePlaceholder = ({
  title,
  description,
}: ModulePlaceholderProps) => {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">

      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Construction size={36} />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-slate-900">
          {title}
        </h1>

        <p className="mt-3 leading-relaxed text-slate-500">
          {description}
        </p>

        <div className="mt-5 inline-flex rounded-full bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
          Under development
        </div>

        <div className="mt-8">

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <ArrowLeft size={17} />
            Back to dashboard
          </Link>

        </div>

      </div>

    </div>
  );
};

export default ModulePlaceholder;
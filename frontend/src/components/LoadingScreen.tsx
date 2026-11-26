import { LoaderCircle } from "lucide-react";

const LoadingScreen = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">

      <LoaderCircle
        size={42}
        className="animate-spin text-indigo-600"
      />

      <h2 className="mt-5 text-xl font-semibold text-slate-900">
        CareerLens AI
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Preparing your workspace...
      </p>

    </div>
  );
};

export default LoadingScreen;
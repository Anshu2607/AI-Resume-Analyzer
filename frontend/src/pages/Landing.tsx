import { Link } from "react-router-dom";
import {
  BrainCircuit,
  ArrowRight,
  FileSearch,
  Target,
  Route,
  Bot,
  Sparkles,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Resume Intelligence",
    description:
      "Discover your resume's strengths and identify areas for improvement with AI-powered analysis.",
  },
  {
    icon: Target,
    title: "Semantic Job Matching",
    description:
      "Understand how your skills and experience align with your target job requirements.",
  },
  {
    icon: Route,
    title: "Career Roadmaps",
    description:
      "Build personalized learning plans based on your skills and professional goals.",
  },
  {
    icon: Bot,
    title: "Agentic AI",
    description:
      "Get contextual career recommendations through specialized AI workflows.",
  },
  {
    icon: MessageSquare,
    title: "Interview Preparation",
    description:
      "Practice role-specific interview questions and receive personalized feedback.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Workspace",
    description:
      "Manage your resumes and career information within a private workspace.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <Link to="/" className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5 text-white">
              <BrainCircuit size={24} />
            </div>

            <span className="text-lg font-bold sm:text-xl">
              CareerLens AI
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">

            <a
              href="#features"
              className="hidden text-sm font-medium text-slate-600 hover:text-indigo-600 md:block"
            >
              Features
            </a>

            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-indigo-600"
            >
              Sign in
            </Link>

            <Link
              to="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Get started
            </Link>

          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 px-6 py-24 text-white md:py-36">

        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />

        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">

          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300">

            <Sparkles size={16} />
            AI-Powered Career Intelligence

          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-7xl">

            Your career deserves

            <span className="mt-3 block text-indigo-400">
              a smarter direction.
            </span>

          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg">

            Analyze your resume, discover skill gaps,
            explore career opportunities and prepare for your
            next interview with an intelligent career workspace.

          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">

            <Link
              to="/register"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 font-semibold text-white transition hover:bg-indigo-500"
            >
              Get started
              <ArrowRight size={18} />
            </Link>

            <a
              href="#features"
              className="rounded-xl border border-slate-700 px-7 py-3.5 font-semibold transition hover:bg-slate-800"
            >
              Explore features
            </a>

          </div>

        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24"
      >

        <div className="mb-14 text-center">

          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
            Platform capabilities
          </p>

          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need to grow professionally
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-slate-500">
            An intelligent career development platform designed
            for students and professionals.
          </p>

        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
              >

                <div className="mb-5 inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-600">
                  <Icon size={25} />
                </div>

                <h3 className="text-lg font-semibold">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  {feature.description}
                </p>

              </div>
            );
          })}

        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-50 px-6 py-20 text-center">

        <h2 className="text-3xl font-bold tracking-tight">
          Take control of your career journey.
        </h2>

        <p className="mt-4 text-slate-600">
          Create your workspace and start building your future.
        </p>

        <Link
          to="/register"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 font-semibold text-white hover:bg-indigo-700"
        >
          Create your account
          <ArrowRight size={18} />
        </Link>

      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 py-7">

        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">

          <div className="flex items-center gap-2 font-semibold">
            <BrainCircuit size={23} className="text-indigo-600" />
            CareerLens AI
          </div>

          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} CareerLens AI.
            All rights reserved.
          </p>

        </div>

      </footer>
    </div>
  );
};

export default Landing;
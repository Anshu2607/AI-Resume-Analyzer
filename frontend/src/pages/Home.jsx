import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  BarChart3,
  Briefcase,
  Download,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "ATS Resume Analysis",
    description:
      "Upload your resume and get instant ATS-style scoring and detailed feedback.",
  },
  {
    icon: BarChart3,
    title: "Job Description Matching",
    description:
      "Compare your resume with job descriptions and identify missing keywords.",
  },
  {
    icon: Briefcase,
    title: "Interview Preparation",
    description:
      "Practice role-based interview questions for your target job role.",
  },
  {
    icon: Download,
    title: "PDF Reports",
    description:
      "Download your analysis report as a professionally formatted PDF.",
  },
];

export default function Home() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-7xl font-extrabold leading-tight"
          >
            Build a
            <span className="text-blue-600"> Stronger Resume</span>
            <br />
            Ace Every Interview.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-6 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto"
          >
            AI-powered platform for resume analysis, ATS scoring,
            job description matching, and role-based interview preparation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="mt-10 flex flex-col sm:flex-row justify-center gap-4"
          >
            <Link
              to="/register"
              className="bg-blue-600 text-white px-8 py-4 rounded-xl shadow-lg hover:bg-blue-700 transition"
            >
              Get Started Free
            </Link>

            <Link
              to="/login"
              className="border border-gray-300 px-8 py-4 rounded-xl hover:bg-gray-100 transition"
            >
              Login
            </Link>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <h2 className="text-4xl font-bold text-center mb-12">
            Powerful Features
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.1,
                  }}
                  className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition"
                >
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={24} />
                  </div>

                  <h3 className="text-xl font-semibold mb-2">
                    {feature.title}
                  </h3>

                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-blue-600 text-white py-20 px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Boost Your Career?
          </h2>

          <p className="text-lg mb-8 text-blue-100">
            Analyze your resume, prepare for interviews,
            and land your dream job.
          </p>

          <Link
            to="/register"
            className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition"
          >
            Start Now
          </Link>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-8 text-center">
          <p>
            © {new Date().getFullYear()} AI Resume Analyzer.
            Built with React, Spring Boot, and PostgreSQL.
          </p>
        </footer>
      </div>
    </>
  );
}
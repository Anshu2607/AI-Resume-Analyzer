import { useEffect, useRef, useState } from "react";
import type { DragEvent, ChangeEvent } from "react";
import axios from "axios";

import {
  UploadCloud,
  FileText,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  FileSearch,
  ShieldCheck,
} from "lucide-react";

import { resumeService } from "../services/resume.service";
import type { Resume } from "../types/resume.types";

import AnalysisWorkspace from "../components/AnalysisWorkspace";

const ResumeAnalysis = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [resumes, setResumes] = useState<Resume[]>([]);

  const [preview, setPreview] =
    useState<Resume | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const [isUploading, setIsUploading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [previewLoading, setPreviewLoading] =
    useState<string | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [progress, setProgress] = useState(0);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // Extract API error messages
  const getErrorMessage = (
    err: unknown,
    fallback: string
  ): string => {
    return axios.isAxiosError(err)
      ? err.response?.data?.message || fallback
      : fallback;
  };

  // Retrieve resume history
  const fetchResumes = async () => {
    setIsLoading(true);

    try {
      const response = await resumeService.getAll();

      setResumes(response.data);

    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to retrieve resumes."
        )
      );

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchResumes();
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Validate selected PDF
  const validateFile = (file: File) => {
    setError("");
    setSuccess("");

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a valid PDF file.");
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Resume size must not exceed 5 MB.");
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setError("The selected file is empty.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setProgress(0);
  };

  // Handle file selection
  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file && !isUploading) {
      validateFile(file);
    }

    event.target.value = "";
  };

  // Handle drag and drop
  const handleDrop = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setIsDragging(false);

    if (isUploading) return;

    const file = event.dataTransfer.files[0];

    if (file) {
      validateFile(file);
    }
  };

  // Remove selected file
  const removeSelectedFile = () => {
    setSelectedFile(null);
    setProgress(0);
    setError("");
  };

  // Upload resume
  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setError("");
    setSuccess("");
    setProgress(0);

    try {
      await resumeService.upload(
        selectedFile,
        (value) => setProgress(value)
      );

      setSuccess(
        "Resume uploaded and processed successfully."
      );

      setSelectedFile(null);
      setProgress(0);

      await fetchResumes();

    } catch (err) {
      setError(
        getErrorMessage(err, "Resume upload failed.")
      );

    } finally {
      setIsUploading(false);
    }
  };

  // Retrieve extracted resume text
  const handlePreview = async (id: string) => {
    setPreviewLoading(id);
    setError("");

    try {
      const response = await resumeService.getById(id);

      setPreview(response.data);

    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to retrieve resume."
        )
      );

    } finally {
      setPreviewLoading(null);
    }
  };

  // Delete resume
  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this resume? " +
      "Previously generated AI analysis reports must be deleted separately."
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      await resumeService.delete(id);

      setResumes((previous) =>
        previous.filter(
          (resume) => resume._id !== id
        )
      );

      if (preview?._id === id) {
        setPreview(null);
      }

      setSuccess("Resume deleted successfully.");

    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to delete resume."
        )
      );

    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7">

      {/* Page Header */}
      <div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Resume Intelligence
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Upload, process, analyze and manage your
          professional resumes in one place.
        </p>

      </div>

      {/* Error Notification */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >

          <AlertCircle
            size={20}
            className="shrink-0"
          />

          <span className="flex-1">
            {error}
          </span>

          <button
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={18} />
          </button>

        </div>
      )}

      {/* Success Notification */}
      {success && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >

          <CheckCircle2
            size={20}
            className="shrink-0"
          />

          <span className="flex-1">
            {success}
          </span>

          <button
            aria-label="Dismiss notification"
            onClick={() => setSuccess("")}
          >
            <X size={18} />
          </button>

        </div>
      )}

      {/* Upload Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6">

          <h2 className="text-xl font-semibold text-slate-900">
            Upload Resume
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Upload a PDF to extract its professional
            information and prepare it for AI analysis.
          </p>

        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(event) => {
            event.preventDefault();

            if (!isUploading) {
              setIsDragging(true);
            }
          }}

          onDragLeave={() =>
            setIsDragging(false)
          }

          onDrop={handleDrop}

          className={`rounded-2xl border-2 border-dashed p-10 text-center transition ${
            isDragging
              ? "border-indigo-600 bg-indigo-100"
              : "border-indigo-200 bg-indigo-50/40"
          }`}
        >

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">

            <UploadCloud size={32} />

          </div>

          <h3 className="mt-5 font-semibold text-slate-800">
            Drag and drop your resume here
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            PDF documents only, up to 5 MB and 20 pages
          </p>

          <button
            type="button"
            disabled={isUploading}

            onClick={() =>
              fileInputRef.current?.click()
            }

            className="mt-5 rounded-lg border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
          >

            Browse Files

          </button>

        </div>

        {/* Selected File */}
        {selectedFile && (

          <div className="mt-5 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">

            <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">

              <FileText size={24} />

            </div>

            <div className="min-w-0 flex-1">

              <p className="truncate text-sm font-semibold text-slate-800">
                {selectedFile.name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatFileSize(selectedFile.size)}
              </p>

            </div>

            <button
              type="button"
              aria-label="Remove selected file"
              disabled={isUploading}
              onClick={removeSelectedFile}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >

              <X size={20} />

            </button>

          </div>

        )}

        {/* Upload Progress */}
        {isUploading && (

          <div className="mt-5">

            <div className="mb-2 flex justify-between text-sm">

              <span className="text-slate-600">

                {progress === 100
                  ? "Processing PDF..."
                  : "Uploading resume..."}

              </span>

              <span className="font-semibold text-indigo-600">
                {progress}%
              </span>

            </div>

            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 overflow-hidden rounded-full bg-slate-100"
            >

              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

        )}

        {/* Upload Button */}
        <button
          type="button"
          disabled={!selectedFile || isUploading}
          onClick={handleUpload}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >

          {isUploading ? (

            <>
              <LoaderCircle
                size={20}
                className="animate-spin"
              />

              Processing Resume...
            </>

          ) : (

            <>
              <UploadCloud size={20} />

              Upload and Process Resume
            </>

          )}

        </button>

        {/* Security Information */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">

          <ShieldCheck
            size={16}
            className="shrink-0 text-indigo-600"
          />

          Resume access is restricted to your
          authenticated account.

        </div>

      </section>

      {/* Resume History */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6">

          <h2 className="text-xl font-semibold text-slate-900">
            Your Resumes
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage your previously uploaded documents.
          </p>

        </div>

        {isLoading ? (

          /* Loading State */
          <div className="flex justify-center py-12">

            <LoaderCircle
              size={32}
              className="animate-spin text-indigo-600"
            />

          </div>

        ) : resumes.length === 0 ? (

          /* Empty State */
          <div className="py-12 text-center">

            <FileSearch
              size={42}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 font-semibold text-slate-700">
              No resumes uploaded
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Upload your first resume to get started.
            </p>

          </div>

        ) : (

          /* Resume List */
          <div className="space-y-4">

            {resumes.map((resume) => (

              <div
                key={resume._id}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
              >

                {/* File Icon */}
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">

                  <FileText size={26} />

                </div>

                {/* Resume Information */}
                <div className="min-w-0 flex-1">

                  <h3 className="truncate text-sm font-semibold text-slate-900">
                    {resume.originalName}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">

                    {formatFileSize(resume.fileSize)}

                    {" · "}

                    {resume.pageCount} page(s)

                    {" · "}

                    {new Date(
                      resume.createdAt
                    ).toLocaleDateString("en-IN")}

                  </p>

                </div>

                {/* Resume Status */}
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    resume.status === "processed"
                      ? "bg-emerald-50 text-emerald-700"
                      : resume.status === "failed"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >

                  {resume.status}

                </span>

                {/* Resume Actions */}
                <div className="flex gap-2">

                  <button
                    type="button"

                    onClick={() =>
                      handlePreview(resume._id)
                    }

                    disabled={
                      previewLoading !== null ||
                      deletingId !== null
                    }

                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
                  >

                    {previewLoading === resume._id ? (

                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />

                    ) : (

                      <Eye size={16} />

                    )}

                    View Text

                  </button>

                  <button
                    type="button"

                    aria-label={`Delete ${resume.originalName}`}

                    onClick={() =>
                      handleDelete(resume._id)
                    }

                    disabled={
                      deletingId !== null ||
                      previewLoading !== null
                    }

                    className="rounded-lg bg-red-50 p-2.5 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >

                    {deletingId === resume._id ? (

                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />

                    ) : (

                      <Trash2 size={18} />

                    )}

                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

      {/* AI Analysis Workspace */}
      <AnalysisWorkspace resumes={resumes} />

      {/* Extracted Text Preview Modal */}
      {preview && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"

            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setPreview(null);
              }
            }}

            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >

            {/* Modal Header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5">

              <div className="min-w-0">

                <h2
                  id="preview-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Extracted Resume Text
                </h2>

                <p className="mt-1 truncate text-sm text-slate-500">
                  {preview.originalName}
                </p>

              </div>

              <button
                type="button"
                autoFocus
                aria-label="Close resume preview"

                onClick={() =>
                  setPreview(null)
                }

                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              >

                <X size={24} />

              </button>

            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-6">

              <pre className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-5 font-sans text-sm leading-relaxed text-slate-700">

                {preview.extractedText ||
                  "No extracted text available."}

              </pre>

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-200 p-4">

              <button
                type="button"

                onClick={() =>
                  setPreview(null)
                }

                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >

                Close

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default ResumeAnalysis;
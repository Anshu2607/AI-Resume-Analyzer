import api from "./api";

import type {
  ResumeUploadResponse,
  ResumeListResponse,
  ResumeDetailsResponse,
  ResumeDeleteResponse,
} from "../types/resume.types";

export const resumeService = {

  // Upload and process a PDF resume
  upload: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ResumeUploadResponse> => {

    const formData = new FormData();

    formData.append("resume", file);

    const response = await api.post<ResumeUploadResponse>(
      "/resumes/upload",
      formData,
      {
        headers: {
          "Content-Type": undefined,
        },

        timeout: 60000,

        onUploadProgress: (event) => {
          if (event.total && onProgress) {
            const progress = Math.round(
              (event.loaded * 100) / event.total
            );

            onProgress(progress);
          }
        },
      }
    );

    return response.data;
  },

  // Retrieve all resumes
  getAll: async (): Promise<ResumeListResponse> => {

    const response = await api.get<ResumeListResponse>(
      "/resumes"
    );

    return response.data;
  },

  // Retrieve resume details and extracted text
  getById: async (
    resumeId: string
  ): Promise<ResumeDetailsResponse> => {

    const response = await api.get<ResumeDetailsResponse>(
      `/resumes/${resumeId}`
    );

    return response.data;
  },

  // Delete a resume
  delete: async (
    resumeId: string
  ): Promise<ResumeDeleteResponse> => {

    const response = await api.delete<ResumeDeleteResponse>(
      `/resumes/${resumeId}`
    );

    return response.data;
  },
};
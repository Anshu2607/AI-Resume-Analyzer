import api from "./api";

import type {
  GenerateAnalysisResponse,
  AnalysisListResponse,
  AnalysisDetailsResponse,
  AnalysisDeleteResponse,
} from "../types/analysis.types";

export const analysisService = {

  // Generate AI-powered resume analysis
  generate: async (
    resumeId: string
  ): Promise<GenerateAnalysisResponse> => {

    const response =
      await api.post<GenerateAnalysisResponse>(
        `/analyses/resume/${resumeId}`,
        undefined,
        {
          timeout: 120000,
        }
      );

    return response.data;
  },

  // Retrieve all previous analysis reports
  getAll: async (): Promise<AnalysisListResponse> => {

    const response =
      await api.get<AnalysisListResponse>(
        "/analyses"
      );

    return response.data;
  },

  // Retrieve a particular analysis report
  getById: async (
    analysisId: string
  ): Promise<AnalysisDetailsResponse> => {

    const response =
      await api.get<AnalysisDetailsResponse>(
        `/analyses/${analysisId}`
      );

    return response.data;
  },

  // Delete an analysis report
  delete: async (
    analysisId: string
  ): Promise<AnalysisDeleteResponse> => {

    const response =
      await api.delete<AnalysisDeleteResponse>(
        `/analyses/${analysisId}`
      );

    return response.data;
  },
};
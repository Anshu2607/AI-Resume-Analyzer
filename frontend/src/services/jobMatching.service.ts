import api from "./api";

import type {
  JobMatchingRequest,
  JobMatch,
  JobMatchListResponse,
  JobMatchApiResponse,
} from "../types/jobMatching.types";

export const jobMatchingService = {

  // Generate a new compatibility report

  async generateReport(
    request: JobMatchingRequest
  ): Promise<JobMatch> {

    const response =
      await api.post<JobMatchApiResponse<JobMatch>>(
        "/job-matches",
        request,
        {
          timeout: 300000,
        }
      );

    return response.data.data;
  },

  // Retrieve saved job matching reports

  async getAll(
    page = 1,
    limit = 20
  ): Promise<JobMatchListResponse> {

    const response =
      await api.get<
        JobMatchApiResponse<JobMatchListResponse>
      >(
        "/job-matches",
        {
          params: {
            page,
            limit,
          },
        }
      );

    return response.data.data;
  },

  // Retrieve an individual report

  async getById(
    jobMatchId: string
  ): Promise<JobMatch> {

    const response =
      await api.get<JobMatchApiResponse<JobMatch>>(
        `/job-matches/${jobMatchId}`
      );

    return response.data.data;
  },

  // Delete a saved compatibility report

  async delete(
    jobMatchId: string
  ): Promise<void> {

    await api.delete(
      `/job-matches/${jobMatchId}`
    );
  },
};

export default jobMatchingService;
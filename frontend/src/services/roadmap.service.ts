import api from "./api";

import type {
  SkillGapReport,
  Roadmap,
  RoadmapRequest,
  RoadmapListResponse,
  RoadmapApiResponse,
  ActivityProgressRequest,
} from "../types/roadmap.types";

// =====================================
// ROADMAP API SERVICE
// =====================================

export const roadmapService = {

  // =====================================
  // 1. GET SKILL GAP ANALYSIS
  // =====================================

  async getSkillGaps(
    jobMatchId: string
  ): Promise<SkillGapReport> {

    const response = await api.get<
      RoadmapApiResponse<SkillGapReport>
    >(
      `/skill-gaps/${jobMatchId}`
    );

    return response.data.data;
  },

  // =====================================
  // 2. GENERATE CAREER ROADMAP
  // =====================================

  async generateRoadmap(
    request: RoadmapRequest
  ): Promise<Roadmap> {

    const response = await api.post<
      RoadmapApiResponse<Roadmap>
    >(
      "/roadmaps",
      request,
      {
        timeout: 300000,
      }
    );

    return response.data.data;
  },

  // =====================================
  // 3. GET ALL SAVED ROADMAPS
  // =====================================

  async getAll(
    page = 1,
    limit = 20
  ): Promise<RoadmapListResponse> {

    const response = await api.get<
      RoadmapApiResponse<RoadmapListResponse>
    >(
      "/roadmaps",
      {
        params: {
          page,
          limit,
        },
      }
    );

    return response.data.data;
  },

  // =====================================
  // 4. GET INDIVIDUAL ROADMAP
  // =====================================

  async getById(
    roadmapId: string
  ): Promise<Roadmap> {

    const response = await api.get<
      RoadmapApiResponse<Roadmap>
    >(
      `/roadmaps/${roadmapId}`
    );

    return response.data.data;
  },

  // =====================================
  // 5. UPDATE LEARNING ACTIVITY
  // =====================================

  async updateProgress(
    roadmapId: string,
    request: ActivityProgressRequest
  ): Promise<Roadmap> {

    const response = await api.patch<
      RoadmapApiResponse<Roadmap>
    >(
      `/roadmaps/${roadmapId}/progress`,
      request
    );

    return response.data.data;
  },

  // =====================================
  // 6. RESET ROADMAP PROGRESS
  // =====================================

  async resetProgress(
    roadmapId: string
  ): Promise<Roadmap> {

    const response = await api.patch<
      RoadmapApiResponse<Roadmap>
    >(
      `/roadmaps/${roadmapId}/reset`
    );

    return response.data.data;
  },

  // =====================================
  // 7. ARCHIVE ROADMAP
  // =====================================

  async archive(
    roadmapId: string
  ): Promise<Roadmap> {

    const response = await api.patch<
      RoadmapApiResponse<Roadmap>
    >(
      `/roadmaps/${roadmapId}/archive`
    );

    return response.data.data;
  },

  // =====================================
  // 8. RESTORE ROADMAP
  // =====================================

  async restore(
    roadmapId: string
  ): Promise<Roadmap> {

    const response = await api.patch<
      RoadmapApiResponse<Roadmap>
    >(
      `/roadmaps/${roadmapId}/restore`
    );

    return response.data.data;
  },

  // =====================================
  // 9. DELETE ROADMAP
  // =====================================

  async delete(
    roadmapId: string
  ): Promise<void> {

    await api.delete(
      `/roadmaps/${roadmapId}`
    );
  },
};

export default roadmapService;
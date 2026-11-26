import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {

  RoadmapError,

  getSkillGapReport,

  generateCareerRoadmap,

  getRoadmaps,

  getRoadmapById,

  deleteRoadmap,

} from "../services/roadmap.service.js";

import {

  updateActivityProgress,

  resetRoadmapProgress,

  archiveRoadmap,

  restoreRoadmap,

} from "../services/roadmapProgress.service.js";

// =====================================
// ERROR HANDLING
// =====================================

const handleError = (

  error: unknown,

  res: Response

): void => {

  if (
    error instanceof RoadmapError
  ) {

    res.status(
      error.statusCode
    ).json({

      success: false,

      message: error.message,

    });

    return;

  }

  console.error(

    "Roadmap controller error:",

    error instanceof Error

      ? error.name

      : "Unknown error"

  );

  res.status(500).json({

    success: false,

    message: "Internal server error",

  });

};

// =====================================
// GET AUTHENTICATED USER ID
// =====================================

const getUserId = (

  req: AuthenticatedRequest

): string => {

  const userId = req.user?.userId;

  if (!userId) {

    throw new RoadmapError(
      "Unauthorized",
      401
    );

  }

  return userId;

};

// =====================================
// GET ROUTE PARAMETER
// =====================================

const getRouteParam = (

  req: AuthenticatedRequest,

  name: string

): string => {

  const value = req.params[name];

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {

    throw new RoadmapError(

      `Invalid ${name}`,

      400

    );

  }

  return value;

};

// =====================================
// PAGINATION HELPER
// =====================================

const parsePagination = (
  req: AuthenticatedRequest
) => {

  const parseValue = (

    value: unknown,

    defaultValue: number

  ): number => {

    if (value === undefined) {

      return defaultValue;

    }

    if (

      typeof value !== "string" ||

      !/^[1-9]\d*$/.test(value)

    ) {

      throw new RoadmapError(

        "Invalid pagination parameters",

        400

      );

    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed)) {

      throw new RoadmapError(

        "Invalid pagination parameters",

        400

      );

    }

    return parsed;

  };

  return {

    page: parseValue(
      req.query.page,
      1
    ),

    limit: parseValue(
      req.query.limit,
      20
    ),

  };

};

// =====================================
// 1. GET SKILL GAP REPORT
// =====================================

export const getSkillGapController =
  async (

    req: AuthenticatedRequest,

    res: Response

  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const jobMatchId =
        getRouteParam(
          req,
          "jobMatchId"
        );

      const report =
        await getSkillGapReport(

          userId,

          jobMatchId

        );

      res.status(200).json({

        success: true,

        data: report,

      });

    } catch (error) {

      handleError(error, res);

    }

  };

// =====================================
// 2. GENERATE CAREER ROADMAP
// =====================================

export const generateRoadmapController =
  async (

    req: AuthenticatedRequest,

    res: Response

  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const roadmap =
        await generateCareerRoadmap(

          userId,

          req.body

        );

      res.status(201).json({

        success: true,

        message:
          "Career roadmap generated successfully",

        data: roadmap,

      });

    } catch (error) {

      handleError(error, res);

    }

  };

// =====================================
// 3. GET ALL ROADMAPS
// =====================================

export const getRoadmapsController =
  async (

    req: AuthenticatedRequest,

    res: Response

  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const { page, limit } =
        parsePagination(req);

      const result =
        await getRoadmaps(

          userId,

          page,

          limit

        );

      res.status(200).json({

        success: true,

        data: result,

      });

    } catch (error) {

      handleError(error, res);

    }

  };

// =====================================
// 4. GET INDIVIDUAL ROADMAP
// =====================================

export const getRoadmapController =
  async (

    req: AuthenticatedRequest,

    res: Response

  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const roadmapId =
        getRouteParam(
          req,
          "roadmapId"
        );

      const roadmap =
        await getRoadmapById(

          userId,

          roadmapId

        );

      res.status(200).json({

        success: true,

        data: roadmap,

      });

    } catch (error) {

      handleError(error, res);

    }

  };

// =====================================
// 5. UPDATE ACTIVITY PROGRESS
// =====================================

export const updateProgressController =
  async (

    req: AuthenticatedRequest,

    res: Response

  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const roadmapId =
        getRouteParam(
          req,
          "roadmapId"
        );

      const roadmap =
        await updateActivityProgress(

          userId,

          roadmapId,

          req.body

        );

      res.status(200).json({

        success: true,

        message:
          "Learning progress updated successfully",

        data: roadmap,

      });

    } catch (error) {

      handleError(error, res);

    }

  };

// =====================================
// 6. RESET ROADMAP PROGRESS
// =====================================

export const resetProgressController =
  async (

    req: AuthenticatedRequest,

    res: Response

  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const roadmapId =
        getRouteParam(
          req,
          "roadmapId"
        );

      const roadmap =
        await resetRoadmapProgress(

          userId,

          roadmapId

        );

      res.status(200).json({

        success: true,

        message:
          "Roadmap progress reset successfully",

        data: roadmap,

      });

    } catch (error) {

      handleError(error, res);

    }

  };

// =====================================
// 7. ARCHIVE ROADMAP
// =====================================

export const archiveRoadmapController =
  async (

    req: AuthenticatedRequest,

    res: Response

  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const roadmapId =
        getRouteParam(
          req,
          "roadmapId"
        );

      const roadmap =
        await archiveRoadmap(

          userId,

          roadmapId

        );

      res.status(200).json({

        success: true,

        message:
          "Career roadmap archived successfully",

        data: roadmap,

      });

    } catch (error) {

      handleError(error, res);

    }

  };

// =====================================
// 8. RESTORE ROADMAP
// =====================================

export const restoreRoadmapController =
  async (

    req: AuthenticatedRequest,

    res: Response

  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const roadmapId =
        getRouteParam(
          req,
          "roadmapId"
        );

      const roadmap =
        await restoreRoadmap(

          userId,

          roadmapId

        );

      res.status(200).json({

        success: true,

        message:
          "Career roadmap restored successfully",

        data: roadmap,

      });

    } catch (error) {

      handleError(error, res);

    }

  };

// =====================================
// 9. DELETE ROADMAP
// =====================================

export const deleteRoadmapController =
  async (

    req: AuthenticatedRequest,

    res: Response

  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const roadmapId =
        getRouteParam(
          req,
          "roadmapId"
        );

      const result =
        await deleteRoadmap(

          userId,

          roadmapId

        );

      res.status(200).json({

        success: true,

        message: result.message,

        data: {

          roadmapId:
            result.roadmapId,

        },

      });

    } catch (error) {

      handleError(error, res);

    }

  };
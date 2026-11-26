// =====================================
// SKILL GAP TYPES
// =====================================

export type SkillGapPriority =
  | "critical"
  | "high"
  | "medium"
  | "low";

export type SkillImportance =
  | "required"
  | "preferred";

export interface SkillGapItem {
  skill: string;

  importance: SkillImportance;

  priority: SkillGapPriority;

  priorityScore: number;

  evidenceStatus: "not_evidenced";

  recommendation: string;
}

// =====================================
// SKILL GAP STATISTICS
// =====================================

export interface SkillGapStatistics {
  totalRequiredSkills: number;

  totalPreferredSkills: number;

  totalMatchedSkills: number;

  totalMissingSkills: number;

  missingRequiredSkills: number;

  missingPreferredSkills: number;

  criticalGaps: number;

  highPriorityGaps: number;

  mediumPriorityGaps: number;

  lowPriorityGaps: number;

  requiredSkillCoverage: number | null;

  preferredSkillCoverage: number | null;
}

// =====================================
// SKILL GAP REPORT
// =====================================

export interface SkillGapReport {
  jobMatchId: string;

  resumeId: string;

  jobTitle: string;

  companyName: string;

  overallCompatibility: number;

  statistics: SkillGapStatistics;

  skillGaps: SkillGapItem[];

  analysisVersion: string;

  generatedAt: string;
}

// =====================================
// ROADMAP CONFIGURATION TYPES
// =====================================

export type RoadmapDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

export type RoadmapStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "archived";

export type ActivityType =
  | "theory"
  | "practice"
  | "project"
  | "assessment"
  | "revision";

export type ResourceType =
  | "documentation"
  | "course"
  | "tutorial"
  | "book"
  | "practice";

// =====================================
// ROADMAP GENERATION REQUEST
// =====================================

export interface RoadmapRequest {
  jobMatchId: string;

  durationWeeks: number;

  hoursPerWeek: number;

  difficulty: RoadmapDifficulty;

  consent: boolean;
}

// =====================================
// LEARNING RESOURCES
// =====================================

export interface LearningResource {
  title: string;

  type: ResourceType;

  searchQuery: string;

  description: string;
}

// =====================================
// LEARNING ACTIVITY
// =====================================

export interface LearningActivity {
  title: string;

  description: string;

  type: ActivityType;

  estimatedHours: number;

  targetSkills: string[];

  expectedOutcome: string;

  resources: LearningResource[];
}

// =====================================
// WEEKLY MILESTONE
// =====================================

export interface WeeklyMilestone {
  week: number;

  title: string;

  objective: string;

  targetSkills: string[];

  activities: LearningActivity[];

  completionCriteria: string[];
}

// =====================================
// PRACTICAL PROJECT
// =====================================

export interface RoadmapProject {
  title: string;

  description: string;

  difficulty: RoadmapDifficulty;

  targetSkills: string[];

  deliverables: string[];

  estimatedHours: number;
}

// =====================================
// DEFERRED SKILL
// =====================================

export interface DeferredSkill {
  skill: string;

  reason: string;
}

// =====================================
// FINAL ASSESSMENT
// =====================================

export interface FinalAssessment {
  description: string;

  successCriteria: string[];
}

// =====================================
// AI GENERATED ROADMAP RESULT
// =====================================

export interface RoadmapResult {
  title: string;

  summary: string;

  learningObjectives: string[];

  coveredSkills: string[];

  deferredSkills: DeferredSkill[];

  milestones: WeeklyMilestone[];

  practicalProjects: RoadmapProject[];

  finalAssessment: FinalAssessment;

  recommendations: string[];
}

// =====================================
// ACTIVITY PROGRESS
// =====================================

export interface ActivityProgress {
  week: number;

  activityIndex: number;

  completed: boolean;

  completedAt: string | null;
}

export interface ActivityProgressRequest {
  week: number;

  activityIndex: number;

  completed: boolean;
}

// =====================================
// COMPLETE SAVED ROADMAP
// =====================================

export interface Roadmap {
  _id: string;

  userId: string;

  resumeId: string;

  jobMatchId: string;

  jobTitle: string;

  companyName: string;

  durationWeeks: number;

  hoursPerWeek: number;

  totalLearningHours: number;

  estimatedLearningHours: number;

  difficulty: RoadmapDifficulty;

  skillGaps: SkillGapItem[];

  result: RoadmapResult;

  status: RoadmapStatus;

  activityProgress: ActivityProgress[];

  totalActivities: number;

  completedActivities: number;

  progressPercentage: number;

  startedAt: string | null;

  completedAt: string | null;

  provider: "groq" | "gemini";

  modelUsed: string;

  promptVersion: string;

  skillGapAnalysisVersion: string;

  processingTime: number;

  createdAt: string;

  updatedAt: string;
}

// =====================================
// LIGHTWEIGHT ROADMAP SUMMARY
// =====================================

export type RoadmapSummary = Omit<
  Roadmap,
  "result" | "skillGaps" | "activityProgress"
>;

// =====================================
// PAGINATION
// =====================================

export interface RoadmapPagination {
  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

export interface RoadmapListResponse {
  roadmaps: RoadmapSummary[];

  pagination: RoadmapPagination;
}

// =====================================
// GENERIC API RESPONSE
// =====================================

export interface RoadmapApiResponse<T> {
  success: boolean;

  message?: string;

  data: T;
}
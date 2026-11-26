export interface Resume {
  _id: string;
  userId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  pageCount: number;
  status: "uploaded" | "processing" | "processed" | "failed";
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
  extractedText?: string;
}

export interface UploadedResume {
  id: string;
  originalName: string;
  fileSize: number;
  pageCount: number;
  status: string;
  createdAt: string;
}

export interface ResumeUploadResponse {
  success: boolean;
  message: string;
  data: UploadedResume;
}

export interface ResumeListResponse {
  success: boolean;
  count: number;
  data: Resume[];
}

export interface ResumeDetailsResponse {
  success: boolean;
  data: Resume;
}

export interface ResumeDeleteResponse {
  success: boolean;
  message: string;
}
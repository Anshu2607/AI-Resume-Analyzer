import mongoose from "mongoose";
import Resume from "../models/resume.model.js";
import { extractPDFText } from "./pdf.service.js";

export class ResumeError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ResumeError";
  }
}

// Upload and process resume
export const processResume = async (
  userId: string,
  file: Express.Multer.File
) => {
  let extracted;

  try {
    extracted = await extractPDFText(file.buffer);
  } catch {
    throw new ResumeError(
      "Unable to process PDF. Please upload a valid text-based PDF of up to 20 pages.",
      422
    );
  }

  const resume = await Resume.create({
    userId,
    originalName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size,
    extractedText: extracted.text,
    pageCount: extracted.pageCount,
    status: "processed",
  });

  return {
    id: resume._id.toString(),
    originalName: resume.originalName,
    fileSize: resume.fileSize,
    pageCount: resume.pageCount,
    status: resume.status,
    createdAt: resume.createdAt,
  };
};

// Get all resumes belonging to a user
export const getUserResumes = async (
  userId: string
) => {
  const resumes = await Resume.find({ userId })
    .sort({ createdAt: -1 })
    .select("-extractedText -__v")
    .lean();

  return resumes;
};

// Get a specific resume
export const getResumeById = async (
  userId: string,
  resumeId: string
) => {
  if (!mongoose.isValidObjectId(resumeId)) {
    throw new ResumeError("Invalid resume ID", 400);
  }

  const resume = await Resume.findOne({
    _id: resumeId,
    userId,
  })
    .select("+extractedText -__v")
    .lean();

  if (!resume) {
    throw new ResumeError("Resume not found", 404);
  }

  return resume;
};

// Delete a resume
export const deleteResume = async (
  userId: string,
  resumeId: string
) => {
  if (!mongoose.isValidObjectId(resumeId)) {
    throw new ResumeError("Invalid resume ID", 400);
  }

  const resume = await Resume.findOneAndDelete({
    _id: resumeId,
    userId,
  });

  if (!resume) {
    throw new ResumeError("Resume not found", 404);
  }

  return {
    id: resumeId,
    message: "Resume deleted successfully",
  };
};

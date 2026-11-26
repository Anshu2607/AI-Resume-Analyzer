import multer from "multer";

const storage = multer.memoryStorage();

export const uploadResume = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (_req, file, cb) => {
    const isPDF =
      file.mimetype === "application/pdf" &&
      file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPDF) {
      cb(new Error("Only PDF files are allowed"));
      return;
    }

    cb(null, true);
  },
}).single("resume");
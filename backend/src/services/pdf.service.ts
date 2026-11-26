import { PDFParse } from "pdf-parse";

export interface ExtractedPDF {
  text: string;
  pageCount: number;
}

export const extractPDFText = async (
  buffer: Buffer
): Promise<ExtractedPDF> => {

  // Validate actual PDF signature
  const signature = buffer.subarray(0, 5).toString();

  if (signature !== "%PDF-") {
    throw new Error("Invalid PDF file");
  }

  const parser = new PDFParse({
    data: new Uint8Array(buffer),
  });

  try {
    const info = await parser.getInfo();

    if (info.total > 20) {
      throw new Error("Resume must not exceed 20 pages");
    }

    const result = await parser.getText();

    // Normalize extracted text
    const cleanedText = result.text
      .replace(/\r\n/g, "\n")
      .replace(/\u0000/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!cleanedText || cleanedText.length < 30) {
      throw new Error(
        "Unable to extract sufficient text from the PDF"
      );
    }

    return {
      text: cleanedText,
      pageCount: result.total,
    };

  } finally {
    await parser.destroy();
  }
};
import {
  RecursiveCharacterTextSplitter,
} from "@langchain/textsplitters";

export interface DocumentChunk {
  chunkIndex: number;
  content: string;
  characterCount: number;
}

export const CHUNKING_VERSION = "1.0.0";

export const CHUNK_CONFIG = {
  chunkSize: 1000,
  chunkOverlap: 150,
} as const;

const textSplitter =
  new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_CONFIG.chunkSize,

    chunkOverlap: CHUNK_CONFIG.chunkOverlap,

    separators: [
      "\n\n",
      "\n",
      ". ",
      " ",
      "",
    ],
  });

// Split extracted document text into smaller chunks
export const chunkDocument = async (
  text: string
): Promise<DocumentChunk[]> => {

  const normalizedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!normalizedText) {
    throw new Error(
      "Document text cannot be empty"
    );
  }

  const chunks = await textSplitter.splitText(
    normalizedText
  );

  return chunks
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk, index) => ({
      chunkIndex: index,

      content: chunk,

      characterCount: chunk.length,
    }));
};
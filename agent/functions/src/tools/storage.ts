import path from "path";
import pdf from "pdf-parse";
import {readFile} from "fs/promises";

// ----------------------------------------- Storage Utilities
// For Storage file use
export async function extractTextFromRemotePdf(buffer: Buffer) {
    const data = await pdf(buffer);
    return data.text.replace(/\n/g, "");
}

// For Local file use
export async function extractTextFromPdf(filePath: string) {
    const pdfFile = path.resolve(filePath);
    const dataBuffer = await readFile(pdfFile);
    const data = await pdf(dataBuffer);
    return {
        content: data.text.replace(/\n/g, ""),
        title: "This is a default article title for testing.",
    };
}

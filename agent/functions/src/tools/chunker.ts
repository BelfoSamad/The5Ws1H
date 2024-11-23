import {GoogleGenerativeAI} from "@google/generative-ai";
import {chunk} from "llm-chunk";

// ----------------------------------------- Configurations
let characterPerToken = 4;
// based on testings, chunks should be 2000 tokens or 25% of the doc (whichever is shorter)
let chunkLengthTokens = 2000;
let overlapTokens = 25; // based on testings, overlap should be the average token count of a sentece (25 tokens)
const minChunkLength = 25 + overlapTokens * 2; // any smaller text shouldn"t be further chuncked


export async function getChuckedDocuments(fullText: string, model: string, debug: boolean): Promise<string[]> {
    // ------------------------ Preparations
    const charCount = fullText.length;
    const wordCount = fullText.split(" ").length; // Rough Estimate
    const tokenCount = await calculateToken(fullText, model);
    characterPerToken = charCount / tokenCount; // to be used to convert token into character

    if (debug) {
        console.log("DEBUG: estimated character count = " + charCount);
        console.log("DEBUG: estimated word count = " + wordCount);
        console.log("DEBUG: estimated token count = " + tokenCount);
        console.log("DEBUG: estimated token per character = " + characterPerToken);
    }

    // ------------------------ Chuncking Configuration
    // Don"t chunck tiny texts
    if (tokenCount <= minChunkLength) {
        if (debug) console.log("Text is too small to be chuncked");
        return [fullText];
    }

    // Resize Chunks, (for articles, most of the time 25% of the document would be smaller than 2000 tokens)
    chunkLengthTokens = Math.trunc(tokenCount / 4);
    // recalculate overlap token based on new size
    overlapTokens = Math.trunc((overlapTokens / chunkLengthTokens) * (tokenCount / 4));

    // llm-chunk uses character instead of tokens, convert before using in chuncker
    const chunkingConfig = {
        minLength: minChunkLength * characterPerToken,
        maxLength: chunkLengthTokens * characterPerToken,
        overlap: overlapTokens * characterPerToken,
        splitter: "sentence",
        delimiters: "",
    } as any;

    if (debug) {
        console.log("DEBUG: Chunk Min Length = " + chunkingConfig.minLength);
        console.log("DEBUG: Chunk Max Length = " + chunkingConfig.maxLength);
        console.log("DEBUG: Chunk Overlap Length = " + chunkingConfig.overlap);
    }

    return chunk(fullText, chunkingConfig);
}

async function calculateToken(text: string, model: string): Promise<number> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    return (await genAI.getGenerativeModel({model: model}).countTokens(text)).totalTokens;
}

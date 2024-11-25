import {genkit} from "genkit";
import {
    gemini15Flash,
    googleAI,
    textEmbeddingGecko001,
} from "@genkit-ai/googleai";
import {defineFirestoreRetriever} from "@genkit-ai/firebase";
import {applicationDefault, initializeApp} from "firebase-admin/app";
import {firebaseAuth} from "@genkit-ai/firebase/auth";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {onFlow} from "@genkit-ai/firebase/functions";
import {defineSecret} from "firebase-functions/params";
import {
    addArticle,
    getArticle,
    getUser,
    setArticleIndexed,
    updateArticle,
    updateCredit,
} from "./tools/firestore";
import {getChuckedDocuments} from "./tools/chunker";
import {getContentFromUrl} from "./tools/pdf";
import * as z from "zod";
import {credential} from "firebase-admin";
import {startFlowsServer} from "@genkit-ai/flow";
import {extractTextFromPdf} from "./tools/storage";
import {config} from "dotenv";

// Keys
const googleAiApiKey = defineSecret("GOOGLE_GENAI_API_KEY");

// ----------------------------------------- Initializations
const debug = false;
const app = initializeApp({credential: debug ? credential.cert("./firebase-creds.json") : applicationDefault()});
const firestore = getFirestore(app);
if (debug) {
    firestore.settings({
        host: "localhost",
        port: 8080,
        ssl: false,
    });
}
const indexConfig = {
    contentField: "text",
    vectorField: "embedding",
    embedder: textEmbeddingGecko001,
};

// ----------------------------------------- Configurations
if (debug) config();
const ai = genkit({
    promptDir: "./prompts",
    plugins: [
        debug ? googleAI({apiKey: process.env.GENAI_API_KEY}) : googleAI(),
    ],
});

// ----------------------------------------- Flows
export const summarizeArticleFlow = debug ? ai.defineFlow(
    {
        name: "summarizeArticleFlow",
        inputSchema: z.object({
            userId: z.string(),
            url: z.string(),
        }),
        outputSchema: z.object({
            articleId: z.string(),
            createdAt: z.date(),
            summary: z.map(z.string(), z.string()),
        }),
    },
    doSummarizeArticleFlow,
) : onFlow(
    ai,
    {
        name: "summarizeArticleFlow",
        httpsOptions: {
            secrets: [googleAiApiKey],
            cors: true,
        },
        inputSchema: z.object({
            userId: z.string(),
            url: z.string(),
        }),
        outputSchema: z.object({
            articleId: z.string(),
            createdAt: z.date(),
            summary: z.map(z.string(), z.string()),
        }),
        authPolicy: firebaseAuth((user) => {
            if (!user) throw Error("ERROR::AUTH");
        }),
    },
    doSummarizeArticleFlow,
);

async function doSummarizeArticleFlow(input: { userId: string, url: string }) {
    const user = await getUser(firestore, input.userId);
    // ------------------------ Get Article
    const article = debug ? await extractTextFromPdf("article.pdf") : await getContentFromUrl(input.url);

    if (user!.credit == 0) throw Error("ERROR::CREDIT");
    else {
        // ------------------------ Summarize Article
        const summarizeArticlePrompt = ai.prompt("summarize_article");
        const result = (await summarizeArticlePrompt({input: {article: article.content}})).output();

        // return error if failure
        if (result.error != null) throw Error(result.error);

        // ------------------------ Save Summary
        const createdAt = new Date();
        const articleId = await addArticle(
            firestore,
            article.title,
            input.url,
            result,
            createdAt,
        );

        // Update Credit
        await updateCredit(firestore, input.userId, user!.credit - 1);

        // Return Article
        return {
            articleId: articleId,
            title: article.title,
            summary: result.summary,
            createdAt: createdAt,
        };
    }
}

export const indexArticleFlow = debug ? ai.defineFlow(
    {
        name: "indexArticleFlow",
        inputSchema: z.object({
            articleId: z.string(),
        }),
        outputSchema: z.string(),
    },
    doIndexArticleFlow
) : onFlow(
    ai,
    {
        name: "indexArticleFlow",
        httpsOptions: {
            secrets: [googleAiApiKey],
            cors: true,
        },
        inputSchema: z.object({
            articleId: z.string(),
        }),
        outputSchema: z.string(),
        authPolicy: firebaseAuth((user) => {
            if (!user) throw Error("ERROR::AUTH");
        }),
    },
    doIndexArticleFlow,
);

async function doIndexArticleFlow(input: { articleId: string }) {
    // ------------------------ Extract More Content
    // get article's identifierId
    const article = await getArticle(firestore, input.articleId);
    const content = debug ? await extractTextFromPdf("article.pdf") : await getContentFromUrl(article!.url);

    // chunk and prepare documents
    const chunks = await getChuckedDocuments(
        content.content,
        gemini15Flash.name.replace("googleai/", ""),
        debug,
    );

    // ------------------------ Index Content
    for (const text of chunks) {
        const embedding = await ai.embed({
            embedder: indexConfig.embedder,
            content: text,
        });
        await firestore.collection(`articles/${input.articleId}/index`).add({
            [indexConfig.vectorField]: FieldValue.vector(embedding),
            [indexConfig.contentField]: text,
        });
    }

    // update database (Article is now indexed)
    await setArticleIndexed(firestore, input.articleId);

    return "DONE"; // response only to avoid Error: Response is missing data field.
}

export const expandOnArticleFlow = debug ? ai.defineFlow(
    {
        name: "expandOnArticleFlow",
        inputSchema: z.object({
            articleId: z.string(),
            query: z.string(),
        }),
        outputSchema: z.string(),
    },
    doExpandOnArticleFlow,
) : onFlow(
    ai,
    {
        name: "expandOnArticleFlow",
        httpsOptions: {
            secrets: [googleAiApiKey],
            cors: true,
        },
        inputSchema: z.object({
            articleId: z.string(),
            query: z.string(),
        }),
        outputSchema: z.string(),
        authPolicy: firebaseAuth((user) => {
            if (!user) throw Error("ERROR::AUTH");
        }),
    },
    doExpandOnArticleFlow,
);

async function doExpandOnArticleFlow(input: { articleId: string, query: string }) {
    // ------------------------ Ask Question
    const articleRetrieverRef = defineFirestoreRetriever(ai, {
        name: "articleRetriever",
        firestore: firestore,
        collection: `articles/${input.articleId}/index`,
        contentField: "text",
        vectorField: "embedding",
        embedder: textEmbeddingGecko001,
        distanceMeasure: "COSINE", // "EUCLIDEAN", "DOT_PRODUCT", or "COSINE" (default)
    });

    // retrieve extra context
    const context = await ai.retrieve({
        retriever: articleRetrieverRef,
        query: input.query,
        options: {limit: 3},
    });

    // ask question w/ context
    const askQuestionPrompt = ai.prompt("ask_question");
    const result = (
        await askQuestionPrompt({input: {query: input.query}, context: context})
    ).output();

    // return error if failure
    if (result.error != null) throw Error(result.error);

    // ------------------------ Save Question/Answer
    await updateArticle(
        firestore,
        input.articleId,
        input.query,
        result.answer,
    );

    // Return Answer
    return result.answer;
}

// ----------------------------------------- Start
if (debug) startFlowsServer();

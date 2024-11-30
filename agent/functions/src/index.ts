import {z, genkit} from "genkit";
import {logger} from "genkit/logging";
import {applicationDefault, initializeApp} from "firebase-admin/app";
import {firebaseAuth} from "@genkit-ai/firebase/auth";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {defineSecret} from "firebase-functions/params";
import {addArticle, getArticle, setArticleHistory, setArticleIndexed, updateArticle} from "./tools/firestore";
import {getContentFromUrl} from "./tools/pdf";
import {credential} from "firebase-admin";
import {extractTextFromPdf} from "./tools/storage";
import {config} from "dotenv";
import {onFlow} from "@genkit-ai/firebase/functions";
import {gemini15Flash, googleAI, textEmbeddingGecko001} from "@genkit-ai/googleai";
import {defineFirestoreRetriever} from "@genkit-ai/firebase";
import {getChuckedDocuments} from "./tools/chuncker";

// ----------------------------------------- Initializations
const debug = false;
const app = initializeApp({credential: debug ? credential.cert("./firebase-creds.json") : applicationDefault()});
const firestore = getFirestore(app);

// ----------------------------------------- Configurations
if (debug) config();
const ai = genkit({
    plugins: [
        debug ? googleAI({apiKey: process.env.GENAI_API_KEY}) : googleAI(),
    ],
});
logger.setLogLevel(debug ? "debug" : "info");

// Keys
const googleAiApiKey = defineSecret("GOOGLE_GENAI_API_KEY");

// ----------------------------------------- RAG Declarations
const indexConfig = {
    contentField: "text",
    vectorField: "embedding",
    embedder: textEmbeddingGecko001,
};
const articleRetrieverRef = defineFirestoreRetriever(ai, {
    name: "articleRetriever",
    firestore: firestore,
    collection: "articles",
    contentField: "text",
    vectorField: "embedding",
    embedder: textEmbeddingGecko001,
    distanceMeasure: "COSINE", // "EUCLIDEAN", "DOT_PRODUCT", or "COSINE" (default)
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
            createdAt: z.string(),
            summary: z.any(),
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
            createdAt: z.string(),
            summary: z.any(),
        }),
        authPolicy: firebaseAuth((user) => {
            if (!user) throw Error("ERROR::AUTH");
        }),
    },
    doSummarizeArticleFlow,
);

async function doSummarizeArticleFlow(input: {userId: string, url: string}) {
    // ------------------------ Get Article
    const article = debug ? await extractTextFromPdf("article.pdf") : await getContentFromUrl(input.url);

    // ------------------------ Summarize Article
    const summarizeArticlePrompt = ai.prompt("summarize_article");
    const result = (await summarizeArticlePrompt({article: article.content})).output;

    // return error if failure
    if (result.error != "") throw Error(result.error);

    // ------------------------ Save Summary
    const createdAt = new Date();
    const articleId = await addArticle(
        firestore,
        article.title,
        input.url,
        result.summary,
        createdAt,
    );

    // Set Article as History
    setArticleHistory(firestore, input.userId, articleId);

    // Return Article
    return {
        articleId: articleId,
        title: article.title,
        summary: result.summary,
        createdAt: createdAt.toDateString(),
    };
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

async function doIndexArticleFlow(input: {articleId: string}) {
    // ------------------------ Extract More Content
    // get article's identifierId
    const article = await getArticle(firestore, input.articleId);
    if (article) {
        const content = debug ? await extractTextFromPdf("article.pdf") : await getContentFromUrl(article.url);

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
        setArticleIndexed(firestore, input.articleId);

        return "DONE"; // response only to avoid Error: Response is missing data field.
    } else return "ERROR";
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

async function doExpandOnArticleFlow(input: {articleId: string, query: string}) {
    // ------------------------ Ask Question
    // retrieve extra context
    const context = await ai.retrieve({
        retriever: articleRetrieverRef,
        query: input.query,
        options: {
            limit: 3,
            collection: `articles/${input.articleId}/index`,
        },
    });

    // ask question w/ context
    const askQuestionPrompt = ai.prompt("ask_question");
    const result = (await askQuestionPrompt({query: input.query}, {docs: context})).output;

    // return error if failure
    if (result.answer == "Error::NO_CONTEXT") {
        throw Error("Error: There no enough context to respond to your question.");
    }

    // ------------------------ Save Question/Answer
    updateArticle(
        firestore,
        input.articleId,
        input.query,
        result.answer,
    );

    // Return Answer
    return result.answer;
}

// ----------------------------------------- Start
const flows = [summarizeArticleFlow, indexArticleFlow, expandOnArticleFlow];
if (debug) ai.startFlowServer({flows});

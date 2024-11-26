import {z, genkit} from 'genkit';
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
    setArticleIndexed,
    updateArticle,
} from "./tools/firestore";
import {getChuckedDocuments} from "./tools/chunker";
import {getContentFromUrl} from "./tools/pdf";
import {credential} from "firebase-admin";
import {extractTextFromPdf} from "./tools/storage";
import {config} from "dotenv";

// Keys
const googleAiApiKey = defineSecret("GOOGLE_GENAI_API_KEY");

// ----------------------------------------- Initializations
const debug = true;
const app = initializeApp({credential: debug ? credential.cert("./firebase-creds.json") : applicationDefault()});
const firestore = getFirestore(app);
/*if (debug) {
    firestore.settings({
        host: "localhost",
        port: 8080,
        ssl: false,
    });
}*/
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

// ----------------------------------------- Schemas
export const SummarySchema = ai.defineSchema(
    "Summary",
    z.object({
        what: z.string().describe("Briefly state the primary event or topic covered by the article.").optional(),
        who: z.string().describe("Identify the key people, organizations, or entities involved in \"what\" happened.").optional(),
        where: z.string().describe("Specify the location where the event or topic is centered.").optional(),
        when: z.string().describe("Mention the time or date relevant to the topic.").optional(),
        why: z.string().describe("Explain the reason or cause behind the event or topic.").optional(),
        how: z.string().describe("Describe how the event occurred or how the situation developed.").optional(),
    }),
)
export const ArticleSchema = ai.defineSchema(
    "Article",
    z.object({
        error: z.string().optional(),
        summary: SummarySchema.optional(),
    })
);

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
            summary: SummarySchema,
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
            summary: SummarySchema,
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
    const summarizeArticlePrompt = ai.prompt<z.ZodTypeAny, typeof ArticleSchema, z.ZodTypeAny>("summarize_article");
    const result = (await summarizeArticlePrompt({article: article.content})).output!;

    // return error if failure, if result is not of type Summary
    if (!SummarySchema.safeParse(result).success) throw Error(result.error);

    // ------------------------ Save Summary
    const createdAt = new Date();
    const articleId = await addArticle(
        firestore,
        article.title,
        input.url,
        result as z.infer<typeof SummarySchema>,
        createdAt,
    );

    // Return Article
    return {
        articleId: articleId,
        title: article.title,
        summary: result as z.infer<typeof SummarySchema>,
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

async function doExpandOnArticleFlow(input: {articleId: string, query: string}) {
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
        await askQuestionPrompt({query: input.query}, {config: {context: context}})
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
const flows = [summarizeArticleFlow, indexArticleFlow, expandOnArticleFlow]
if (debug) ai.startFlowServer({flows});

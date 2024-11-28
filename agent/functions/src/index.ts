import {z, genkit} from "genkit";
import {logger} from "genkit/logging";
import {applicationDefault, initializeApp} from "firebase-admin/app";
import {firebaseAuth} from "@genkit-ai/firebase/auth";
import {getFirestore} from "firebase-admin/firestore";
import {defineSecret} from "firebase-functions/params";
import {addArticle, setArticleHistory} from "./tools/firestore";
import {getContentFromUrl} from "./tools/pdf";
import {credential} from "firebase-admin";
import {extractTextFromPdf} from "./tools/storage";
import {config} from "dotenv";
import {onFlow} from "@genkit-ai/firebase/functions";
import {googleAI} from "@genkit-ai/googleai";

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

async function doSummarizeArticleFlow(input: any) {
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
        result,
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

// ----------------------------------------- Start
const flows = [summarizeArticleFlow];
if (debug) ai.startFlowServer({flows});

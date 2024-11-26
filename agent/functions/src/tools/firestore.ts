import {Firestore} from "firebase-admin/firestore";
import { SummarySchema } from "../index";
import {z} from "genkit";

// ----------------------------------------- Firestore Utilities
export async function getArticle(firestore: Firestore, articleId: string) {
    return (await firestore.collection("articles").doc(articleId).get()).data();
}

export async function setArticleIndexed(firestore: Firestore, articleId: string) {
    await firestore.collection("articles").doc(articleId).update({
        indexed: true,
    });
}

export async function addArticle(
    firestore: Firestore,
    title: string,
    url: string,
    result: z.infer<typeof SummarySchema>,
    on: Date
): Promise<string> {
    return (await firestore.collection("articles").add({
        url: url,
        title: title,
        createdAt: on,
        indexed: false,
        summary: result,
    })).id;
}

export async function updateArticle(
    firestore: Firestore,
    articleId: string,
    query: string,
    answer: string
) {
    await firestore.collection("articles").doc(articleId).collection("questions").add({
        question: query,
        answer: answer,
        createdAt: new Date(),
    });
}

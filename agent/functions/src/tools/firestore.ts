import {Firestore} from "firebase-admin/firestore";

// ----------------------------------------- Firestore Utilities
export async function getUser(firestore: Firestore, userId: string) {
    return (await firestore.collection("users").doc(userId).get()).data();
}

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
    result: {
        error?: string,
        summary?: { what?: string, who?: string, why?: string, where?: string, when?: string, how?: string }
    },
    on: Date
): Promise<string> {
    return (await firestore.collection("articles").add({
        url: url,
        title: title,
        createdAt: on,
        indexed: false,
        summary: result.summary,
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

export async function updateCredit(
    firestore: Firestore,
    userId: string,
    credit: number
) {
    await firestore.collection("users").doc(userId).update({credit: credit});
}

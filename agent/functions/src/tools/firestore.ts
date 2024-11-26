import {Firestore} from "firebase-admin/firestore";

// ----------------------------------------- Firestore Utilities
export async function getArticle(firestore: Firestore, articleId: string) {
    return (await firestore.collection("articles").doc(articleId).get()).data();
}

export async function setArticleIndexed(firestore: Firestore, articleId: string) {
    firestore.collection("articles").doc(articleId).update({
        indexed: true,
    });
}

export async function addArticle(
    firestore: Firestore,
    title: string,
    url: string,
    result: any,
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
    firestore.collection("articles").doc(articleId).collection("questions").add({
        question: query,
        answer: answer,
        createdAt: new Date(),
    });
}

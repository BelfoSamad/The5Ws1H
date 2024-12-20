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
    summary: {
        what: string,
        who: string[],
        where: string[],
        when: string,
        why: string,
        how: string
    },
    on: Date
): Promise<string> {
    return (await firestore.collection("articles").add({
        url: url,
        title: title,
        createdAt: on,
        summary: summary,
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

export async function setArticleHistory(firestore: Firestore, userId: string, articleId: string) {
    const user = (await firestore.collection("users").doc(userId).get()).data();
    let articleIds = user?.articleIds;
    if (articleIds == null) articleIds = [articleId];
    else articleIds.push(articleId);
    firestore.collection("users").doc(userId).update({articleIds: articleIds});
}

import {Firestore} from "firebase-admin/firestore";

// ----------------------------------------- Firestore Utilities
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

export async function setArticleHistory(firestore: Firestore, userId: string, articleId: string) {
    const user = (await firestore.collection("users").doc(userId).get()).data();
    let articleIds = user?.articleIds;
    if (articleIds == null) articleIds = [articleId];
    else articleIds.push(articleId);
    firestore.collection("users").doc(userId).update({articleIds: articleIds});
}

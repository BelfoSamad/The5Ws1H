import {app} from '../configs';
import {getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword} from 'firebase/auth/web-extension';
import {getFirestore, getDocs, setDoc, doc, query, collection, where, orderBy} from 'firebase/firestore';
import {getFunctions, httpsCallable} from 'firebase/functions';

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// listen to auth state
auth.onAuthStateChanged((user) => {
    chrome.runtime.sendMessage({target: "background", action: "userIn", isLoggedIn: user != null});
});

// Listen for messages from sidepanel & background service worker
chrome.runtime.onMessage.addListener(handleChromeMessages);
function handleChromeMessages(message, _sender, sendResponse) {
    if (message.target == "offscreen") switch (message.action) {
        //--------------------------- Authentication
        case "register":
            (async () => {
                try {
                    let userCreds = await createUserWithEmailAndPassword(auth, message.email, message.password);
                    await setDoc(doc(db, "users", userCreds.user.uid), {});
                    sendResponse({done: true});
                } catch (e) {
                    sendResponse({done: false, error: e.message});
                }
            })();
            return true;
        case "login":
            (async () => {
                try {
                    let userCreds = await signInWithEmailAndPassword(auth, message.email, message.password);
                    getDoc(doc(db, "users", userCreds.user.uid)).then(async querySnapshot => {
                        if (querySnapshot.exists()) chrome.storage.local.set({articleIds: JSON.stringify(querySnapshot.data()['articleIds'])});
                        sendResponse({done: true});
                    });
                } catch (e) {
                    sendResponse({done: false, error: e.message});
                }
            })();
            return true;
        case "isLoggedIn":
            sendResponse({isLoggedIn: auth.currentUser != null});
            break;
        case "logout":
            auth.signOut();
            break;
        //--------------------------- Summarizer
        case "summarize":
            (async () => {
                try {
                    const url = message.url
                    await getDocs(query(collection(db, "articles"), where("url", "==", url))).then(async querySnapshot => {
                        if (querySnapshot.empty) {
                            const summarizeArticle = httpsCallable(functions, 'summarizeArticleFlow');
                            summarizeArticle({url: url, userId: ""}).then(res => {
                                const result = res.data;
                                const article = {
                                    articleId: result.articleId,
                                    title: result.title,
                                    createdAt: result.createdAt,
                                    url: url,
                                    indexed: false,
                                    summary: result.summary,
                                    expansion: undefined
                                };
                                sendResponse({error: null, article: article});
                            }).catch(e => {
                                sendResponse({error: e.message, article: null});
                            });
                        } else {
                            const snapshot = querySnapshot.docs[0]
                            const articleData = snapshot.data()
                            const questionsQuery = query(collection(db, `articles/${snapshot.id}/questions`), orderBy("createdAt", "asc"))
                            const article = {
                                articleId: snapshot.id,
                                url: articleData['url'],
                                title: articleData['title'],
                                createdAt: articleData['createdAt'].toDate(),
                                indexed: articleData['indexed'],
                                summary: articleData['summary'],
                                expansion: (await getDocs(questionsQuery)).docs.map(exp => {
                                    return {
                                        question: exp.data()['question'],
                                        answer: exp.data()['answer']
                                    }
                                })
                            };
                            sendResponse({error: null, article: article});
                        }
                    });
                } catch (e) {
                    sendResponse({error: e.message, article: null});
                }
            })();
            return true;
        case "history":
            (async () => {
                try {
                    getDocs(query(collection(db, "articles"), where("__name__", "in", articleIds))).then(async querySnapshot => {
                        let articles = []
                        for (const snapshot of querySnapshot.docs) {
                            const articleData = snapshot.data()
                            const questionsQuery = query(collection(db, `articles/${snapshot.id}/questions`), orderBy("createdAt", "asc"))
                            articles.push({
                                articleId: snapshot.id,
                                url: articleData['url'],
                                title: articleData['title'],
                                createdAt: articleData['createdAt'].toDate(),
                                indexed: articleData['indexed'],
                                summary: articleData['summary'],
                                expansion: (await getDocs(questionsQuery)).docs.map(exp => {
                                    return {
                                        question: exp.data()['question'],
                                        answer: exp.data()['answer']
                                    }
                                })
                            })
                        }
                        sendResponse({error: null, articles: articles})
                    });
                } catch (e) {
                    sendResponse({error: e.message, article: null});
                }
            })();
            return true;
        case "index":
            const indexArticle = httpsCallable(this.functions, 'indexArticleFlow');
            indexArticle({articleId: message.articleId}).then(_res => {sendResponse({done: true})})
            return true;
        case "expand":
            const askQuestion = httpsCallable(this.functions, 'expandOnArticleFlow');
            askQuestion({articleId: message.articleId, query: message.query}).then(res => {sendResponse({answer: res.data})})
            return true;
    }
}
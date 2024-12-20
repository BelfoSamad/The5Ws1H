import {app} from '../configs';
import {getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword} from 'firebase/auth/web-extension';
import {getFirestore, getDoc, getDocs, setDoc, doc, query, collection, where} from 'firebase/firestore';
import {getFunctions, httpsCallable} from 'firebase/functions';
import {Readability} from "@mozilla/readability";

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
                        sendResponse({done: true, articleIds: querySnapshot.exists() ? querySnapshot.data()['articleIds'] : []});
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
                                    summary: result.summary
                                };
                                sendResponse({error: null, article: article});
                            }).catch(e => {
                                sendResponse({error: e.message, article: null});
                            });
                        } else {
                            const snapshot = querySnapshot.docs[0]
                            const articleData = snapshot.data()
                            const article = {
                                articleId: snapshot.id,
                                url: articleData['url'],
                                title: articleData['title'],
                                createdAt: articleData['createdAt'].toDate(),
                                summary: articleData['summary']
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
                    const articleIds = message.articleIds;
                    getDocs(query(collection(db, "articles"), where("__name__", "in", articleIds))).then(async querySnapshot => {
                        let articles = []
                        for (const snapshot of querySnapshot.docs) {
                            const articleData = snapshot.data()
                            articles.push({
                                articleId: snapshot.id,
                                url: articleData['url'],
                                title: articleData['title'],
                                createdAt: articleData['createdAt'].toDate(),
                                summary: articleData['summary']
                            })
                        }
                        sendResponse({error: null, articles: articles})
                    });
                } catch (e) {
                    sendResponse({error: e.message, article: null});
                }
            })();
            return true;
        //--------------------------- In-Device Tools
        case "summarizer_available":
            (async () => {
                if (self?.ai?.summarizer == null) sendResponse({available: false});
                else {
                    const canSummarize = await self.ai.summarizer.capabilities();
                    if (canSummarize.available === 'no') sendResponse({available: false});
                    else sendResponse({available: true});
                }
            })();
            return true;
        case "translator_available":
            (async () => {sendResponse({available: self?.ai?.translator != null});})();
            return true;
        case "summarizer":
            (async () => {
                // Prepare Text Content
                const parser = new DOMParser();
                const doc = parser.parseFromString(message.html, 'text/html');
                const reader = new Readability(doc);
                const article = reader?.parse()?.textContent;

                // Summarize
                if (article != null) {
                    const summarization = await generateSummary(article, message.type, message.length);
                    sendResponse(summarization);
                } else sendResponse(null);
            })()
            return true;
        case "translator":
            (async () => {
                const translation = await translateText(message.text, message.language);
                sendResponse(translation);
            })()
            return true;
    }
}

//------------------------------- Translation
export async function translateText(text, targetLanguage) {
    try {
        const session = await createTranslator(targetLanguage);
        const translation = await session.translate(text);
        session.destroy();
        return translation;
    } catch (e) {
        return null;
    }
}

async function createTranslator(targetLanguage) {
    if (!self.ai || !self.ai.translator) {
        throw new Error('AI Translation is not supported in this browser');
    }

    return await self.ai.translator.create({
        sourceLanguage: "en",
        targetLanguage: targetLanguage,
    });
}

//------------------------------- Summarization
export async function generateSummary(article, type, length) {
    try {
        const session = await createSummarizer(
            {
                type: type, //tl;dr, teaser, headline
                format: "plain-text",
                length: length //short, medium, long
            },
            (message, progress) => {
                console.log(`${message} (${progress.loaded}/${progress.total})`);
            }
        );
        const summary = await session.summarize(article);
        session.destroy();
        return summary;
    } catch (e) {
        console.error(e);
        return null;
    }
}

async function createSummarizer(config, downloadProgressCallback) {
    if (!self.ai || !self.ai.summarizer) {
        throw new Error('AI Summarization is not supported in this browser');
    }
    const canSummarize = await self.ai.summarizer.capabilities();
    if (canSummarize.available === 'no') {
        throw new Error('AI Summarization is not supported');
    }
    const summarizationSession = await self.ai.summarizer.create(
        config,
        downloadProgressCallback
    );
    if (canSummarize.available === 'after-download') {
        summarizationSession.addEventListener(
            'downloadprogress',
            downloadProgressCallback
        );
        await summarizationSession.ready;
    }
    return summarizationSession;
}
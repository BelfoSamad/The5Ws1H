import {app, defaults} from '../configs';
import {getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword} from 'firebase/auth/web-extension';
import {getFirestore, getDoc, setDoc, doc} from 'firebase/firestore';
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
                    await setDoc(doc(db, "users", userCreds.user.uid), defaults);
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
    }
}
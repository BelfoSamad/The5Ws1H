import {sendUrl, sendResult, startAnimations, summarizeArticle, stopAnimations} from "./utilities";

//------------------------------- Declarations
let creating; // A global promise to avoid concurrency issues
let activeTabId = -1;
const tabArticles = new Map();
const tabUrls = new Map();

//------------------------------- Starting
setupOffscreenDocument("./offscreen/offscreen.html");
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick: true}).catch((error) => console.error(error));
chrome.runtime.onMessage.addListener((message) => {
    if (message.target == "background") {
        switch (message.action) {
            case "init":
                sendResult({article: tabArticles.get(activeTabId)});
                sendUrl(tabUrls.get(activeTabId));
                break;
            case "summarize":
                // get active tab's URL (RODO: Remove this check, receive URL here)
                chrome.tabs.query({active: true, currentWindow: true}, (activeTabs) => {
                    const activeTab = activeTabs[0];

                    // start animations
                    startAnimations(activeTab.id);

                    // summarize article
                    const result = summarizeArticle(activeTab.url);
                    sendResult(result);

                    // set locally
                    if (result.error == null) tabArticles.set(activeTabId, result.article);

                    // stop animations
                    stopAnimations(activeTab.id);
                });
                break;
        }
    }
});

//------------------------------- Tab Handling
chrome.webNavigation.onCompleted.addListener(async (details) => {
    // Send url to sidepanel
    if (details.frameId === 0) {
        tabUrls.set(activeTabId, details.url);
        sendUrl(details.url);
    }
});
chrome.tabs.onRemoved.addListener((tabId, _removeInfo) => {
    tabs.delete(tabId);
});
chrome.tabs.onActivated.addListener((activeInfo) => {
    activeTabId = activeInfo.tabId;// update activeTabId
    // send article/url to sidepanel
    sendResult({article: tabArticles.get(activeTabId)});
    sendUrl(tabUrls.get(activeTabId));
});

//------------------------------- Handle Offscreen Documents
async function setupOffscreenDocument(path) {
    // Check if there is offscreen document with the given path
    const offscreenUrl = chrome.runtime.getURL(path);
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
        return;
    }

    // create offscreen document
    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['DOM_SCRAPING'],
            justification: 'this document is used to communicate with firebase (Auth, Firestore, Functions)',
        });
        await creating;
        creating = null;
    }
}
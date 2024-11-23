import {sendArticle, startAnimations, stopAnimations} from "./utilities";

//------------------------------- Declarations
let creating; // A global promise to avoid concurrency issues
let activeTabId = -1;
const tabs = new Map();

//------------------------------- Starting
setupOffscreenDocument("./offscreen/index.html");
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick: true}).catch((error) => console.error(error));
chrome.runtime.onMessage.addListener((message) => {
    if (message.target == "background") {
        switch (message.action) {
            case "summarize":
                // get active tab's URL (RODO: Remove this check, receive URL here)
                chrome.tabs.query({active: true, currentWindow: true}, (activeTabs) => {
                    const activeTab = activeTabs[0];

                    // start animations
                    startAnimations(activeTab.id);

                    // summarize article
                    const result = summarizeArticle(activeTab.url);
                    if (result.error != null) sendError(result.error);
                    else {
                        tabs.set(activeTabId, result.article); // set locally
                        sendArticle(result.article);
                    }

                    // stop animations
                    stopAnimations(activeTab.id);
                });
                break;
        }
    }
});

//------------------------------- Tab Handling
chrome.webNavigation.onCompleted.addListener(async (details) => {
    if (details.frameId === 0) {
        //TODO: Send URL to Sidepanel
    }
});
chrome.tabs.onRemoved.addListener((tabId, _removeInfo) => {
    tabs.delete(tabId);
});
chrome.tabs.onActivated.addListener((activeInfo) => {
    activeTabId = activeInfo.tabId;// update activeTabId
    // send article to sidepanel
    sendArticle(tabs.get(activeTabId));
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
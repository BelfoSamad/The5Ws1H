import {sendTabDetails, sendTabError, startAnimations, summarizeArticle, stopAnimations} from "./utilities";

//------------------------------- Declarations
let creating; // A global promise to avoid concurrency issues
let activeTabId = -1;
const tabs = new Map();

//------------------------------- Starting
setupOffscreenDocument("./offscreen/offscreen.html");
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick: true}).catch((error) => console.error(error));
chrome.runtime.onMessage.addListener(async (message) => {
    if (message.target == "background") {
        switch (message.action) {
            case "init":
                sendTabDetails(tabs.get(activeTabId));
                break;
            case "summarize":
                const summaryTabId = activeTabId; // save tab id since it might change

                // start animations
                startAnimations(activeTabId);
                // start on siepanel
                tabs.set(summaryTabId, {...tabs.get(activeTabId), isLoading: true});
                sendTabDetails(tabs.get(summaryTabId));

                // summarize article
                const result = await summarizeArticle(message.url);

                // tab might be removed, check first if still exists then apply changes
                if (tabs.has(summaryTabId)) {
                    // an error caught send Error to Sidepanel
                    if (result.error != null) sendTabError(result.error);
                    else {
                        // set locally
                        tabs.set(summaryTabId, {
                            article: result.article,
                            url: tabs.get(activeTabId)?.url,
                            title: tabs.get(activeTabId)?.title,
                            isLoading: false
                        });
                        // send back only if we are still in the same tab
                        if (summaryTabId == activeTabId) sendTabDetails(tabs.get(activeTabId));
                    }

                    // stop animations
                    stopAnimations(summaryTabId);
                }
                break;
        }
    }
});

//------------------------------- Tab Handling
chrome.webNavigation.onCompleted.addListener(async (details) => {
    // Send url to sidepanel
    if (details.frameId === 0) {
        if (details.url.startsWith("chrome://")) {
            // chrome related tab, don't allow summarization
            tabs.set(activeTabId, {
                url: null,
                title: null
            });
            sendTabDetails(tabs.get(activeTabId));
        } else {
            // query current tab from title
            chrome.tabs.query({active: true, currentWindow: true}, function (queryTabs) {
                tabs.set(activeTabId, {
                    url: details.url,
                    title: queryTabs[0].title
                });
                sendTabDetails(tabs.get(activeTabId));
            });
        }
    }
});
chrome.tabs.onRemoved.addListener((tabId, _removeInfo) => {
    tabs.delete(tabId);
});
chrome.tabs.onActivated.addListener((activeInfo) => {
    activeTabId = activeInfo.tabId;// update activeTabId
    // send article/url to sidepanel
    sendTabDetails(tabs.get(activeTabId));
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
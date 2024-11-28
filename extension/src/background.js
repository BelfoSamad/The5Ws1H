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

        //TODO: Remove, this is for test
        const article = "Algerian authorities have remanded in custody on national security charges prominent French-Algerian novelist Boualem Sansal following his arrest earlier this month that sparked alarm throughout the literary world, his French lawyer said on Tuesday. 'Boualem Sansal... was today placed in detention' on the basis of an article of the Algerian penal code 'which punishes all attacks on state security', lawyer Francois Zimeray said in a statement to AFP. He added that Sansal had been interrogated by 'anti-terrorist' prosecutors and said he was being 'deprived of his freedom on the grounds of his writing'. Sansal, a major figure in francophone modern literature, is known for his strong stances against both authoritarianism and Islamism, as well as being a forthright campaigner on freedom of expression issues. His detention by Algeria comes against a background of tensions between France and its former colony, which also appear to have spread to the literary world. The 75-year-old writer, granted French nationality this year, was on November 16 arrested at Algiers airport after returning from France, according to several media reports. The Gallimard publishing house, which has published his work for a quarter of a century, in a statement expressed 'its very deep concern following the arrest of the writer by the Algerian security services', calling for his 'immediate release'. A relative latecomer to writing, Sansal turned to novels in 1999 and has tackled subjects including the horrific 1990s civil war between authorities and Islamists. His books are not banned in Algeria but he is a controversial figure, particularly since making a visit to Israel in 2014. Sansal's hatred of Islamism has not been confined to Algeria and he has also warned of a creeping Islamisation in France, a stance that has made him a favoured author of prominent figures on the right and far-right."
        const tst = await chrome.runtime.sendMessage({target: "offscreen", action: "summarizer", article: article});
        console.log(tst);
    }
}
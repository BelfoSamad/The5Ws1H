export function startAnimations(tabId) {
    chrome.tabs.sendMessage(tabId, {action: "start_animation"});
}

export async function summarizeArticle(url) {
    return chrome.runtime.sendMessage({target: "offscreen", action: "summarize", url: url});
}

export function stopAnimations(tabId) {
    chrome.tabs.sendMessage(tabId, {action: "stop_animation"});
}

export function sendTabDetails(tab) {
    chrome.runtime.sendMessage({target: "sidepanel", action: "tab", tab: tab});
}

export function sendTabError(error) {
    chrome.runtime.sendMessage({target: "sidepanel", action: "error", error: error});
}

export async function summarizeArticleText(tabId) {
    const settings = await chrome.storage.local.get(["summaryType", "summaryLength"]);
    if ((await chrome.runtime.sendMessage({target: "offscreen", action: "summarizer_available"})).available) {
        const html = await chrome.tabs.sendMessage(tabId, {action: "get_content"});
        const textSummary = await chrome.runtime.sendMessage({
            target: "offscreen",
            action: "summarizer",
            html: html,
            type: settings["summaryType"] ?? "tl;dr",
            length: settings["summaryLength"] ?? "medium",
        });
        return textSummary;
    } else return null;
}

export async function translateSummary(summary) {
    const settings = await chrome.storage.local.get(["targetLanguage"]);
    // Translate Summary
    if ((await chrome.runtime.sendMessage({target: "offscreen", action: "translator_available"})).available) {
        const translatedSummary = {};
        for (const [key, value] of Object.entries(summary)) {
            if (Array.isArray(value)) {
                const promises = value.map(async (val) => {
                    return await chrome.runtime.sendMessage({
                        target: "offscreen",
                        action: "translator",
                        text: val,
                        language: settings["targetLanguage"] ?? "es"
                    });
                });
                translatedSummary[key] = await Promise.all(promises);
            } else translatedSummary[key] = await chrome.runtime.sendMessage({
                target: "offscreen",
                action: "translator",
                text: value,
                language: settings["targetLanguage"] ?? "es"
            });
        }
        return translatedSummary;
    } else return null;
}
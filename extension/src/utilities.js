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

export async function enrichArticle(tabId, article) {
    const settings = await chrome.storage.local.get(["targetLanguage", "summaryType", "summaryLength"]);

    // Translate Summary
    if ((await chrome.runtime.sendMessage({target: "offscreen", action: "translator_available"})).available) {
        const translatedSummary = {};
        for (const [key, value] of Object.entries(article.summary)) {
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

        article["translation"] = translatedSummary;
    }

    // Text Summary
    if ((await chrome.runtime.sendMessage({target: "offscreen", action: "summarizer_available"})).available) {
        const html = await chrome.tabs.sendMessage(tabId, {action: "get_content"});
        const textSummary = await chrome.runtime.sendMessage({
            target: "offscreen",
            action: "summarizer",
            html: html,
            type: settings["summaryType"] ?? "tl;dr",
            length: settings["summaryLength"] ?? "medium",
        });
        article["text_summary"] = textSummary;
    }

    return article;
}
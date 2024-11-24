export function startAnimations(tabId) {
    chrome.tabs.sendMessage(tabId, {action: "start_animation"});
    chrome.runtime.sendMessage({target: "sidepanel", action: "start_animation"});
}

export async function summarizeArticle(url) {
    return chrome.runtime.sendMessage({target: "offscreen", action: "summarize", url: url});
}

export function stopAnimations(tabId) {
    chrome.tabs.sendMessage(tabId, {action: "stop_animation"});
}

export function sendUrl(url) {
    chrome.runtime.sendMessage({target: "sidepanel", action: "url", url: url});
}

export function sendResult(result) {
    chrome.runtime.sendMessage({target: "sidepanel", action: "result", result: result});
}

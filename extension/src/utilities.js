export function sendArticle(article) {
    chrome.runtime.sendMessage({target: "sidepanel", action: "article", article: article});
}
// Create Animated Overlay
function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "the5ws1h-overlay";
    document.body.appendChild(overlay);
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.action) {
        case "start_animation":
            createOverlay();
            break;
        case "stop_animation":
            const overlaysByClass = document.getElementsByClassName("the5ws1h-overlay");
            if (overlaysByClass.length > 0) document.body.removeChild(overlaysByClass[0]);
            break;
        case "get_content":
            sendResponse(document.documentElement.outerHTML);
            break;
    }
});
// background.js (Added "Send to New Chat" to Context Menu - vFinal Full Version)

// --- Variables ---
let sentientPopupId = null;
const sentientBaseUrl = "https://chat.sentient.xyz/";
const sentientChatUrlPattern = "https://chat.sentient.xyz/c/";
const defaultPopupState = { width: 450, height: 700, top: 10, left: 10 };
let pendingPasteInfo = null; // { windowId: number, tabId: number | null }

// --- Setup / Update ---
chrome.runtime.onInstalled.addListener((details) => {
    console.log(`Extension ${details.reason}.`);
    setupContextMenus();
});

// --- Context Menu Setup ---
// *** CHANGED: New menu item added ***
function setupContextMenus() {
    chrome.contextMenus.removeAll(() => {
        console.log("Previous context menus removed.");
        chrome.contextMenus.create({
            id: "sentientSummarizeDirect",
            title: "Summarize with Sentient",
            contexts: ["selection"]
        });
        chrome.contextMenus.create({
            id: "sentientExplainDirect",
            title: "Explain with Sentient",
            contexts: ["selection"]
        });
        // New Menu Item
        chrome.contextMenus.create({
            id: "sentientNewChatWithSelection", // New ID
            title: "Send Selection to New Chat", // New Title
            contexts: ["selection"] // Only when text is selected
        });
        console.log("Context menus created (Summarize/Explain/New Chat w/ Selection).");
    });
}

// --- Event Listeners ---

// Extension Icon Click
chrome.action.onClicked.addListener((tab) => {
    console.log("Extension icon clicked.");
    openSentientPopup({ requestPaste: false, source: 'manual' });
});

// Messages from Content Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message, "From:", sender.tab ? sender.tab.url : "Unknown Tab/Context");

    switch (message.action) {
        case "openSentientPopup": // Floating Button
            console.log("Request to open popup from floating button...");
            openSentientPopup({ requestPaste: false, source: 'manual' });
            sendResponse({ status: "Popup open request processed" });
            break;

        case "processStCommand": // /st Command
            if (!message.query) {
                console.warn("/st command received but query is empty.");
                sendResponse({ status: "Error: Query missing" });
                return false; // No async response needed
            }
            console.log(`/st command processing. Query: "${message.query}"`);
            const queryToCopy = message.query;
            const senderTabId = sender.tab ? sender.tab.id : null;
            if (!senderTabId) {
                console.error("Cannot process /st: Sender tab ID missing.");
                sendResponse({ status: "Error: Missing Tab ID." });
                return false; // No async response needed
            }
            // Copy the query to clipboard first, then open popup and request paste
            copyToClipboardAndThen(queryToCopy, senderTabId, () => {
                console.log("Clipboard set for /st, requesting popup open and paste.");
                openSentientPopup({ requestPaste: true, source: 'st_omni' }); // Treat /st like omnibox
            });
            sendResponse({ status: "/st command request received, attempting copy/open" });
            return true; // Indicate asynchronous response (callback will be called later)

        case "pasteClipboardContentOnFocus": // Paste after /st space (or direct paste request)
             console.log("Background: Paste request received (likely from content.js or direct call).");
            if (sentientPopupId) {
                 chrome.windows.get(sentientPopupId, { populate: true }, (existingWindow) => {
                     if (chrome.runtime.lastError || !existingWindow) {
                         console.warn(`Popup ID (${sentientPopupId}) not found/error during paste request.`);
                         sentientPopupId = null; // Clear invalid ID
                         return;
                     }
                     const activeTab = existingWindow.tabs?.find(t => t.active);
                     if (activeTab?.id && activeTab.url?.startsWith(sentientBaseUrl)) { // Ensure it's a sentient tab
                         console.log(`Background: Forwarding paste request for popup (${sentientPopupId}), tab (${activeTab.id}).`);
                         // Send message to sentient-paste.js in that specific tab
                         chrome.tabs.sendMessage(activeTab.id, { action: "pasteClipboardContent" }, (response) => {
                             if (chrome.runtime.lastError) {
                                 console.error(`Error sending paste message to tab ${activeTab.id}: ${chrome.runtime.lastError.message}`);
                             } else {
                                 console.log(`Paste message sent to tab ${activeTab.id}, response:`, response?.status);
                             }
                             // Send response back to original caller (content.js) if needed
                             sendResponse({ status: response?.status || (chrome.runtime.lastError ? "Error sending" : "Paste message sent") });
                         });
                         return true; // Indicate async response
                     } else {
                         console.warn("Active sentient popup tab not found or URL mismatch for pasting.");
                         sendResponse({ status: "Paste failed: No active Sentient tab" });
                     }
                 });
                 return true; // Indicate async response from windows.get
            } else {
                console.log("Popup not open, paste request ignored.");
                sendResponse({ status: "Paste failed: Popup closed" });
            }
            break; // Break for pasteClipboardContentOnFocus

        default:
            console.log("Unknown message action:", message.action);
            sendResponse({ status: "Unknown action" });
            return false; // No async response needed
    }
    // Default return false if not handled or sync response sent
    // return false; // Let's be explicit: only return true for async cases handled above.
});


// Context Menu Click
// *** CHANGED: New case added ***
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id) { console.warn("Context click ignored: Tab ID missing."); return; }
    console.log("Context menu item clicked:", info.menuItemId);

    let textToCopy = "";
    let source = 'context'; // Default source (uses last chat or opens new if needed)

    switch (info.menuItemId) {
        case "sentientSummarizeDirect":
            if (!info.selectionText) { console.log("Selection required for Summarize."); return; }
            textToCopy = "Summarize: " + info.selectionText.trim();
            source = 'context'; // Use existing/last chat
            break;
        case "sentientExplainDirect":
            if (!info.selectionText) { console.log("Selection required for Explain."); return; }
            textToCopy = "Explain: " + info.selectionText.trim();
            source = 'context'; // Use existing/last chat
            break;
        case "sentientNewChatWithSelection": // New case
            if (!info.selectionText) { console.log("Selection required for New Chat."); return; }
            textToCopy = info.selectionText.trim(); // No prefix
            source = 'context_new'; // Force new chat (navigate to base URL)
            break;
        default:
            console.warn("Unknown context menu ID:", info.menuItemId);
            return;
    }

    // Copy text to clipboard and then open/paste into popup
    copyToClipboardAndThen(textToCopy, tab.id, () => {
        console.log(`Context Menu (${source}): Requesting popup open/focus AND paste.`);
        openSentientPopup({ requestPaste: true, source: source });
    });
});

// Address Bar (Omnibox) 'st' Command
chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
     const query = text.trim();
     console.log(`Address bar input ('st'): "${query}"`);
     if (!query) return; // Ignore empty input

     let currentTab = null; // Find active tab for copying
     try {
         // Prioritize the currently active tab in the current window
         const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
         if (tabs?.length > 0) {
             currentTab = tabs[0];
         } else {
             // Fallback: try the active tab in the last focused window (might be the omnibox window itself)
             const lastFocused = await chrome.windows.getLastFocused({ populate: true });
             if (lastFocused?.tabs?.length > 0) {
                 currentTab = lastFocused.tabs.find(t => t.active);
             }
         }
     } catch (error) {
         console.error("Error querying active tab for address bar:", error);
     }

     if (!currentTab?.id) { // Continue even if copying isn't possible
         console.error("Address bar: Active tab ID couldn't be obtained. Popup will open without copying.");
         openSentientPopup({ requestPaste: false, source: 'st_omni' }); // Source st_omni but no paste
         return;
     }

     // Copy the omnibox query to the clipboard using the found tab's context
     copyToClipboardAndThen(query, currentTab.id, () => {
         console.log("Address bar: Clipboard set. Requesting popup open and paste.");
         openSentientPopup({ requestPaste: true, source: 'st_omni' });
     });
});
chrome.omnibox.setDefaultSuggestion({ description: "For Sentient: 'st' + [space] + your query" });


// Listen for Tab Updates Inside the Popup
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only interested in events in our popup window
    if (tab.windowId === sentientPopupId) {

        // 1. Save URL Changes (Still necessary to remember the last chat)
        // Only save actual chat URLs, ignore loading/newtab pages
        if (changeInfo.url && changeInfo.url.startsWith(sentientChatUrlPattern)) {
            chrome.storage.local.set({ lastSentientUrl: changeInfo.url }, () => {
                if (chrome.runtime.lastError) { console.error("Could not save last Sentient URL:", chrome.runtime.lastError); }
                // console.log("Last Sentient URL saved:", changeInfo.url); // Optional log
            });
        } else if (changeInfo.url && changeInfo.url === sentientBaseUrl) {
             // If navigated back to the base URL, potentially clear the last chat URL?
             // Or keep the last specific chat URL? Let's keep it for now.
             // chrome.storage.local.remove('lastSentientUrl');
        }

        // 2. Check for Pending Paste Request (After New Window or Navigation)
        const isPastePendingForThisTab = pendingPasteInfo &&
                                          pendingPasteInfo.windowId === tab.windowId &&
                                          pendingPasteInfo.tabId === tabId; // Check if paste is pending for *this specific tab*

        // Only when the page load is complete ('complete') AND paste is expected for this tab
        if (isPastePendingForThisTab && changeInfo.status === 'complete' && tab.url?.startsWith(sentientBaseUrl)) {
            console.log(`Tab ${tabId} load finished at ${tab.url}. Pending paste info found.`);
            const infoToSend = { ...pendingPasteInfo }; // Copy the info, because we'll clear it immediately
            pendingPasteInfo = null; // CLEAR the pending request (Don't trigger again)

            // Send message after a SHORT DELAY to delegate the paste operation to sentient-paste.js
            // The delay gives the page's JavaScript (like React) time to initialize the input field.
            setTimeout(() => {
                console.log(`Sending paste message to tab ${infoToSend.tabId} with delay.`);
                chrome.tabs.sendMessage(infoToSend.tabId, { action: "pasteClipboardContent" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error(`ERROR sending paste message to tab ${infoToSend.tabId} (delayed):`, chrome.runtime.lastError.message);
                    } else {
                        console.log(`Paste message sent to tab ${infoToSend.tabId} (delayed), response:`, response?.status);
                    }
                });
            }, 300); // Delay 300ms (adjust if needed)
        }
    }
});

// Listen for Popup Window Size/Position Changes
chrome.windows.onBoundsChanged.addListener((window) => {
    if (window.id === sentientPopupId && window.state === "normal") { // Only save changes in the normal state
        const popupState = { top: window.top, left: window.left, width: window.width, height: window.height };
        chrome.storage.local.set({ lastPopupState: popupState }, () => {
            if (chrome.runtime.lastError) { console.error("Could not save popup state:", chrome.runtime.lastError); }
        });
    }
});

// Listen for Popup Window Closure
chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === sentientPopupId) {
        console.log("Sentient popup window closed.");
        sentientPopupId = null; // Clear the ID
        // If there was a pending paste for the closed window, clear it too
        if (pendingPasteInfo && pendingPasteInfo.windowId === windowId) {
            console.log("Clearing pending paste request because popup was closed.");
            pendingPasteInfo = null;
        }
    }
});

// --- Helper Functions ---

// Copy Text to Clipboard using the target tab's context
async function copyToClipboardAndThen(text, tabId, callback) {
    if (!tabId) {
        console.error("Cannot copy: Invalid Tab ID.");
        if (callback) callback(); // Let the flow continue even if there's an error
        return;
    }
    try {
        // executeScript runs a function in the specified tab.
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (textToCopy) => { // This function runs inside the tab
                // Use the Clipboard API (requires secure context, usually true for extensions)
                return navigator.clipboard.writeText(textToCopy)
                    .then(() => ({ success: true })) // If successful
                    .catch(err => ({ success: false, error: err.message })); // If failed
            },
            args: [text] // Sent as an argument to the function to be executed
        });
        // Check the result from the executed script
        if (results && results[0] && results[0].result && results[0].result.success) {
             // console.log(`Text successfully copied in Tab ${tabId}.`); // Optional success log
        } else {
             const errorMsg = (results && results[0] && results[0].result && results[0].result.error) ? results[0].result.error : "Unknown clipboard write error";
             console.error(`Could not copy text into Tab ${tabId}: ${errorMsg}`);
        }
    } catch (err) {
        // This catches errors in the executeScript call itself (e.g., tab doesn't exist, permissions issue)
        console.error(`Error running copy script for Tab ${tabId}:`, err);
    } finally {
        // Ensure the callback is always called, regardless of success or failure
        if (callback) {
            callback();
        }
    }
}

// Open/Focus/Manage Popup Window
// source: 'manual', 'st_omni', 'context', 'context_new'
function openSentientPopup({ requestPaste = false, source = 'manual' }) {
    console.log(`openSentientPopup called. Source: ${source}, Paste Request: ${requestPaste}`);

    // If the new action doesn't request a paste, clear any old pending paste request.
    if (!requestPaste && pendingPasteInfo) {
         console.log("Clearing previous pending paste as new action doesn't require it.");
         pendingPasteInfo = null;
    }

    // 1. Is There an Existing Popup Window?
    if (sentientPopupId) {
        chrome.windows.get(sentientPopupId, { populate: true }, (existingWindow) => {
            if (chrome.runtime.lastError || !existingWindow) {
                // The stored ID is invalid (window closed unexpectedly?)
                console.warn(`Existing popup ID (${sentientPopupId}) not found/error. Resetting ID and retrying.`);
                sentientPopupId = null;
                pendingPasteInfo = null; // Clear potentially related pending paste
                openSentientPopup({ requestPaste, source }); // Call again to create a new one
                return;
            }

            // Window found, focus it and ensure it's in a usable state
            chrome.windows.update(sentientPopupId, { focused: true, state: "normal" }, (updatedWindow) => {
                 if (chrome.runtime.lastError) {
                    // Focusing might fail in some scenarios (e.g., OS interference)
                    console.warn(`Could not focus/update existing popup ID (${sentientPopupId}): ${chrome.runtime.lastError.message}. Resetting ID and retrying.`);
                    sentientPopupId = null;
                    pendingPasteInfo = null;
                    openSentientPopup({ requestPaste, source }); // Call again
                    return;
                 }

                console.log(`Existing popup (${sentientPopupId}) focused.`);
                const activeTab = updatedWindow.tabs?.find(t => t.active); // Use updatedWindow from callback

                if (activeTab?.id) {
                    // Determine if navigation to the base URL is needed
                    // Navigate if:
                    // - Source is 'manual' and tab is not already at base URL.
                    // - Source is 'context_new' (always force navigation to base URL).
                    const needsNavToBase = (source === 'manual' && activeTab.url !== sentientBaseUrl) || source === 'context_new';

                    // Clear any pending paste for this window *before* deciding the next action
                    if (pendingPasteInfo && pendingPasteInfo.windowId === updatedWindow.id) {
                         console.log("Clearing pending paste for existing window before new action.");
                         pendingPasteInfo = null;
                    }

                    if (needsNavToBase) {
                        console.log(`Navigation needed (Source: ${source}). Tab ${activeTab.id} to: ${sentientBaseUrl}.`);
                        chrome.tabs.update(activeTab.id, { url: sentientBaseUrl, active: true }, (navigatedTab) => {
                            if (chrome.runtime.lastError) {
                                console.error("Error navigating existing tab:", chrome.runtime.lastError);
                                // Don't set pending paste if navigation failed
                                return;
                            }
                            // If paste is requested after navigation (only for 'context_new'), set pendingPasteInfo
                            if (requestPaste && navigatedTab) { // Should always be true for context_new
                                console.log(`Navigation started (${source}). Setting pending paste for tab ${navigatedTab.id}.`);
                                pendingPasteInfo = { windowId: updatedWindow.id, tabId: navigatedTab.id };
                            }
                        });
                    } else { // Navigation Not Needed
                        // If paste is requested, and we are *not* navigating, paste directly.
                        // This applies to:
                        // - 'st_omni'
                        // - 'context' (summarize/explain)
                        // - 'manual' or 'context_new' IF already at base URL
                        if (requestPaste) {
                             console.log(`Navigation not needed. Requesting paste directly in tab ${activeTab.id}.`);
                             // Send message directly to sentient-paste.js (instead of injecting)
                             chrome.tabs.sendMessage(activeTab.id, { action: "pasteClipboardContent" }, (response) => {
                                if (chrome.runtime.lastError) { console.error(`Error sending direct paste message to tab ${activeTab.id}: ${chrome.runtime.lastError.message}`); }
                                else { console.log(`Direct paste message sent to tab ${activeTab.id}, response:`, response?.status); }
                            });
                        } else { // No navigation, no paste requested ('manual' at base URL)
                            console.log("Navigation not needed and paste not requested.");
                        }
                    }
                } else if (requestPaste) {
                    // Should not happen if window update succeeded, but handle defensively
                    console.warn("Paste requested but active tab not found in existing focused window.");
                }
            }); // end windows.update callback
        }); // end windows.get callback
        return; // Handled existing window
    }

    // 2. Create New Popup Window
    console.log("No existing popup. Creating new window.");
    chrome.storage.local.get(['lastPopupState'], (result) => {
        // New popups always open the base URL, regardless of source.
        // The 'source' primarily dictates whether a paste is queued *after* creation.
        const urlToOpen = sentientBaseUrl;
        console.log(`New popup: URL: ${urlToOpen}, Source: ${source}, Paste Requested: ${requestPaste}`);
        const stateToUse = result.lastPopupState || defaultPopupState;

        chrome.windows.create({
             url: urlToOpen,
             type: "popup",
             width: stateToUse.width,
             height: stateToUse.height,
             top: stateToUse.top,
             left: stateToUse.left
         }, (window) => {
            if (window?.id && window.tabs?.[0]?.id) {
                sentientPopupId = window.id;
                const newTabId = window.tabs[0].id;
                console.log(`New popup created, ID: ${sentientPopupId}, Tab ID: ${newTabId}`);
                // If paste is requested for the new window, set pending info
                if (requestPaste) { // Applies to st_omni, context, context_new
                    pendingPasteInfo = { windowId: window.id, tabId: newTabId };
                    console.log(`Pending paste set for new window:`, pendingPasteInfo);
                    // The onUpdated listener will handle the actual paste message after the tab loads.
                }
            } else {
                 console.error("Could not create popup window or get tab ID.", chrome.runtime.lastError?.message);
                 sentientPopupId = null; // Ensure ID is null if creation failed
                 pendingPasteInfo = null;
            }
        });
    });
} // end openSentientPopup


// Note: The injectPasteScript function was removed as direct messaging
// to the persistent sentient-paste.js content script is now preferred
// over injecting temporary scripts.

// End of file (EOF)

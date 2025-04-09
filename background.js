// background.js (Right-click menu "Send to New Chat" added - Final Version)

// --- Variables ---
let sentientPopupId = null;
const sentientBaseUrl = "https://chat.sentient.xyz/";
const sentientChatUrlPattern = "https://chat.sentient.xyz/c/";
const defaultPopupState = { width: 450, height: 700, top: 10, left: 10 };
let pendingPasteInfo = null; // { windowId: number, tabId: number | null }

// --- Setup/Update ---
chrome.runtime.onInstalled.addListener((details) => {
    console.log(`Extension ${details.reason}.`);
    setupContextMenus();
});

// --- Right-click Menu Setup ---
// *** MODIFIED: New menu item added ***
function setupContextMenus() {
    chrome.contextMenus.removeAll(() => {
        console.log("Previous right-click menus removed.");
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
        console.log("Right-click menus created (Summarize/Explain/New Chat w/ Selection).");
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
            console.log("Floating button requested popup open...");
            openSentientPopup({ requestPaste: false, source: 'manual' });
            sendResponse({ status: "Popup open request processed" });
            break;

        case "processStCommand": // /st Command
            if (!message.query) {
                console.warn("/st command received but query is empty.");
                sendResponse({ status: "Error: Query missing" });
                return false;
            }
            console.log(`Processing /st command. Query: "${message.query}"`);
            const queryToCopy = message.query;
            const senderTabId = sender.tab ? sender.tab.id : null;
            if (!senderTabId) {
                console.error("Cannot process /st: Missing sender tab ID.");
                sendResponse({ status: "Error: Missing Tab ID." });
                return false;
            }
            copyToClipboardAndThen(queryToCopy, senderTabId, () => {
                console.log("Clipboard set for /st, opening popup and requesting paste.");
                openSentientPopup({ requestPaste: true, source: 'st_omni' });
            });
            sendResponse({ status: "/st command request received, trying copy/open" });
            return true; // Asynchronous

        case "pasteClipboardContentOnFocus": // /st space paste
             console.log("Background: Paste request received from content.js.");
            if (sentientPopupId) {
                 chrome.windows.get(sentientPopupId, { populate: true }, (existingWindow) => {
                     if (chrome.runtime.lastError || !existingWindow) { console.warn(`Popup ID (${sentientPopupId}) not found/error.`); sentientPopupId = null; return; }
                     const activeTab = existingWindow.tabs?.find(t => t.active);
                     if (activeTab?.id) {
                         console.log(`Background: Forwarding paste request to popup (${sentientPopupId}), tab (${activeTab.id}).`);
                         chrome.tabs.sendMessage(activeTab.id, { action: "pasteClipboardContent" });
                     } else { console.warn("Active popup tab not found."); }
                 });
            } else { console.log("Popup not open, /st space paste not processed."); }
            sendResponse({ status: "Paste request being processed." });
            break;

        default:
            console.log("Unknown message action:", message.action);
            sendResponse({ status: "Unknown action" });
            return false;
    }
});

// Right-click Menu Click
// *** MODIFIED: New case added ***
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id) { console.warn("Right-click ignored: Missing tab ID."); return; }
    console.log("Right-click menu item clicked:", info.menuItemId);

    let textToCopy = "";
    let source = 'context'; // Default source

    switch (info.menuItemId) {
        case "sentientSummarizeDirect":
            if (!info.selectionText) { console.log("Selection required for Summarize."); return; }
            textToCopy = "Summarize: " + info.selectionText.trim();
            source = 'context'; // Use current/last chat
            break;
        case "sentientExplainDirect":
            if (!info.selectionText) { console.log("Selection required for Explain."); return; }
            textToCopy = "Explain: " + info.selectionText.trim();
            source = 'context'; // Use current/last chat
            break;
        case "sentientNewChatWithSelection": // New case
            if (!info.selectionText) { console.log("Selection required for New Chat."); return; }
            textToCopy = info.selectionText.trim(); // No prefix
            source = 'context_new'; // Force new chat
            break;
        default:
            console.warn("Unknown right-click menu ID:", info.menuItemId);
            return;
    }

    // Copy text to clipboard then open/focus popup
    copyToClipboardAndThen(textToCopy, tab.id, () => {
        console.log(`Right-click Menu (${source}): Requesting popup open/focus AND paste.`);
        openSentientPopup({ requestPaste: true, source: source });
    });
});

// Address Bar (Omnibox) 'st' Command
chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
     const query = text.trim();
     console.log(`Address bar input ('st'): "${query}"`);
     if (!query) return;

     let currentTab = null; // Find active tab for copying
     try {
         const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
         if (tabs?.length > 0) { currentTab = tabs[0]; }
         else { const lastFocused = await chrome.windows.getLastFocused({populate: true}); if(lastFocused?.tabs?.length > 0) { currentTab = lastFocused.tabs.find(t => t.active); } }
     } catch (error) { console.error("Error querying active tab for address bar:", error); }

     if (!currentTab?.id) { // Continue even if copying fails
         console.error("Address bar: Could not get active tab ID. Opening popup without copying.");
         openSentientPopup({ requestPaste: false, source: 'st_omni' }); // Source st_omni but no paste
         return;
     }

     copyToClipboardAndThen(query, currentTab.id, () => {
         console.log("Address bar: Clipboard set. Requesting popup open and paste.");
         openSentientPopup({ requestPaste: true, source: 'st_omni' });
     });
});
chrome.omnibox.setDefaultSuggestion({ description: "For Sentient: 'st' + [space] + your query" });

// Listen for Tab Updates in Popup
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only care about events in our popup window
    if (tab.windowId === sentientPopupId) {

        // 1. Save URL Changes (Still needed to remember last chat)
        if (changeInfo.url && changeInfo.url !== 'chrome://newtab/' && changeInfo.url.startsWith(sentientChatUrlPattern)) {
            chrome.storage.local.set({ lastSentientUrl: changeInfo.url }, () => {
                if (chrome.runtime.lastError) { console.error("Failed to save last Sentient URL:", chrome.runtime.lastError); }
                 // console.log("Last Sentient URL saved:", changeInfo.url); // Optional log
            });
        }

        // 2. Check Pending Paste Request (After New Window or Navigation)
        const isPastePendingForThisTab = pendingPasteInfo &&
                                          pendingPasteInfo.windowId === tab.windowId &&
                                          pendingPasteInfo.tabId === tabId;

        // Only when page load completes ('complete') AND paste is pending for this tab
        if (isPastePendingForThisTab && changeInfo.status === 'complete') {
            console.log(`Tab ${tabId} finished loading. Pending paste info found.`);
            const infoToSend = { ...pendingPasteInfo }; // Copy info since we'll clear it immediately
            pendingPasteInfo = null; // CLEAR pending request (to prevent retriggering)

            // Send paste message to sentient-paste.js after SHORT DELAY
            setTimeout(() => {
                console.log(`Paste message being sent to tab ${infoToSend.tabId} with delay.`);
                chrome.tabs.sendMessage(infoToSend.tabId, { action: "pasteClipboardContent" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error(`Error sending paste message to tab ${infoToSend.tabId} (delayed):`, chrome.runtime.lastError.message);
                    } else {
                        console.log(`Paste message sent to tab ${infoToSend.tabId} (delayed), response:`, response);
                    }
                });
            }, 300); // 300ms delay
        }
    }
});

// Listen for Popup Window Size/Position Changes
chrome.windows.onBoundsChanged.addListener((window) => {
    if (window.id === sentientPopupId && window.state === "normal") { // Only save changes in normal state
        const popupState = { top: window.top, left: window.left, width: window.width, height: window.height };
        chrome.storage.local.set({ lastPopupState: popupState }, () => {
            if (chrome.runtime.lastError) { console.error("Failed to save popup state:", chrome.runtime.lastError); }
        });
    }
});

// Listen for Popup Window Closing
chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === sentientPopupId) {
        console.log("Sentient popup window closed.");
        sentientPopupId = null; // Clear ID
        // Also clear any pending paste for this window
        if (pendingPasteInfo && pendingPasteInfo.windowId === windowId) {
            console.log("Clearing pending paste request due to popup closing.");
            pendingPasteInfo = null;
        }
    }
});

// --- Helper Functions ---

// Copy Text to Clipboard
async function copyToClipboardAndThen(text, tabId, callback) {
    if (!tabId) {
        console.error("Cannot copy: Invalid Tab ID.");
        if (callback) callback(); // Continue flow even on error
        return;
    }
    try {
        // executeScript runs a function in the specified tab
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (textToCopy) => { // This function runs inside the tab
                return navigator.clipboard.writeText(textToCopy)
                    .then(() => ({ success: true })) // On success
                    .catch(err => ({ success: false, error: err.message })); // On failure
            },
            args: [text] // Arguments passed to the function
        });
        // Check result
        if (!(results && results[0] && results[0].result && results[0].result.success)) {
             const errorMsg = (results && results[0] && results[0].result && results[0].result.error) ? results[0].result.error : "Unknown error";
             console.error(`Failed to copy text into Tab ${tabId}: ${errorMsg}`);
        }
    } catch (err) {
        console.error(`Error executing copy script for Tab ${tabId}:`, err);
    } finally {
        if (callback) { callback(); }
    }
}

// Open/Focus/Manage Popup Window
// source: 'manual', 'st_omni', 'context', 'context_new'
function openSentientPopup({ requestPaste = false, source = 'manual' }) {
    console.log(`openSentientPopup called. Source: ${source}, Paste Request: ${requestPaste}`);

    if (!requestPaste && pendingPasteInfo) { console.log("Clearing previous pending paste."); pendingPasteInfo = null; }

    // 1. Does Existing Popup Window Exist?
    if (sentientPopupId) {
        chrome.windows.get(sentientPopupId, { populate: true }, (existingWindow) => {
            if (chrome.runtime.lastError || !existingWindow) {
                console.warn(`Existing popup ID (${sentientPopupId}) not found/error. Resetting ID and retrying.`);
                sentientPopupId = null; pendingPasteInfo = null;
                openSentientPopup({ requestPaste, source }); // Retry
                return;
            }

            // Window found, focus it
            chrome.windows.update(sentientPopupId, { focused: true, state: "normal" }, () => {
                 if (chrome.runtime.lastError) {
                    console.warn(`Failed to focus/update existing popup ID (${sentientPopupId}). Resetting ID and retrying.`);
                    sentientPopupId = null; pendingPasteInfo = null;
                    openSentientPopup({ requestPaste, source }); return;
                 }

                console.log(`Existing popup (${sentientPopupId}) focused.`);
                const activeTab = existingWindow.tabs?.find(t => t.active);

                if (activeTab?.id) {
                    // Navigation Needed? (Manual OR 'context_new' AND not at base URL)
                    const shouldNavigate = (source === 'manual' || source === 'context_new') && (activeTab.url !== sentientBaseUrl);

                    // Clear previous pending paste
                    if (pendingPasteInfo && pendingPasteInfo.windowId === existingWindow.id) {
                         console.log("Clearing pending paste for current window before new action.");
                         pendingPasteInfo = null;
                    }

                    if (shouldNavigate) {
                        console.log(`Navigation needed (Source: ${source}). Tab ${activeTab.id} to: ${sentientBaseUrl}.`);
                        chrome.tabs.update(activeTab.id, { url: sentientBaseUrl }, (updatedTab) => {
                            if (chrome.runtime.lastError) { console.error("Error redirecting current tab:", chrome.runtime.lastError); return; }
                            // If paste also requested (i.e. source == 'context_new'), set pendingPasteInfo for after navigation
                            if (requestPaste) { // Only context_new will enter this block
                                console.log(`Navigation started (${source}). Setting pending paste.`);
                                pendingPasteInfo = { windowId: existingWindow.id, tabId: activeTab.id };
                            }
                        });
                    } else { // Navigation Not Needed (st_omni, context, or manual/context_new but already at base)
                        if (requestPaste) { // st_omni, context (or context_new but already at base)
                             console.log(`Navigation not needed. Paste script being injected directly into tab ${activeTab.id}.`);
                            injectPasteScript(activeTab.id); // Direct paste
                        } else { // manual (and already at base URL)
                            console.log("Navigation not needed and paste not requested.");
                        }
                    }
                } else if (requestPaste) { console.warn("Paste requested but no active tab found."); }
            }); // windows.update callback end
        }); // windows.get callback end
        return; // Existing window handled
    }

    // 2. Create New Popup Window
    console.log("No existing popup. Creating new window.");
    chrome.storage.local.get(['lastPopupState'], (result) => {
        const urlToOpen = sentientBaseUrl; // If popup is closed, ALWAYS open base URL
        console.log(`New popup: URL: ${urlToOpen}, Source: ${source}, Paste: ${requestPaste}`);
        const stateToUse = result.lastPopupState || defaultPopupState;
        chrome.windows.create({
             url: urlToOpen, type: "popup",
             width: stateToUse.width, height: stateToUse.height,
             top: stateToUse.top, left: stateToUse.left
         }, (window) => {
            if (window) {
                sentientPopupId = window.id; console.log(`New popup created, ID: ${sentientPopupId}`);
                if (requestPaste) { // st_omni or context or context_new
                    const newTabId = window.tabs?.[0]?.id;
                    if (newTabId) { pendingPasteInfo = { windowId: window.id, tabId: newTabId }; }
                    else { pendingPasteInfo = { windowId: window.id, tabId: null }; } // onUpdated will catch
                    console.log(`Pending paste set for new window:`, pendingPasteInfo);
                }
            } else {
                 console.error("Failed to create popup window.", chrome.runtime.lastError?.message);
                 sentientPopupId = null; pendingPasteInfo = null;
            }
        });
    });
} // openSentientPopup end

// Inject Paste Script into Target Tab
function injectPasteScript(tabId) {
    if (!tabId) { console.error("injectPasteScript: Invalid tabId."); return; }
    console.log(`Injecting paste script into tab ${tabId}...`);
    try {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: async () => { // This function runs inside the tab
                console.log("Injected Script: Running...");
                let textToPaste = "";
                try { textToPaste = await navigator.clipboard.readText(); if (!textToPaste) { console.log("Injected Script: Clipboard empty."); return { success: false, reason: "Clipboard empty" }; } console.log("Injected Script: Read from clipboard."); }
                catch (error) { console.error("Injected Script: Clipboard read error:", error); return { success: false, reason: "Clipboard read error", message: error.message }; }

                const inputSelector = 'textarea[data-testid="query#input"], textarea[data-testid="chat.query#input"]';
                console.log("Injected Script: Using selector:", inputSelector); // Log selector

                let targetInput = null;
                let retries = 10; const retryDelay = 300;

                while (!targetInput && retries > 0) {
                    targetInput = document.querySelector(inputSelector); // Using updated selector
                    if (targetInput) break;
                    retries--;
                    if (retries > 0) await new Promise(resolve => setTimeout(resolve, retryDelay));
                }

                if (targetInput) {
                    console.log("Injected Script: Target input found.");
                    try {
                        targetInput.focus(); targetInput.value = textToPaste;
                        targetInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                        targetInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                        targetInput.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
                        if (targetInput.setSelectionRange) { targetInput.setSelectionRange(targetInput.value.length, targetInput.value.length); }
                        console.log("Injected Script: Paste and event triggering successful.");
                        return { success: true };
                    } catch (pasteError) { console.error("Injected Script: Error during paste/event triggering:", pasteError); return { success: false, reason: "Paste execution error", message: pasteError.message }; }
                } else {
                    console.error(`Injected Script: Target input ('${inputSelector}') not found after retries.`);
                    return { success: false, reason: "Input not found" };
                }
            } // func end
        }).then((results) => {
             // console.log(`Script injection result for tab ${tabId}:`, results);
             if (chrome.runtime.lastError) { console.error(`Error after executeScript for tab ${tabId}:`, chrome.runtime.lastError.message); }
             else if (results?.[0]?.result?.success === false) { console.warn(`Injected script failed in tab ${tabId}. Reason: ${results[0].result.reason} ${results[0].result.message || ''}`); }
        }).catch(err => { console.error(`Promise error for executeScript on tab ${tabId}:`, err); });
    } catch (injectionError) { console.error(`Synchronous error calling executeScript for tab ${tabId}:`, injectionError); }
}
// injectPasteScript END

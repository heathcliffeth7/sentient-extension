// background.js (Right-click menu "Send to New Chat" added + Send Sentient Button)

// --- Variables ---
let sentientPopupId = null;
const sentientBaseUrl = "https://chat.sentient.xyz/";
const sentientChatUrlPattern = "https://chat.sentient.xyz/c/";
const defaultPopupState = { width: 450, height: 700, top: 10, left: 10 };
let pendingPasteInfo = null; // { windowId: number, tabId: number | null }
let menuCounter = 0; // Global counter to ensure unique IDs even when called in quick succession
let activeMenuItems = []; // Track active menu items

// Force create context menu on startup
chrome.runtime.onStartup.addListener(() => {
    console.log("Extension starting up, creating context menus...");
    // Force reset any stuck flags
    resetContextMenuFlag();
    // Load settings and setup context menus
    chrome.storage.sync.get({
        showContextMenu: true,
        showSummarize: true,
        showExplain: true,
        showNewChat: true,
        showSendSentient: true,
        customCommands: [],
        selectedLanguage: ''
    }, function(items) {
        console.log("Startup settings loaded:", items);
        if (items.showContextMenu) {
            // Force create menus with a small delay to ensure browser is ready
            setTimeout(() => {
                forceCreateContextMenus();
            }, 1000);
        }
    });
});

// Function to force create context menus regardless of flag state
function forceCreateContextMenus() {
    console.log("Force creating context menus...");
    // Reset flag first
    resetContextMenuFlag();
    // Then create menus
    setupContextMenus();
}

// --- Setup/Update ---
chrome.runtime.onInstalled.addListener((details) => {
    console.log(`Extension ${details.reason}.`);
    
    // Force reset any stuck flags
    resetContextMenuFlag();
    
    // Load settings and setup context menus
    chrome.storage.sync.get({
        showContextMenu: true,
        showSummarize: true,
        showExplain: true,
        showNewChat: true,
        showSendSentient: true,
        customCommands: [],
        selectedLanguage: ''
    }, function(items) {
        console.log("Initial settings loaded:", items);
        if (items.showContextMenu) {
            // Force create menus with a small delay to ensure browser is ready
            setTimeout(() => {
                forceCreateContextMenus();
            }, 1000);
        }
    });
});

// Listen for storage changes to update context menus when settings change
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        console.log("Storage changes detected:", changes);
        
        // Get all current settings to make a decision
        chrome.storage.sync.get({
            showContextMenu: true,
            showSummarize: true,
            showExplain: true,
            showNewChat: true,
            showSendSentient: true,
            customCommands: [],
            selectedLanguage: ''
        }, function(items) {
            console.log("Current settings:", items);
            
            // If context menu setting changed
            if (changes.showContextMenu) {
                console.log("Context menu setting changed:", changes.showContextMenu.newValue);
                
                if (changes.showContextMenu.newValue) {
                    // If enabled, setup context menus
                    setupContextMenus();
                } else {
                    // If disabled, remove all context menus
                    removeAllContextMenus(() => {
                        console.log("Context menus removed due to setting change.");
                    });
                }
            } 
            // If any feature setting changed or custom commands changed or language changed
            else if (changes.showSummarize || changes.showExplain || changes.showNewChat || 
                     changes.showSendSentient || changes.customCommands || changes.selectedLanguage) {
                
                console.log("Feature settings, custom commands, or language changed");
                
                // Only update if context menu is enabled
                if (items.showContextMenu) {
                    setupContextMenus();
                }
            }
        });
    }
});

// --- Improved Context Menu Management ---

// Global flag to prevent multiple simultaneous context menu operations
let isUpdatingContextMenus = false;

// Safety timeout to reset the flag if it gets stuck
function resetContextMenuFlag() {
    console.log("Force resetting isUpdatingContextMenus flag");
    isUpdatingContextMenus = false;
}

// Function to safely remove all context menus with verification
function removeAllContextMenus(callback) {
    // If already updating, queue the operation
    if (isUpdatingContextMenus) {
        console.log("Context menu update already in progress, queueing this operation");
        setTimeout(() => removeAllContextMenus(callback), 500);
        return;
    }
    
    // Set flag to prevent concurrent operations
    isUpdatingContextMenus = true;
    
    // Clear our tracking array first
    activeMenuItems = [];
    
    // Then remove all context menus
    chrome.contextMenus.removeAll(() => {
        console.log("All context menus removed successfully");
        
        // Verify removal by trying to get all context menus (only works in Chrome MV3)
        try {
            chrome.contextMenus.getAll((menuItems) => {
                if (menuItems && menuItems.length > 0) {
                    console.warn(`${menuItems.length} menu items still exist after removeAll. Retrying...`);
                    // If items still exist, try again after a longer delay
                    setTimeout(() => {
                        chrome.contextMenus.removeAll(() => {
                            console.log("Second attempt to remove all context menus completed");
                            isUpdatingContextMenus = false;
                            if (callback) callback();
                        });
                    }, 500);
                } else {
                    console.log("Verified all context menus are removed");
                    isUpdatingContextMenus = false;
                    if (callback) callback();
                }
            });
        } catch (error) {
            // If getAll is not supported, just assume it worked
            console.log("Could not verify menu removal, assuming success");
            isUpdatingContextMenus = false;
            if (callback) callback();
        }
    });
}

// --- Right-click Menu Setup ---
// *** FIXED: Completely redesigned to prevent duplicate ID errors and ensure reliable menu management ***
function setupContextMenus() {
    console.log("Setting up context menus...");
    
    // Force reset the flag if it's been set for more than 10 seconds
    // This prevents the flag from getting permanently stuck
    if (isUpdatingContextMenus) {
        console.log("Context menu update flag is already set, checking if it's stuck...");
        resetContextMenuFlag();
    }
    
    // Set flag to prevent concurrent operations
    isUpdatingContextMenus = true;
    
    // Set a safety timeout to reset the flag after 10 seconds no matter what
    const safetyTimeout = setTimeout(() => {
        console.log("Safety timeout triggered - resetting context menu flag");
        isUpdatingContextMenus = false;
    }, 10000);
    
    try {
        // First remove all existing context menus to prevent duplicates
        chrome.contextMenus.removeAll(() => {
            console.log("Previous right-click menus removed, creating new menus...");
            
            // Get all settings to determine which menu items to create
            chrome.storage.sync.get({
                showContextMenu: true,
                showSummarize: true,
                showExplain: true,
                showNewChat: true,
                showSendSentient: true,
                customCommands: [],
                selectedLanguage: ''
            }, function(items) {
                console.log("Creating menus with settings:", items);
                
                // If context menu is disabled, don't create any menus
                if (!items.showContextMenu) {
                    console.log("Context menu is disabled, not creating any menus");
                    clearTimeout(safetyTimeout);
                    isUpdatingContextMenus = false;
                    return;
                }
                
                // Create a queue of menu items to create
                const menuItemsToCreate = [];
                
                // Add standard menu items based on settings with consistent IDs
                if (items.showSummarize) {
                    menuItemsToCreate.push({
                        id: 'sum',
                        title: "Summarize with AI",
                        contexts: ["selection"]
                    });
                }
                
                if (items.showExplain) {
                    menuItemsToCreate.push({
                        id: 'exp',
                        title: "Explain with AI",
                        contexts: ["selection"]
                    });
                }
                
                if (items.showNewChat) {
                    menuItemsToCreate.push({
                        id: 'newchat',
                        title: "Send Selection to New Chat",
                        contexts: ["selection"]
                    });
                }
                
                if (items.showSendSentient) {
                    menuItemsToCreate.push({
                        id: 'send',
                        title: "Send Text",
                        contexts: ["selection"]
                    });
                }
                
                // Add custom command menu items with consistent IDs
                if (items.customCommands && items.customCommands.length > 0) {
                    items.customCommands.forEach((command, index) => {
                        menuItemsToCreate.push({
                            id: `custom_${index}`,
                            title: command,
                            contexts: ["selection"]
                        });
                    });
                }
                
                // Add translation option if language is selected
                if (items.selectedLanguage) {
                    let translationTitle = "";
                    if (items.selectedLanguage === "Turkish") {
                        translationTitle = "Türkçeye çevir";
                    } else {
                        translationTitle = `Translate to ${items.selectedLanguage}`;
                    }
                    
                    menuItemsToCreate.push({
                        id: 'translate',
                        title: translationTitle,
                        contexts: ["selection"]
                    });
                }
                
                console.log(`Creating ${menuItemsToCreate.length} menu items`);
                
                // If no menu items to create, we're done
                if (menuItemsToCreate.length === 0) {
                    console.log("No menu items to create");
                    clearTimeout(safetyTimeout);
                    isUpdatingContextMenus = false;
                    return;
                }
                
                let createdCount = 0;
                const totalCount = menuItemsToCreate.length;
                
                // Create all menu items immediately
                for (const menuItem of menuItemsToCreate) {
                    try {
                        chrome.contextMenus.create(menuItem, () => {
                            if (chrome.runtime.lastError) {
                                console.error(`Error creating menu item ${menuItem.title}:`, chrome.runtime.lastError);
                            } else {
                                console.log(`Created menu item: ${menuItem.title} with ID: ${menuItem.id}`);
                                // Track successfully created menu items
                                activeMenuItems.push(menuItem.id);
                            }
                            
                            // Count created items and reset flag when all are done
                            createdCount++;
                            if (createdCount >= totalCount) {
                                console.log("All menu items created, resetting flag");
                                clearTimeout(safetyTimeout);
                                isUpdatingContextMenus = false;
                            }
                        });
                    } catch (error) {
                        console.error(`Exception creating menu item ${menuItem.title}:`, error);
                        createdCount++;
                        if (createdCount >= totalCount) {
                            console.log("All menu items processed (with some errors), resetting flag");
                            clearTimeout(safetyTimeout);
                            isUpdatingContextMenus = false;
                        }
                    }
                }
            });
        });
    } catch (error) {
        console.error("Error in setupContextMenus:", error);
        clearTimeout(safetyTimeout);
        isUpdatingContextMenus = false;
    }
}

// --- Event Listeners ---

// Extension Icon Click
chrome.action.onClicked.addListener((tab) => {
    console.log("Extension icon clicked.");
    openSentientPopup({ requestPaste: false, source: 'manual' });
});

// Context Menu Click Handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
    const menuId = info.menuItemId;
    const selectedText = info.selectionText;
    
    console.log(`Context menu clicked: ${menuId}`);
    
    // Handle based on menu ID prefix
    if (menuId.startsWith('sum_')) {
        console.log("Summarize option clicked");
        // Handle summarize action
    } else if (menuId.startsWith('exp_')) {
        console.log("Explain option clicked");
        // Handle explain action
    } else if (menuId.startsWith('newchat_')) {
        console.log("New chat option clicked");
        // Handle new chat action
    } else if (menuId.startsWith('send_')) {
        console.log("Send text option clicked");
        // Handle send text action
    } else if (menuId.startsWith('custom_')) {
        console.log("Custom command clicked");
        // Handle custom command
    } else if (menuId.startsWith('translate_')) {
        console.log("Translate option clicked");
        // Handle translation
    }
});

// Add clipboard access handler for content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background: Message received:", message.action);
    
    if (message.action === "getClipboardContent") {
        console.log("Background: Received clipboard content request from tab", sender.tab?.id);
        
        // Use a more reliable method to read clipboard
        try {
            // Background scripts cannot access document or DOM directly
            // Only try navigator.clipboard API which is available in background context
            if (navigator.clipboard && navigator.clipboard.readText) {
                console.log("Background: Trying navigator.clipboard API");
                
                // Set a timeout to ensure we don't hang indefinitely
                const timeoutId = setTimeout(() => {
                    console.warn("Background: Clipboard read timeout");
                    sendResponse({ 
                        success: false, 
                        error: "Clipboard read timeout", 
                        fallbackNeeded: true 
                    });
                }, 2000);
                
                navigator.clipboard.readText()
                    .then(text => {
                        clearTimeout(timeoutId);
                        console.log("Background: Successfully read clipboard content via API");
                        sendResponse({ success: true, text: text });
                    })
                    .catch(error => {
                        clearTimeout(timeoutId);
                        console.error("Background: Error reading clipboard via API:", error);
                        // Inform content script to use its own fallback mechanisms
                        sendResponse({ 
                            success: false, 
                            error: "Clipboard API error: " + error.message,
                            fallbackNeeded: true
                        });
                    });
            } else {
                console.warn("Background: Clipboard API not available");
                // Inform content script to use its own fallback mechanisms
                sendResponse({ 
                    success: false, 
                    error: "Clipboard API not available in background context",
                    fallbackNeeded: true
                });
            }
            
            return true; // Indicates async response
        } catch (error) {
            console.error("Background: Exception in clipboard handler:", error);
            // Inform content script to use its own fallback mechanisms
            sendResponse({ 
                success: false, 
                error: error.message,
                fallbackNeeded: true
            });
            return true;
        }
    }
    
    return false; // Not handled
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
                console.log("Clipboard set for /st, checking popup status.");
                // Check if popup is already open
                if (sentientPopupId) {
                    console.log("Popup is already open, using existing chat.");
                    // Popup is open, paste into existing popup
                    openSentientPopup({ requestPaste: true, source: 'context' });
                } else {
                    console.log("Popup is not open, creating new chat.");
                    // Popup is not open, open new chat
                    openSentientPopup({ requestPaste: true, source: 'context_new' });
                }
            });
            sendResponse({ status: "/st command request received, trying copy/open" });
            return true; // Asynchronous

        case "processSelectionAction": // New case for selection menu actions
            if (!message.text) {
                console.warn("Selection action received but text is empty.");
                sendResponse({ status: "Error: Text missing" });
                return false;
            }
            console.log(`Processing selection action. Type: "${message.type}", Text length: ${message.text.length}`);
            const senderTabId2 = sender.tab ? sender.tab.id : null;
            if (!senderTabId2) {
                console.error("Cannot process selection action: Missing sender tab ID.");
                sendResponse({ status: "Error: Missing Tab ID." });
                return false;
            }
            
            let textToSend = message.text;
            let source = 'context'; // Default source
            
            // Format text based on action type
            switch (message.type) {
                case "summarize":
                    textToSend = `"${message.text.trim()}",Summarize`;
                    // Check if popup is already open
                    if (sentientPopupId) {
                        source = 'context'; // Use current chat if popup is open
                    } else {
                        source = 'context_new'; // Open new chat if popup is not open
                    }
                    break;
                case "explain":
                    textToSend = `"${message.text.trim()}",Explain`;
                    // Check if popup is already open
                    if (sentientPopupId) {
                        source = 'context'; // Use current chat if popup is open
                    } else {
                        source = 'context_new'; // Open new chat if popup is not open
                    }
                    break;
                case "newchat":
                    textToSend = message.text.trim(); // No prefix
                    source = 'context_new'; // Force new chat
                    break;
                case "sendsentient":
                    textToSend = message.text.trim(); // No prefix
                    // Check if popup is already open
                    if (sentientPopupId) {
                        source = 'context'; // Use current chat if popup is open
                    } else {
                        source = 'context_new'; // Open new chat if popup is not open
                    }
                    break;
                case "custom":
                    // Format text as "selected text", [custom command]
                    textToSend = `"${message.text.trim()}",${message.command}`;
                    // Check if popup is already open
                    if (sentientPopupId) {
                        source = 'context'; // Use current chat if popup is open
                    } else {
                        source = 'context_new'; // Open new chat if popup is not open
                    }
                    break;
                case "translate":
                    textToSend = message.text.trim(); // Keep the text with translation instruction
                    // Check if popup is already open
                    if (sentientPopupId) {
                        source = 'context'; // Use current chat if popup is open
                    } else {
                        source = 'context_new'; // Open new chat if popup is not open
                    }
                    break;
                default:
                    console.warn("Unknown selection action type:", message.type);
                    sendResponse({ status: "Error: Unknown action type" });
                    return false;
            }
            
            copyToClipboardAndThen(textToSend, senderTabId2, () => {
                console.log(`Selection action (${message.type}): Requesting popup open/focus AND paste.`);
                if (message.type === "translate") {
                    console.log(`Translation requested. Popup status: ${sentientPopupId ? 'open' : 'closed'}`);
                    if (sentientPopupId) {
                        console.log("Popup is already open, using existing chat for translation.");
                        openSentientPopup({ requestPaste: true, source: 'context' });
                    } else {
                        console.log("Popup is not open, creating new chat for translation.");
                        openSentientPopup({ requestPaste: true, source: 'context_new' });
                    }
                } else {
                    openSentientPopup({ requestPaste: true, source: source });
                }
            });
            sendResponse({ status: "Selection action request received, trying copy/open" });
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
// *** FIXED: Updated to handle new ID format ***
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id) { console.warn("Right-click ignored: Missing tab ID."); return; }
    console.log("Right-click menu item clicked:", info.menuItemId);

    let textToCopy = "";
    let source = 'context'; // Default source
    
    // Extract the base action from the ID
    const menuAction = info.menuItemId.split('_')[0];

    switch (menuAction) {
        case "sum":
            if (!info.selectionText) { console.log("Selection required for Summarize."); return; }
            textToCopy = `"${info.selectionText.trim()}",Summarize`;
            // Check if popup is already open
            if (sentientPopupId) {
                source = 'context'; // Use current chat if popup is open
            } else {
                source = 'context_new'; // Open new chat if popup is not open
            }
            break;
        case "exp":
            if (!info.selectionText) { console.log("Selection required for Explain."); return; }
            textToCopy = `"${info.selectionText.trim()}",Explain`;
            // Check if popup is already open
            if (sentientPopupId) {
                source = 'context'; // Use current chat if popup is open
            } else {
                source = 'context_new'; // Open new chat if popup is not open
            }
            break;
        case "send":
            if (!info.selectionText) { console.log("Selection required for Send Text."); return; }
            textToCopy = info.selectionText.trim();
            // Check if popup is already open
            if (sentientPopupId) {
                source = 'context'; // Use current chat if popup is open
            } else {
                source = 'context_new'; // Open new chat if popup is not open
            }
            break;
        case "custom":
            if (!info.selectionText) { console.log("Selection required for Custom Command."); return; }
            // Get custom commands from storage
            chrome.storage.sync.get({
                customCommands: []
            }, function(items) {
                // Extract index from the ID
                const idParts = info.menuItemId.split('_');
                const commandIndex = parseInt(idParts[1] || "0");
                
                if (items.customCommands && items.customCommands.length > commandIndex) {
                    const command = items.customCommands[commandIndex];
                    const formattedText = `"${info.selectionText.trim()}",${command}`;
                    
                    // Copy text to clipboard then open/focus popup
                    copyToClipboardAndThen(formattedText, tab.id, () => {
                        console.log(`Custom Command (${command}): Requesting popup open/focus AND paste.`);
                        // Check if popup is already open
                        if (sentientPopupId) {
                            openSentientPopup({ requestPaste: true, source: 'context' });
                        } else {
                            openSentientPopup({ requestPaste: true, source: 'context_new' });
                        }
                    });
                }
            });
            return; // Early return since we're handling this asynchronously
            
        case "translate":
            if (!info.selectionText) { console.log("Selection required for Translation."); return; }
            
            // Get the selected language from storage
            chrome.storage.sync.get({
                selectedLanguage: ''
            }, function(items) {
                if (!items.selectedLanguage) {
                    console.log("No language selected for translation.");
                    return;
                }
                
                let formattedText = "";
                if (items.selectedLanguage === "Turkish") {
                    // Format as "seçilen metin" followed by "Translate Turkish"
                    formattedText = `"${info.selectionText.trim()}", Translate Turkish`;
                } else {
                    // For other languages, keep the original format but with quotes
                    formattedText = `"${info.selectionText.trim()}", Translate to ${items.selectedLanguage}`;
                }
                
                // Copy text to clipboard then open/focus popup
                copyToClipboardAndThen(formattedText, tab.id, () => {
                    console.log(`Translation (${items.selectedLanguage}): Requesting popup open/focus AND paste.`);
                    openSentientPopup({ requestPaste: true, source: 'context' });
                });
            });
            return; // Early return since we're handling this asynchronously
            
        case "newchat": // New case
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

            // Send paste message to sentient-paste.js after LONGER DELAY
            // Increase delay to ensure content script is fully loaded
            setTimeout(() => {
                console.log(`Paste message being sent to tab ${infoToSend.tabId} with delay.`);
                
                // First check if tab still exists
                chrome.tabs.get(infoToSend.tabId, (tab) => {
                    if (chrome.runtime.lastError) {
                        console.error(`Tab ${infoToSend.tabId} no longer exists:`, chrome.runtime.lastError.message);
                        return;
                    }
                    
                    // Implement retry mechanism for sending messages
                    const maxRetries = 3;
                    let retryCount = 0;
                    
                    function sendMessageWithRetry() {
                        chrome.tabs.sendMessage(infoToSend.tabId, { 
                            action: "pasteClipboardContent",
                            timestamp: Date.now() // Add timestamp to make each request unique
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error(`Error sending paste message to tab ${infoToSend.tabId} (attempt ${retryCount + 1}):`, chrome.runtime.lastError.message);
                                
                                // Retry with exponential backoff if we haven't reached max retries
                                if (retryCount < maxRetries) {
                                    retryCount++;
                                    const backoffDelay = 300 * Math.pow(2, retryCount); // Exponential backoff: 300, 600, 1200 ms
                                    console.log(`Retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${maxRetries + 1})...`);
                                    setTimeout(sendMessageWithRetry, backoffDelay);
                                } else {
                                    console.error(`Failed to send message after ${maxRetries + 1} attempts.`);
                                    // As a last resort, try injecting a content script directly
                                    tryDirectScriptInjection();
                                }
                            } else {
                                console.log(`Paste message sent to tab ${infoToSend.tabId} (delayed), response:`, response);
                            }
                        });
                    }
                    
                    // Last resort: inject a script directly into the page
                    function tryDirectScriptInjection() {
                        console.log(`Attempting direct script injection as last resort for tab ${infoToSend.tabId}`);
                        chrome.scripting.executeScript({
                            target: { tabId: infoToSend.tabId },
                            func: () => {
                                // Dispatch a custom event that content script can listen for
                                document.dispatchEvent(new CustomEvent('sentient_paste_request', { 
                                    detail: { timestamp: Date.now() }
                                }));
                                console.log('Direct paste event dispatched');
                            }
                        }).catch(err => {
                            console.error('Direct script injection failed:', err);
                        });
                    }
                    
                    // Start the retry process
                    sendMessageWithRetry();
                });
            }, 500); // Increased from 300ms to 500ms
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
    console.log("No existing popup found. Creating new popup window.");
    chrome.storage.local.get(['lastPopupState', 'lastSentientUrl'], (data) => {
        // Determine URL
        let url = sentientBaseUrl; // Default URL
        if (data.lastSentientUrl && source !== 'context_new' && source !== 'manual') {
            // Use last URL for context-based actions (but not for new chat or manual open)
            url = data.lastSentientUrl;
            console.log(`Using last Sentient URL: ${url}`);
        }

        // Determine window position/size
        const popupState = data.lastPopupState || defaultPopupState;
        console.log(`Using popup state:`, popupState);

        // Create popup window
        chrome.windows.create({
            url: url,
            type: 'popup',
            width: popupState.width,
            height: popupState.height,
            top: popupState.top,
            left: popupState.left
        }, (newWindow) => {
            if (chrome.runtime.lastError || !newWindow) {
                console.error("Failed to create popup window:", chrome.runtime.lastError?.message || "Unknown error");
                return;
            }
            console.log(`New popup window created (${newWindow.id}).`);
            sentientPopupId = newWindow.id;

            // If paste requested, set pending paste info
            if (requestPaste && newWindow.tabs && newWindow.tabs.length > 0) {
                const tabId = newWindow.tabs[0].id;
                console.log(`Setting pending paste for new window (${newWindow.id}), tab (${tabId}).`);
                pendingPasteInfo = { windowId: newWindow.id, tabId: tabId };
            }
        });
    });
}

// Inject paste script into tab
function injectPasteScript(tabId) {
    if (!tabId) {
        console.error("Cannot inject paste script: Invalid Tab ID.");
        return;
    }
    console.log(`Injecting paste script into tab ${tabId}.`);
    setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: "pasteClipboardContent" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(`Error sending paste message to tab ${tabId}:`, chrome.runtime.lastError.message);
            } else {
                console.log(`Paste message sent to tab ${tabId}, response:`, response);
            }
        });
    }, 100); // Short delay
}

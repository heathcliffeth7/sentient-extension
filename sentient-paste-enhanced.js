// sentient-paste-enhanced.js (Universal Selectors - Works with any Sentient site structure)
// Works on chat.sentient.xyz, Discord, Google, Twitter and any other site with text input

(function() {
    console.log("Sentient Paste script loaded (Universal Selectors - Works with any site structure).");

    // *** UPDATED: Universal selectors for Sentient site and other platforms ***
    const SENTIENT_SELECTORS = [
        // Original selectors
        'textarea[data-testid="query#input"]', 
        'textarea[data-testid="chat.query#input"]',
        'textarea.sentient-chat-input',
        'div[role="textbox"][contenteditable="true"].sentient-chat-input',
        'textarea[placeholder*="Send a message"]',
        'div[contenteditable="true"][placeholder*="Send a message"]',
        
        // New universal selectors for any Sentient site structure
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="mesaj"]',
        'div[contenteditable="true"][placeholder*="message"]',
        'div[contenteditable="true"][placeholder*="mesaj"]',
        'div[role="textbox"]',
        'div.chat-input',
        'div[class*="chat-input"]',
        'div[class*="message-input"]',
        'div[class*="sentient"]',
        'textarea[class*="sentient"]',
        'textarea[class*="chat"]',
        'textarea[class*="message"]',
        
        // Extremely generic fallbacks (lowest priority, but will work on almost any chat interface)
        'textarea',
        'div[contenteditable="true"]',
        'div[role="textbox"][contenteditable="true"]'
    ];
    
    const DISCORD_SELECTORS = [
        'div[role="textbox"][contenteditable="true"][class*="slateTextArea"]',
        'div[role="textbox"][aria-multiline="true"][contenteditable="true"][data-slate-editor="true"]',
        'div[role="textbox"][aria-multiline="true"][aria-label*="Message"][contenteditable="true"]'
    ];
    
    const GOOGLE_SELECTORS = [
        'textarea[name="q"]', 
        'input[name="q"]', 
        'textarea[aria-label*="Search"]'
    ];
    
    const TWITTER_SELECTORS = [
        'input[data-testid="SearchBox_Search_Input"]',
        'div[data-testid="tweetTextarea_0"][role="textbox"]',
        'div[role="textbox"][aria-label*="Tweet text"]',
        'div[role="textbox"][aria-label*="Add text"]'
    ];
    
    // Combine all selectors
    const ALL_SELECTORS = [...SENTIENT_SELECTORS, ...DISCORD_SELECTORS, ...GOOGLE_SELECTORS, ...TWITTER_SELECTORS];
    const INPUT_SELECTOR = ALL_SELECTORS.join(', ');
    
    console.log("Input selector to use:", INPUT_SELECTOR); // Log selector

    // Visual feedback helper function (Optional)
    function visualFeedback(element, success) {
        if (!element) return;
        const originalBorder = element.style.border;
        element.style.border = success ? "2px solid lightgreen" : "2px solid red";
        console.log(`Sentient Paste: Visual feedback ${success ? 'success (green)' : 'failed (red)'}.`);
        setTimeout(() => {
            try { element.style.border = originalBorder; } catch(e) { /* ignore */ }
        }, 1000);
    }

    // Enhanced function to find input field with multiple strategies
    async function findInputField(prioritySelectors) {
        console.log("Sentient Paste: Starting enhanced input field search");
        let targetInput = null;
        
        // Enhanced retry settings
        let maxRetries = 25; // Significantly increased for resilience
        let retries = maxRetries;
        let initialRetryDelay = 100; // Start with a very short delay
        let currentRetryDelay = initialRetryDelay;
        let maxRetryDelay = 1200; // Increased maximum delay cap
        
        // Strategy 1: Try priority selectors immediately
        for (const selector of prioritySelectors) {
            targetInput = document.querySelector(selector);
            if (targetInput) {
                console.log(`Sentient Paste: Input found immediately with selector: ${selector}`);
                return targetInput;
            }
        }
        
        // Strategy 2: Try focused element if it's editable
        const activeElement = document.activeElement;
        if (activeElement && (
            activeElement instanceof HTMLInputElement || 
            activeElement instanceof HTMLTextAreaElement || 
            activeElement.isContentEditable
        )) {
            console.log("Sentient Paste: Using currently focused element as input");
            return activeElement;
        }
        
        // Strategy 3: Adaptive retry with multiple selector approaches
        while (retries > 0) {
            // Try each priority selector first
            for (const selector of prioritySelectors) {
                targetInput = document.querySelector(selector);
                if (targetInput) {
                    console.log(`Sentient Paste: Input found with priority selector: ${selector}`);
                    return targetInput;
                }
            }
            
            // Try all selectors combined
            targetInput = document.querySelector(INPUT_SELECTOR);
            if (targetInput) {
                console.log("Sentient Paste: Input found with combined selectors");
                return targetInput;
            }
            
            // Strategy 4: Try finding any visible input element
            const allInputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
            for (const input of allInputs) {
                if (input.checkVisibility && input.checkVisibility()) {
                    console.log("Sentient Paste: Input found by scanning all visible inputs");
                    return input;
                }
            }
            
            console.log(`Sentient Paste: Target input not found, retrying (${retries} left) with delay ${currentRetryDelay}ms...`);
            retries--;
            
            if (retries > 0) {
                // Wait with adaptive delay
                await new Promise(resolve => setTimeout(resolve, currentRetryDelay));
                
                // Adaptive delay strategy: increase delay with each retry but cap at maximum
                currentRetryDelay = Math.min(currentRetryDelay * 1.2, maxRetryDelay);
            }
        }
        
        console.error("Sentient Paste: Failed to find input field after all strategies");
        return null;
    }

    // Async function to read clipboard and paste to target input
    async function pasteFromClipboard() {
        console.log("Sentient Paste: Message-triggered 'pasteFromClipboard' function started.");
        let textToPaste = "";
        let targetInput = null;

        try {
            textToPaste = await navigator.clipboard.readText();
            if (!textToPaste) {
                console.log("Sentient Paste: Clipboard empty, no paste performed.");
                return { success: false, reason: "Clipboard empty" };
            }
            console.log("Sentient Paste: Text read from clipboard.");
        } catch (error) {
            console.error("Sentient Paste: Error reading clipboard:", error);
            return { success: false, reason: "Clipboard read error", message: error.message };
        }

        // Determine which platform we're on
        const hostname = window.location.hostname;
        let prioritySelectors = SENTIENT_SELECTORS; // Default to Sentient
        
        if (hostname.includes('discord.com')) {
            prioritySelectors = DISCORD_SELECTORS;
        } else if (hostname.includes('google.')) {
            prioritySelectors = GOOGLE_SELECTORS;
        } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            prioritySelectors = TWITTER_SELECTORS;
        }
        
        // Use enhanced input field finder
        targetInput = await findInputField(prioritySelectors);

        if (!targetInput) {
            console.error(`Sentient Paste: Target input field not found.`);
            return { success: false, reason: "Input not found" };
        }

        // If input found, continue...
        console.log("Sentient Paste: Input field found:", targetInput);
        let pasteAttemptSuccess = false;
        try {
            console.log("Sentient Paste: Attempting paste and event triggering...");
            targetInput.focus();
            console.log("Sentient Paste: Focused.");

            if (targetInput.tagName === 'TEXTAREA' || targetInput.tagName === 'INPUT') {
                targetInput.value = textToPaste;
            } else if (targetInput.isContentEditable) {
                targetInput.textContent = textToPaste;
            }
            console.log("Sentient Paste: Value/textContent set.");

            targetInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            console.log("Sentient Paste: Input event triggered.");
            targetInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            console.log("Sentient Paste: Change event triggered.");
            targetInput.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log("Sentient Paste: Blur event triggered.");

            if (targetInput.setSelectionRange) {
                targetInput.setSelectionRange(targetInput.value.length, targetInput.value.length);
                console.log("Sentient Paste: setSelectionRange called.");
            }

            console.log("Sentient Paste: Paste and events successfully triggered.");
            pasteAttemptSuccess = true;

        } catch(pasteError) {
            console.error("Sentient Paste: Error during paste or event triggering:", pasteError);
            pasteAttemptSuccess = false;
        }

        visualFeedback(targetInput, pasteAttemptSuccess);
        console.log(`Sentient Paste: pasteFromClipboard function finished (Success: ${pasteAttemptSuccess}).`);
        return { success: pasteAttemptSuccess };
    }

    // Direct paste function that can be called with text
    async function pasteText(text) {
        console.log("Sentient Paste: Direct paste function called with text.");
        
        // Determine which platform we're on
        const hostname = window.location.hostname;
        let prioritySelectors = SENTIENT_SELECTORS; // Default to Sentient
        
        if (hostname.includes('discord.com')) {
            prioritySelectors = DISCORD_SELECTORS;
        } else if (hostname.includes('google.')) {
            prioritySelectors = GOOGLE_SELECTORS;
        } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            prioritySelectors = TWITTER_SELECTORS;
        }
        
        // Use enhanced input field finder
        const targetInput = await findInputField(prioritySelectors);

        if (!targetInput) {
            console.error(`Sentient Paste: Target input field not found.`);
            return { success: false, reason: "Input not found" };
        }

        // If input found, continue...
        console.log("Sentient Paste: Input field found:", targetInput);
        let pasteAttemptSuccess = false;
        try {
            console.log("Sentient Paste: Attempting paste and event triggering...");
            targetInput.focus();
            console.log("Sentient Paste: Focused.");

            if (targetInput.tagName === 'TEXTAREA' || targetInput.tagName === 'INPUT') {
                targetInput.value = text;
            } else if (targetInput.isContentEditable) {
                targetInput.textContent = text;
            }
            console.log("Sentient Paste: Value/textContent set.");

            targetInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            console.log("Sentient Paste: Input event triggered.");
            targetInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            console.log("Sentient Paste: Change event triggered.");
            targetInput.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log("Sentient Paste: Blur event triggered.");

            if (targetInput.setSelectionRange) {
                targetInput.setSelectionRange(targetInput.value.length, targetInput.value.length);
                console.log("Sentient Paste: setSelectionRange called.");
            }

            console.log("Sentient Paste: Paste and events successfully triggered.");
            pasteAttemptSuccess = true;

        } catch(pasteError) {
            console.error("Sentient Paste: Error during paste or event triggering:", pasteError);
            pasteAttemptSuccess = false;
        }

        visualFeedback(targetInput, pasteAttemptSuccess);
        console.log(`Sentient Paste: pasteText function finished (Success: ${pasteAttemptSuccess}).`);
        return { success: pasteAttemptSuccess };
    }

    // Only listen to messages from background.js
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("Sentient Paste: Message received:", message);
        if (message.action === "pasteClipboardContent") {
            console.log("Sentient Paste: 'pasteClipboardContent' message received, attempting paste...");
            pasteFromClipboard().then(result => {
                console.log("Sentient Paste: Paste attempt result:", result);
                sendResponse({ status: result.success ? "Paste successful" : `Paste failed (${result.reason || 'unknown'})`, result: result });
            }).catch(error => {
                console.error("Sentient Paste: Unexpected error in pasteFromClipboard:", error);
                sendResponse({ status: "Paste error: " + error.message, error: error });
            });
            return true; // Asynchronous response
        } else if (message.action === "pasteText") {
            console.log("Sentient Paste: 'pasteText' message received, attempting paste...");
            pasteText(message.text).then(result => {
                console.log("Sentient Paste: Paste attempt result:", result);
                sendResponse({ status: result.success ? "Paste successful" : `Paste failed (${result.reason || 'unknown'})`, result: result });
            }).catch(error => {
                console.error("Sentient Paste: Unexpected error in pasteText:", error);
                sendResponse({ status: "Paste error: " + error.message, error: error });
            });
            return true; // Asynchronous response
        } else {
            console.log("Sentient Paste: Unknown message action:", message.action);
            return false;
        }
    });
    console.log("Sentient Paste: Message listener active.");
})(); // IIFE End

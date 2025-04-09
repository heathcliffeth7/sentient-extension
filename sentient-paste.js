// sentient-paste.js (Fixed Selector - Only Pastes via Message - Final Version)
// ONLY works on chat.sentient.xyz

(function() {
    console.log("Sentient Paste script loaded (vFixed Selector - Only Pastes via Message).");

    // *** MODIFIED: Selector updated ***
    const INPUT_SELECTOR = 'textarea[data-testid="query#input"], textarea[data-testid="chat.query#input"]';
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

        // Find input field (with retry and delay logic)
        let retries = 10;
        const retryDelay = 300;
        while (!targetInput && retries > 0) {
            targetInput = document.querySelector(INPUT_SELECTOR); // Using updated selector
            if (targetInput) break;
            console.log(`Sentient Paste: Target input ('${INPUT_SELECTOR}') not found, retrying (${retries} left)...`);
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        if (!targetInput) {
            // *** Error message now shows current selector ***
            console.error(`Sentient Paste: Target input field ('${INPUT_SELECTOR}') not found.`);
             visualFeedback(targetInput, false);
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
        } else {
             console.log("Sentient Paste: Unknown message action:", message.action);
            return false;
        }
    });
    console.log("Sentient Paste: Message listener active.");
})(); // IIFE End

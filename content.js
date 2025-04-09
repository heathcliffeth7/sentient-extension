// content.js (With Bug Fixes - isDiscord, sendWithRetry, Auto /st Completion, Focus Fixes, data-testid fix - Final Version + Discord Cleaning Removed + BUTTON ADDING FIX)

(function() {
    console.log("Sentient content script v1.14 (With Button Adding Fix) loaded."); // Version note updated

    // --- Floating Button and Drag Logic ---
    const buttonId = 'sentient-logo-button';
    let button = document.getElementById(buttonId);
    if (!button) {
        button = document.createElement('button');
        button.id = buttonId;
        // *** CORRECTED LINE ***
        // Add the button to the body element (if it exists) or the html element (if body doesn't exist)
        (document.body || document.documentElement).appendChild(button);
        // *** END OF CORRECTION ***
        console.log("Sentient logo button created and added."); // Log message updated
    }
    let isDragging = false;
    let wasPotentiallyDragging = false;
    let dragStartTime = 0;
    let startX = 0, startY = 0;
    const CLICK_THRESHOLD_PX = 5;
    let offsetX, offsetY;
    if (button) {
        button.onmousedown = function(e) {
            if (e.button !== 0) return;
            wasPotentiallyDragging = true;
            dragStartTime = Date.now();
            startX = e.clientX;
            startY = e.clientY;
            const rect = button.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        };
    } else {
        console.error("Sentient button element not found for mousedown listener.");
    }
    document.onmousemove = function(e) {
        if (wasPotentiallyDragging && !isDragging) {
            const moveX = Math.abs(e.clientX - startX);
            const moveY = Math.abs(e.clientY - startY);
            if (moveX > CLICK_THRESHOLD_PX || moveY > CLICK_THRESHOLD_PX) {
                isDragging = true;
                if (button) button.style.cursor = 'grabbing';
            }
        }
        if (!isDragging || !button) return;
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;
        const BORDER_MARGIN = 10;
        newX = Math.max(BORDER_MARGIN, Math.min(newX, window.innerWidth - button.offsetWidth - BORDER_MARGIN));
        newY = Math.max(BORDER_MARGIN, Math.min(newY, window.innerHeight - button.offsetHeight - BORDER_MARGIN));
        button.style.left = newX + 'px';
        button.style.top = newY + 'px';
    };
    document.onmouseup = function(e) {
        if (e.button !== 0 || !wasPotentiallyDragging) return;
        if (!isDragging) {
            console.log("Sentient logo button clicked.");
            try {
                if (chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ action: "openSentientPopup" }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("Error sending popup open message:", chrome.runtime.lastError.message);
                        } else if (response) {
                            console.log("Popup open request sent, response:", response);
                        }
                    });
                } else {
                    console.warn("chrome.runtime or sendMessage not available.");
                }
            } catch (error) {
                console.error("JS error occurred while calling sendMessage:", error);
            }
        } else if (button) {
            button.style.cursor = 'pointer';
        }
        isDragging = false;
        wasPotentiallyDragging = false;
    };
    // --- End of Floating Button ---

    // --- /st Command Logic (SITE SPECIFIC - Trigger with Enter + Auto Completion + Focus Fixes + data-testid fix - Final Version + Discord Cleaning Removed) ---
    console.log("Sentient Site Specific /st (Enter) command listener active.");

    const ST_COMMAND = "/st ";
    const SENTIENT_CHAT_URL_PATTERN = "https://chat.sentient.xyz/c/"; // Should be the same as in sentient-paste.js
    const targetSites = {
        "google": ['textarea[name="q"]', 'input[name="q"]', 'textarea[aria-label*="Search"]', 'textarea[aria-label*="Ara"]'], // Note: "Ara" is Turkish for "Search"
        "twitter": ['input[data-testid="SearchBox_Search_Input"]', 'div[data-testid="tweetTextarea_0"][role="textbox"]', 'div[role="textbox"][aria-label*="Tweet text"]', 'div[role="textbox"][aria-label*="Add text"]', 'div[role="textbox"][aria-label*="Metin ekle"]'], // Note: "Metin ekle" is Turkish for "Add text"
        "discord": ['div[role="textbox"][contenteditable="true"][class*="slateTextArea"]', 'div[role="textbox"][aria-multiline="true"][contenteditable="true"][data-slate-editor="true"][class*="slateTextArea_"]', 'div[role="textbox"][aria-multiline="true"][aria-label*="kanalına mesaj gönder"][contenteditable="true"][data-slate-editor="true"]', 'div[role="textbox"][aria-multiline="true"][aria-label*="Message #"][contenteditable="true"][data-slate-editor="true]'] // Note: "kanalına mesaj gönder" is Turkish for "send message to channel"
    };
    let commandProcessed = new WeakSet();
    let lastStCommand = ""; // Variable to store the last /st command

    document.addEventListener('input', function(e) {
        const target = e.target;
        const isEditable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLDivElement && target.isContentEditable);
        if (!isEditable || !target.checkVisibility()) {
            return;
        }

        const currentValue = target.value !== undefined ? target.value : target.textContent; // Use textContent for contentEditable

        if (currentValue && currentValue.startsWith(ST_COMMAND)) {
            if (currentValue.trim() !== ST_COMMAND.trim()) {
                lastStCommand = currentValue; // Store the full command if it has text after /st
            } else if (lastStCommand && currentValue.trim() === ST_COMMAND.trim()) {
                // User deleted back to just "/st ", restore the last command
                if (target.value !== undefined) {
                    target.value = lastStCommand;
                } else {
                    target.textContent = lastStCommand;
                }
                // Move cursor to end
                if (target.setSelectionRange) { // Works for input/textarea
                    const len = lastStCommand.length;
                    target.setSelectionRange(len, len);
                } else if (window.getSelection && document.createRange) { // Works for contentEditable
                    const range = document.createRange();
                    range.selectNodeContents(target);
                    range.collapse(false); // Collapse to end
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }

                // If the user just typed "/st " and is on chat.sentient.xyz, trigger paste
                if (window.location.href.startsWith(SENTIENT_CHAT_URL_PATTERN) && navigator.clipboard) {
                    navigator.clipboard.readText().then(clipboardText => {
                        if (clipboardText) {
                            console.log("Content Script: '/st ' typed on sentient, sending paste from clipboard request.");
                            // Sending message to background which will send it to sentient-paste.js
                            chrome.runtime.sendMessage({ action: "pasteClipboardContentOnFocus" });
                        }
                    }).catch(err => {
                        console.error("Content Script: Error reading clipboard:", err);
                    });
                }
            }
        }

        // Try to focus the input field (might help in some edge cases)
        // Removed focus attempt from 'input' event as it can cause issues; focus is handled on keydown/command completion.
    });

    document.addEventListener('keydown', function(e) {
        const target = e.target;
        const isEditable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLDivElement && target.isContentEditable);
        if (!isEditable || !target.checkVisibility()) {
            return;
        }

        const hostname = window.location.hostname;
        const isDiscord = hostname.includes('discord.com');
        let selectors = null;
        let isContentEditableTarget = (target instanceof HTMLDivElement && target.isContentEditable); // Check if the target is contentEditable div

        if (e.key !== 'Enter') {
            // Clear the processed flag if the text no longer starts with /st
            const currentValueCheck = target.value !== undefined ? target.value : target.textContent;
            if (commandProcessed.has(target) && (!currentValueCheck || !currentValueCheck.startsWith(ST_COMMAND))) {
                commandProcessed.delete(target);
            }
            return; // Only care about Enter key
        }

        // ---- If Enter was pressed, continue ----

        // Site-specific checks
        if (hostname.includes('google.')) {
            selectors = targetSites.google;
             if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement)) return; // Google uses textarea/input
             isContentEditableTarget = false; // Explicitly set for Google
        } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            selectors = targetSites.twitter;
            // Twitter can use input (search) or div (tweet box)
            if (!( (target instanceof HTMLInputElement) || (target instanceof HTMLDivElement && target.isContentEditable) )) return;
            isContentEditableTarget = (target instanceof HTMLDivElement && target.isContentEditable); // Re-check for Twitter
        } else if (isDiscord) {
            selectors = targetSites.discord;
             if (!(target instanceof HTMLDivElement && target.isContentEditable)) return; // Discord uses contentEditable div
             isContentEditableTarget = true; // Explicitly set for Discord
        } else {
            // Not a targeted site for /st Enter command
            return;
        }

        // Check if the focused element matches the site's selectors
        if (!selectors || !target.matches(selectors.join(','))) {
            return;
        }

        const currentValue = isContentEditableTarget ? target.textContent : target.value;

        if (currentValue && currentValue.startsWith(ST_COMMAND)) {
            const query = currentValue.substring(ST_COMMAND.length).trim();

            if (query) {
                // If already processing, ignore subsequent Enter presses
                if (commandProcessed.has(target)) {
                    console.log("Command already being processed, Enter ignored.");
                    e.preventDefault(); e.stopImmediatePropagation(); return;
                }
                console.log(`/st command triggered with Enter (${hostname}). Query: "${query}"`);
                e.preventDefault(); e.stopImmediatePropagation(); // Prevent default Enter behavior (like submitting form/newline)
                commandProcessed.add(target); // Flag as processing

                // Function to send message to background (Standalone with retry)
                const sendMessageWithRetry = (message, callback, retryCount = 3) => {
                    setTimeout(() => { // Use setTimeout to avoid potential blocking issues
                        try {
                            if (chrome.runtime && chrome.runtime.sendMessage) {
                                chrome.runtime.sendMessage(message, (response) => {
                                    if (chrome.runtime.lastError) {
                                        console.error(`/st msg error (${hostname}):`, chrome.runtime.lastError.message);
                                        if (retryCount > 0) {
                                            console.log("sendMessage error, retrying...");
                                            setTimeout(() => sendMessageWithRetry(message, callback, retryCount - 1), 100); // Retry after a short delay
                                        } else {
                                            console.error("sendMessage failed after retries.");
                                            if (callback) callback({ status: "Error: sendMessage failed after retries." });
                                        }
                                    } else {
                                        if (callback) callback(response); // Success
                                    }
                                });
                            } else {
                                console.warn("chrome.runtime unavailable for sendMessage.");
                                if (callback) callback({ status: "Error: chrome.runtime unavailable." });
                            }
                        } catch (error) {
                            console.error("JS error calling sendMessage:", error);
                             if (retryCount > 0) {
                                console.log("sendMessage JS error, retrying...");
                                setTimeout(() => sendMessageWithRetry(message, callback, retryCount - 1), 100);
                            } else {
                                console.error("sendMessage failed after retries due to JS error.");
                                if (callback) callback({ status: "Error: sendMessage failed after retries due to JS error." });
                            }
                        }
                    }, 0); // SetTimeout 0ms for async execution
                };

                // Send the query to the background script
                sendMessageWithRetry({ action: "processStCommand", query: query }, (response) => {
                    commandProcessed.delete(target); // Remove the flag when processing is done
                    if (response && !response.status?.startsWith("Error:")) {
                        console.log(`/st command processed successfully by background.`);
                        // Clear the input field after successful processing
                         if (isContentEditableTarget) {
                             target.textContent = '';
                             // Dispatch input event for contentEditable (React might need this)
                             target.dispatchEvent(new Event('input', { bubbles: true, data: '', inputType: 'deleteContentBackward' })); // Simulate backspace clearing
                         } else { // Input or Textarea
                             target.value = '';
                             // Dispatch input/change events for input/textarea
                             target.dispatchEvent(new Event('input', { bubbles: true }));
                             target.dispatchEvent(new Event('change', { bubbles: true }));
                         }
                        target.focus(); // Re-focus the input field
                        console.log("Input field cleared and focused after /st command.");
                    } else {
                        console.error("Error or invalid response received from background for /st operation:", response);
                        // Do not clear the input on error, let user retry or fix
                        target.focus(); // Re-focus anyway
                    }
                });

            } else { // Query is empty (just "/st ")
                // Prevent default Enter behavior (e.g., newline in Discord) but don't process
                e.preventDefault(); e.stopImmediatePropagation();
                console.log("/st triggered with Enter but the query was empty.");
            }
        }
        // If it doesn't start with /st, Enter works normally (do nothing here)

    }, true); // Use capturing phase to potentially stop event propagation earlier

    // --- End of /st Command Logic ---

})(); // End of IIFE

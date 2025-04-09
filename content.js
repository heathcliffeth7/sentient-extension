// content.js (With Bug Fixes - isDiscord, sendWithRetry, Auto /st Completion, Focus Fixes, data-testid Fix - Final Version + Discord Cleanup Removed + BUTTON ADDITION FIX)

(function() {
    console.log("Sentient content script v1.14 (With Button Addition Fix) loaded."); // Version note updated

    // --- Floating Button and Drag Logic ---
    const buttonId = 'sentient-logo-button';
    let button = document.getElementById(buttonId);
    if (!button) {
        button = document.createElement('button');
        button.id = buttonId;
        // *** FIXED LINE ***
        // Add button to body element (if exists) or html element (if no body)
        (document.body || document.documentElement).appendChild(button);
        // *** FIX END ***
        console.log("Sentient logo button created and added."); // Updated log message
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
                console.error("JS error calling sendMessage:", error);
            }
        } else if (button) {
            button.style.cursor = 'pointer';
        }
        isDragging = false;
        wasPotentiallyDragging = false;
    };
    // --- Floating Button End ---

    // --- /st Command Logic (SITE-SPECIFIC - Enter Trigger + Auto-Completion + Focus Fixes + data-testid Fix - Final Version + Discord Cleanup Removed) ---
    console.log("Sentient Site-Specific /st (Enter) command listener active.");

    const ST_COMMAND = "/st ";
    const SENTIENT_CHAT_URL_PATTERN = "https://chat.sentient.xyz/c/"; // Must match sentient-paste.js
    const targetSites = {
        "google": ['textarea[name="q"]', 'input[name="q"]', 'textarea[aria-label*="Search"]', 'textarea[aria-label*="Ara"]'],
        "twitter": ['input[data-testid="SearchBox_Search_Input"]', 'div[data-testid="tweetTextarea_0"][role="textbox"]', 'div[role="textbox"][aria-label*="Tweet text"]', 'div[role="textbox"][aria-label*="Add text"]', 'div[role="textbox"][aria-label*="Metin ekle"]'],
        "discord": ['div[role="textbox"][contenteditable="true"][class*="slateTextArea"]', 'div[role="textbox"][aria-multiline="true"][contenteditable="true"][data-slate-editor="true"][class*="slateTextArea_"]', 'div[role="textbox"][aria-multiline="true"][aria-label*="kanalına mesaj gönder"][contenteditable="true"][data-slate-editor="true"]', 'div[role="textbox"][aria-multiline="true"][aria-label*="Message #"][contenteditable="true"][data-slate-editor="true"]']
    };
    let commandProcessed = new WeakSet();
    let lastStCommand = ""; // Variable to store last /st command

    document.addEventListener('input', function(e) {
        const target = e.target;
        const isEditable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLDivElement && target.isContentEditable);
        if (!isEditable || !target.checkVisibility()) {
            return;
        }

        const currentValue = isEditable ? target.textContent : target.value;

        if (currentValue && currentValue.startsWith(ST_COMMAND)) {
            if (currentValue.trim() !== ST_COMMAND.trim()) {
                lastStCommand = currentValue;
            } else if (lastStCommand && currentValue.trim() === ST_COMMAND.trim()) {
                if (isEditable) {
                    target.textContent = lastStCommand;
                } else {
                    target.value = lastStCommand;
                }
                if (target.setSelectionRange) {
                    const len = lastStCommand.length;
                    target.setSelectionRange(len, len);
                }

                // If user only typed "/st " and is on chat.sentient.xyz
                if (window.location.href.startsWith(SENTIENT_CHAT_URL_PATTERN) && navigator.clipboard) {
                    navigator.clipboard.readText().then(clipboardText => {
                        if (clipboardText) {
                            console.log("Content Script: '/st ' typed, sending paste request from clipboard.");
                            chrome.runtime.sendMessage({ action: "pasteClipboardContentOnFocus" });
                        }
                    }).catch(err => {
                        console.error("Content Script: Clipboard read error:", err);
                    });
                }
            }
        }

        // Try to focus the input field
        if (isEditable) {
            target.focus();
        }
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
        let isContentEditableTarget = false;

        if (e.key !== 'Enter') {
            const currentValueCheck = target.value !== undefined ? target.value : target.textContent;
            if (commandProcessed.has(target) && (!currentValueCheck || !currentValueCheck.startsWith(ST_COMMAND))) {
                commandProcessed.delete(target);
            }
            return;
        }

        // ---- Enter key pressed ----

        // Site-specific checks
        if (hostname.includes('google.')) {
            selectors = targetSites.google;
            if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) isContentEditableTarget = false; else return;
        } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            selectors = targetSites.twitter;
            if (target instanceof HTMLDivElement && target.isContentEditable) isContentEditableTarget = true;
            else if (target instanceof HTMLInputElement) isContentEditableTarget = false; else return;
        } else if (isDiscord) {
            selectors = targetSites.discord;
            if (target instanceof HTMLDivElement && target.isContentEditable) isContentEditableTarget = true; else return;
        } else {
            return;
        }

        if (!selectors || !target.matches(selectors.join(','))) {
            return;
        }

        const currentValue = isContentEditableTarget ? target.textContent : target.value;

        if (currentValue && currentValue.startsWith(ST_COMMAND)) {
            const query = currentValue.substring(ST_COMMAND.length).trim();

            if (query) {
                if (commandProcessed.has(target)) {
                    console.log("Command already processing, Enter ignored.");
                    e.preventDefault(); e.stopImmediatePropagation(); return;
                }
                console.log(`/st command triggered by Enter (${hostname}). Query: "${query}"`);
                e.preventDefault(); e.stopImmediatePropagation();
                commandProcessed.add(target);

                // Message to background function (Standalone)
                const sendMessageWithRetry = (message, callback, retryCount = 3) => {
                    setTimeout(() => {
                        try {
                            if (chrome.runtime && chrome.runtime.sendMessage) {
                                chrome.runtime.sendMessage(message, (response) => {
                                    if (chrome.runtime.lastError) {
                                        console.error(`/st msg error (${hostname}):`, chrome.runtime.lastError.message);
                                        if (retryCount > 0) {
                                            console.log("sendMessage error, retrying...");
                                            setTimeout(() => sendMessageWithRetry(message, callback, retryCount - 1), 100);
                                        } else {
                                            console.error("sendMessage failed.");
                                            if (callback) callback({ status: "Error: sendMessage failed after retries." });
                                        }
                                    } else {
                                        if (callback) callback(response);
                                    }
                                });
                            } else {
                                console.warn("chrome.runtime unavailable.");
                                if (callback) callback({ status: "Error: chrome.runtime unavailable." });
                            }
                        } catch (error) {
                            console.error("JS error calling sendMessage:", error);
                            if (retryCount > 0) {
                                console.log("sendMessage JS error, retrying...");
                                setTimeout(() => sendMessageWithRetry(message, callback, retryCount - 1), 100);
                            } else {
                                console.error("sendMessage failed after JS error retries.");
                                if (callback) callback({ status: "Error: sendMessage failed after retries." });
                            }
                        }
                    }, 0);
                };

                sendMessageWithRetry({ action: "processStCommand", query: query }, (response) => {
                    commandProcessed.delete(target); // Remove flag when done
                    if (response && !response.status?.startsWith("Error:")) {
                        if (isDiscord && isContentEditableTarget) {
                            // clearDiscordInput(target);  // clearDiscordInput function removed
                            console.log("Discord special cleanup done. (Function removed)");
                        } else {
                            if (isContentEditableTarget) target.textContent = '';
                            else target.value = '';
                            console.log("Standard cleanup done.");
                        }
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log("Input/Change events triggered.");
                    } else {
                        console.error("Received error or invalid response from background for /st processing:", response);
                    }
                });

            } else { // Empty query
                // Only prevent Enter
                e.preventDefault(); e.stopImmediatePropagation();
                console.log("/st triggered by Enter but query was empty.");
            }
        }
        // If not starting with /st, Enter works normally (do nothing)

    }, true); // Capturing phase

    // --- /st Command Logic End ---

})(); // IIFE End

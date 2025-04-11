// content.js (With Bug Fixes - isDiscord, sendWithRetry, Auto /st Completion, Focus Fixes, data-testid Fix - Final Version + Discord Cleanup Removed + BUTTON ADDITION FIX + Send Sentient Button + Language Translation)

(function() {
    console.log("Sentient content script v1.16 (With Send Sentient Button and Language Translation) loaded.");

    // --- Settings and State Variables ---
    let settings = {
        showFloatingButton: true,
        showContextMenu: true,
        showSelectionMenu: true,
        showSummarize: true,
        showExplain: true,
        showNewChat: true,
        showSendSentient: true,
        customCommands: [],
        selectedLanguage: ''
    };
    
    // Load settings from storage
    chrome.storage.sync.get({
        showFloatingButton: true,
        showContextMenu: true,
        showSelectionMenu: true,
        showSummarize: true,
        showExplain: true,
        showNewChat: true,
        showSendSentient: true,
        customCommands: [],
        selectedLanguage: ''
    }, function(items) {
        settings = items;
        updateUIBasedOnSettings();
    });
    
    // Listen for settings changes
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        if (message.action === 'settingsUpdated') {
            settings = message.settings;
            updateUIBasedOnSettings();
        }
        return false;
    });
    
    // Update UI based on settings
    function updateUIBasedOnSettings() {
        // Handle floating button visibility
        const button = document.getElementById('sentient-logo-button');
        if (button) {
            button.style.display = settings.showFloatingButton ? 'block' : 'none';
        }
        
        // Update selection menu if it exists
        updateSelectionMenu();
    }

    // --- Floating Button and Drag Logic ---
    const buttonId = 'sentient-logo-button';
    let button = document.getElementById(buttonId);
    if (!button) {
        button = document.createElement('button');
        button.id = buttonId;
        // Add button to body element (if exists) or html element (if no body)
        (document.body || document.documentElement).appendChild(button);
        // Apply initial visibility based on settings
        if (button && !settings.showFloatingButton) {
            button.style.display = 'none';
        }
        console.log("Sentient logo button created and added.");
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

    // --- Selection Menu Logic ---
    let selectionMenu = null;
    let selectionTimeout = null;
    
    // Create selection menu if it doesn't exist
    function createSelectionMenu() {
        if (selectionMenu) return;
        
        selectionMenu = document.createElement('div');
        selectionMenu.id = 'sentient-selection-menu';
        selectionMenu.className = 'sentient-selection-menu';
        selectionMenu.style.display = 'none';
        
        // Create logo container
        const logoContainer = document.createElement('div');
        logoContainer.className = 'sentient-logo-container';
        
        // Create logo image
        const logoImg = document.createElement('img');
        logoImg.src = chrome.runtime.getURL('images/sentient-logo.png');
        logoImg.className = 'sentient-logo';
        logoImg.alt = 'Sentient Logo';
        
        // Add logo to container
        logoContainer.appendChild(logoImg);
        
        // Add logo to menu
        selectionMenu.appendChild(logoContainer);
        
        // Create and add standard buttons based on settings
        if (settings.showSummarize) {
            const summarizeBtn = createButton('Summarize', handleSummarize);
            summarizeBtn.id = 'summarize-button';
            selectionMenu.appendChild(summarizeBtn);
        }
        
        if (settings.showExplain) {
            const explainBtn = createButton('Explain', handleExplain);
            explainBtn.id = 'explain-button';
            selectionMenu.appendChild(explainBtn);
        }
        
        if (settings.showNewChat) {
            const newChatBtn = createButton('New Chat', handleNewChat);
            newChatBtn.id = 'newchat-button';
            selectionMenu.appendChild(newChatBtn);
        }
        
        if (settings.showSendSentient) {
            const sendSentientBtn = createButton('Send Sentient', handleSendSentient);
            sendSentientBtn.id = 'sendsentient-button';
            selectionMenu.appendChild(sendSentientBtn);
        }
        
        // Add custom command buttons
        if (settings.customCommands && settings.customCommands.length > 0) {
            settings.customCommands.forEach((command, index) => {
                const customBtn = createButton(command, function() {
                    handleCustomCommand(command);
                });
                customBtn.id = `custom-command-${index}`;
                selectionMenu.appendChild(customBtn);
            });
        }
        
        // Add translation button if language is selected
        if (settings.selectedLanguage) {
            const translateBtn = createButton(`Translate to ${settings.selectedLanguage}`, handleTranslate);
            translateBtn.id = 'translate-button';
            selectionMenu.appendChild(translateBtn);
        }
        
        // Add menu to document
        (document.body || document.documentElement).appendChild(selectionMenu);
        
        // Add CSS for menu
        const style = document.createElement('style');
        style.textContent = `
            .sentient-selection-menu {
                position: absolute;
                display: flex;
                flex-wrap: wrap;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 9999999;
                padding: 8px;
                max-width: 400px;
            }
            .sentient-logo-container {
                width: 100%;
                display: flex;
                justify-content: center;
                margin-bottom: 8px;
                padding-bottom: 8px;
                border-bottom: 1px solid #eee;
            }
            .sentient-logo {
                width: 40px;
                height: 40px;
                object-fit: contain;
            }
            .sentient-selection-btn {
                background: #FFFFFF;
                color: #000000;
                font-weight: bold;
                border: 1px solid #CCCCCC;
                border-radius: 4px;
                padding: 8px 12px;
                margin: 4px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            }
            .sentient-selection-btn:hover {
                background: #F5F5F5;
                transform: translateY(-1px);
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Update selection menu based on settings
    function updateSelectionMenu() {
        if (!selectionMenu) return;
        
        // Remove all buttons except logo container
        const logoContainer = selectionMenu.querySelector('.sentient-logo-container');
        while (selectionMenu.lastChild !== logoContainer) {
            selectionMenu.removeChild(selectionMenu.lastChild);
        }
        
        // Add standard buttons based on settings
        if (settings.showSummarize) {
            const summarizeBtn = createButton('Summarize', handleSummarize);
            summarizeBtn.id = 'summarize-button';
            selectionMenu.appendChild(summarizeBtn);
        }
        
        if (settings.showExplain) {
            const explainBtn = createButton('Explain', handleExplain);
            explainBtn.id = 'explain-button';
            selectionMenu.appendChild(explainBtn);
        }
        
        if (settings.showNewChat) {
            const newChatBtn = createButton('New Chat', handleNewChat);
            newChatBtn.id = 'newchat-button';
            selectionMenu.appendChild(newChatBtn);
        }
        
        if (settings.showSendSentient) {
            const sendSentientBtn = createButton('Send Sentient', handleSendSentient);
            sendSentientBtn.id = 'sendsentient-button';
            selectionMenu.appendChild(sendSentientBtn);
        }
        
        // Add custom command buttons
        if (settings.customCommands && settings.customCommands.length > 0) {
            settings.customCommands.forEach((command, index) => {
                const customBtn = createButton(command, function() {
                    handleCustomCommand(command);
                });
                customBtn.id = `custom-command-${index}`;
                selectionMenu.appendChild(customBtn);
            });
        }
        
        // Add translation button if language is selected
        if (settings.selectedLanguage) {
            const translateBtn = createButton(`Translate to ${settings.selectedLanguage}`, handleTranslate);
            translateBtn.id = 'translate-button';
            selectionMenu.appendChild(translateBtn);
        }
    }
    
    // Helper to create a button
    function createButton(text, handler) {
        const btn = document.createElement('button');
        btn.className = 'sentient-selection-btn';
        btn.textContent = text;
        btn.addEventListener('click', handler);
        return btn;
    }
    
    // Show menu at position
    function showSelectionMenu(x, y) {
        if (!selectionMenu) createSelectionMenu();
        
        // Position menu
        selectionMenu.style.left = `${x}px`;
        selectionMenu.style.top = `${y}px`;
        selectionMenu.style.display = 'flex';
        
        // Hide menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', hideSelectionMenuOnClickOutside);
        }, 10);
    }
    
    // Hide menu
    function hideSelectionMenu() {
        if (selectionMenu) {
            selectionMenu.style.display = 'none';
            document.removeEventListener('click', hideSelectionMenuOnClickOutside);
        }
    }
    
    // Hide menu when clicking outside
    function hideSelectionMenuOnClickOutside(e) {
        if (selectionMenu && !selectionMenu.contains(e.target)) {
            hideSelectionMenu();
        }
    }
    
    // Handle selection change
    document.addEventListener('selectionchange', function() {
        // Clear any pending timeout
        if (selectionTimeout) {
            clearTimeout(selectionTimeout);
            selectionTimeout = null;
        }
        
        // Hide menu
        hideSelectionMenu();
        
        // Check if selection menu is enabled in settings
        if (!settings.showSelectionMenu) {
            return;
        }
        
        // Check if there's a selection
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
            return;
        }
        
        // Set timeout to show menu
        selectionTimeout = setTimeout(() => {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Position menu above selection
            const x = rect.left + window.scrollX + (rect.width / 2) - 100; // Center menu
            const y = rect.top + window.scrollY - 40; // Position above selection
            
            showSelectionMenu(x, y);
        }, 500); // Show after 500ms
    });
    
    // Handle button clicks
    function handleSummarize() {
        const selection = window.getSelection().toString().trim();
        if (!selection) return;
        
        hideSelectionMenu();
        sendMessageWithRetry({ 
            action: "processSelectionAction", 
            type: "summarize", 
            text: selection 
        });
    }
    
    // Handle custom command
    function handleCustomCommand(command) {
        const selection = window.getSelection().toString().trim();
        if (!selection) return;
        
        hideSelectionMenu();
        sendMessageWithRetry({ 
            action: "processSelectionAction", 
            type: "custom", 
            text: selection,
            command: command
        });
    }
    
    function handleExplain() {
        const selection = window.getSelection().toString().trim();
        if (!selection) return;
        
        hideSelectionMenu();
        sendMessageWithRetry({ 
            action: "processSelectionAction", 
            type: "explain", 
            text: selection 
        });
    }
    
    function handleNewChat() {
        const selection = window.getSelection().toString().trim();
        if (!selection) return;
        
        hideSelectionMenu();
        sendMessageWithRetry({ 
            action: "processSelectionAction", 
            type: "newchat", 
            text: selection 
        });
    }
    
    function handleSendSentient() {
        const selection = window.getSelection().toString().trim();
        if (!selection) return;
        
        hideSelectionMenu();
        sendMessageWithRetry({ 
            action: "processSelectionAction", 
            type: "sendsentient", 
            text: selection 
        });
    }
    
    function handleTranslate() {
        const selection = window.getSelection().toString().trim();
        if (!selection || !settings.selectedLanguage) return;
        
        hideSelectionMenu();
        
        let formattedText = "";
        let translationInstruction = "";
        
        // Format text according to user's request
        if (settings.selectedLanguage === "Turkish") {
            // Format as "seçilen metin" followed by "Translate Turkish"
            formattedText = `"${selection}", Translate Turkish`;
        } else {
            // For other languages, keep the original format but with quotes
            translationInstruction = `, Translate to ${settings.selectedLanguage}`;
            formattedText = `"${selection}"${translationInstruction}`;
        }
        
        // Send message to background script to open popup and paste text
        sendMessageWithRetry({ 
            action: "processSelectionAction", 
            type: "translate", 
            text: formattedText,
            language: settings.selectedLanguage
        });
    }
    
    // Message to background function (Standalone)
    const sendMessageWithRetry = (message, callback, retryCount = 3) => {
        setTimeout(() => {
            try {
                // Make sure we're in a valid extension context
                if (chrome && chrome.runtime && chrome.runtime.id) {
                    chrome.runtime.sendMessage(message, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error(`Message error:`, chrome.runtime.lastError.message);
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
                    console.warn("chrome.runtime unavailable or invalid extension context.");
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
    // --- Selection Menu Logic End ---

    // --- /st Command Logic (UNIVERSAL - Enter Trigger + Auto-Completion + Focus Fixes) ---
    console.log("Sentient Universal /st (Enter) command listener active.");

    const ST_COMMAND = "/st ";
    const SENTIENT_CHAT_URL_PATTERN = "https://chat.sentient.xyz/c/"; // Must match sentient-paste.js
    // Keep specific site selectors for backward compatibility
    const targetSites = {
        "google": ['textarea[name="q"]', 'input[name="q"]', 'textarea[aria-label*="Search"]', 'textarea[aria-label*="Ara"]'],
        "twitter": ['input[data-testid="SearchBox_Search_Input"]', 'div[data-testid="tweetTextarea_0"][role="textbox"]', 'div[role="textbox"][aria-label*="Tweet text"]', 'div[role="textbox"][aria-label*="Add text"]', 'div[role="textbox"][aria-label*="Metin ekle"]'],
        "discord": ['div[role="textbox"][contenteditable="true"][class*="slateTextArea"]', 'div[role="textbox"][aria-multiline="true"][contenteditable="true"][data-slate-editor="true"][class*="slateTextArea_"]', 'div[role="textbox"][aria-multiline="true"][aria-label*="kanalına mesaj gönder"][contenteditable="true"][data-slate-editor="true"]', 'div[role="textbox"][aria-multiline="true"][aria-label*="Message #"][contenteditable="true"][data-slate-editor="true"]']
    };
    // Universal selectors for all sites
    const universalSelectors = [
        'input[type="text"]', 
        'input[type="search"]', 
        'textarea', 
        'div[role="textbox"]', 
        'div[contenteditable="true"]',
        '[contenteditable="true"]'
    ];
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

        // Determine if target is content editable
        if (target instanceof HTMLDivElement && target.isContentEditable) {
            isContentEditableTarget = true;
        } else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            isContentEditableTarget = false;
        } else if (target.isContentEditable) {
            isContentEditableTarget = true;
        } else {
            return; // Not a supported editable element
        }

        // Check if element matches any of our selectors (site-specific or universal)
        let matchesSelector = false;
        
        // First check site-specific selectors for backward compatibility
        if (hostname.includes('google.')) {
            selectors = targetSites.google;
            if (target.matches(selectors.join(','))) {
                matchesSelector = true;
            }
        } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            selectors = targetSites.twitter;
            if (target.matches(selectors.join(','))) {
                matchesSelector = true;
            }
        } else if (isDiscord) {
            selectors = targetSites.discord;
            if (target.matches(selectors.join(','))) {
                matchesSelector = true;
            }
        }
        
        // If not matched by site-specific selectors, try universal selectors
        if (!matchesSelector) {
            if (target.matches(universalSelectors.join(','))) {
                matchesSelector = true;
            }
        }
        
        // If element doesn't match any selector, return
        if (!matchesSelector) {
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

                sendMessageWithRetry({ action: "processStCommand", query: query }, (response) => {
                    commandProcessed.delete(target); // Remove flag when done
                    if (response && !response.status?.startsWith("Error:")) {
                        // Don't clear the input field after pressing Enter as requested by user
                        console.log("Message retained after Enter as requested.");
                        
                        // Still dispatch events to ensure proper UI updates
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

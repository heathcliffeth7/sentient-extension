// options.js - Handles settings functionality for Sentient is Everywhere

document.addEventListener('DOMContentLoaded', function() {
  // Get UI elements
  const floatingButtonToggle = document.getElementById('floatingButton');
  const contextMenuToggle = document.getElementById('contextMenu');
  const selectionMenuToggle = document.getElementById('selectionMenu');
  const showSummarizeToggle = document.getElementById('showSummarize');
  const showExplainToggle = document.getElementById('showExplain');
  const showNewChatToggle = document.getElementById('showNewChat');
  const showSendSentientToggle = document.getElementById('showSendSentient');
  const languageSelect = document.getElementById('language');
  const saveButton = document.getElementById('save');
  const statusDiv = document.getElementById('status');
  const customCommandsContainer = document.getElementById('customCommandsContainer');
  const newCommandInput = document.getElementById('newCommandInput');
  const addCommandButton = document.getElementById('addCommand');
  const settingsTitle = document.querySelector('h1');
  const displayOptionsTitle = document.querySelector('.section:nth-child(2) h2');
  const languageSettingsTitle = document.querySelector('.section:nth-child(3) h2');
  const floatingButtonLabel = document.querySelector('label[for="floatingButton"]');
  const contextMenuLabel = document.querySelector('label[for="contextMenu"]');
  const selectionMenuLabel = document.querySelector('label[for="selectionMenu"]');
  const languageLabel = document.querySelector('.dropdown-label');
  const howToUseTitle = document.querySelector('.info-box p strong');
  const saveButtonText = document.getElementById('save');
  
  // Language translations
  const translations = {
    'Turkish': {
      settingsTitle: 'Sentient Uzantı Ayarları',
      displayOptions: 'Görüntüleme Seçenekleri',
      languageSettings: 'Dil Ayarları',
      floatingButton: 'Yüzen düğmeyi göster',
      contextMenu: 'Sağ tıklama menüsünü göster',
      selectionMenu: 'Seçim menüsünü göster',
      languageLabel: 'Tercih ettiğiniz dili seçin:',
      howToUse: 'Dil çevirisini nasıl kullanabilirsiniz:',
      saveButton: 'Ayarları Kaydet',
      successMessage: 'Ayarlar başarıyla kaydedildi!'
    },
    'Russian': {
      settingsTitle: 'Настройки расширения Sentient',
      displayOptions: 'Настройки отображения',
      languageSettings: 'Языковые настройки',
      floatingButton: 'Показать плавающую кнопку',
      contextMenu: 'Показать контекстное меню правой кнопки мыши',
      selectionMenu: 'Показать меню выбора',
      languageLabel: 'Выберите предпочитаемый язык:',
      howToUse: 'Как использовать перевод:',
      saveButton: 'Сохранить настройки',
      successMessage: 'Настройки успешно сохранены!'
    },
    'French': {
      settingsTitle: 'Paramètres de l\'extension Sentient',
      displayOptions: 'Options d\'affichage',
      languageSettings: 'Paramètres de langue',
      floatingButton: 'Afficher le bouton flottant',
      contextMenu: 'Afficher le menu contextuel du clic droit',
      selectionMenu: 'Afficher le menu de sélection',
      languageLabel: 'Sélectionnez votre langue préférée:',
      howToUse: 'Comment utiliser la traduction:',
      saveButton: 'Enregistrer les paramètres',
      successMessage: 'Paramètres enregistrés avec succès!'
    }
    // Add more languages as needed
  };
  
  // Load saved settings
  loadSettings();
  
  // Add event listener for save button
  saveButton.addEventListener('click', saveSettings);
  
  // Add event listener for language change
  languageSelect.addEventListener('change', updateUILanguage);
  
  // Function to load settings from storage
  function loadSettings() {
    chrome.storage.sync.get({
      // Default values
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
      // Update UI with saved values
      floatingButtonToggle.checked = items.showFloatingButton;
      contextMenuToggle.checked = items.showContextMenu;
      selectionMenuToggle.checked = items.showSelectionMenu;
      showSummarizeToggle.checked = items.showSummarize;
      showExplainToggle.checked = items.showExplain;
      showNewChatToggle.checked = items.showNewChat;
      showSendSentientToggle.checked = items.showSendSentient;
      languageSelect.value = items.selectedLanguage;
      
      // Load custom commands
      renderCustomCommands(items.customCommands);
      
      // Update UI language based on saved language
      updateUILanguage();
    });
  }
  
  // Function to update UI language
  function updateUILanguage() {
    const selectedLanguage = languageSelect ? languageSelect.value : '';
    
    // If a language is selected and translations exist for it
    if (selectedLanguage && translations[selectedLanguage]) {
      const trans = translations[selectedLanguage];
      
      // Update UI elements with translated text - check if elements exist first
      if (settingsTitle) settingsTitle.textContent = trans.settingsTitle;
      if (displayOptionsTitle) displayOptionsTitle.textContent = trans.displayOptions;
      if (languageSettingsTitle) languageSettingsTitle.textContent = trans.languageSettings;
      if (floatingButtonLabel) floatingButtonLabel.textContent = trans.floatingButton;
      if (contextMenuLabel) contextMenuLabel.textContent = trans.contextMenu;
      if (selectionMenuLabel) selectionMenuLabel.textContent = trans.selectionMenu;
      if (languageLabel) languageLabel.textContent = trans.languageLabel;
      if (howToUseTitle) howToUseTitle.textContent = trans.howToUse;
      if (saveButtonText) saveButtonText.textContent = trans.saveButton;
    } else {
      // Reset to English - check if elements exist first
      if (settingsTitle) settingsTitle.textContent = 'Sentient is Everywhere Settings';
      if (displayOptionsTitle) displayOptionsTitle.textContent = 'Display Options';
      if (languageSettingsTitle) languageSettingsTitle.textContent = 'Language Settings';
      if (floatingButtonLabel) floatingButtonLabel.textContent = 'Show floating button';
      if (contextMenuLabel) contextMenuLabel.textContent = 'Show right-click context menu';
      if (selectionMenuLabel) selectionMenuLabel.textContent = 'Show selection menu';
      if (languageLabel) languageLabel.textContent = 'Select your preferred language:';
      if (howToUseTitle) howToUseTitle.textContent = 'How to use language translation:';
      if (saveButtonText) saveButtonText.textContent = 'Save Settings';
    }
  }
  
  // Function to save settings to storage
  function saveSettings() {
    // Get current values from UI
    const showFloatingButton = floatingButtonToggle.checked;
    const showContextMenu = contextMenuToggle.checked;
    const showSelectionMenu = selectionMenuToggle.checked;
    const showSummarize = showSummarizeToggle.checked;
    const showExplain = showExplainToggle.checked;
    const showNewChat = showNewChatToggle.checked;
    const showSendSentient = showSendSentientToggle.checked;
    const selectedLanguage = languageSelect.value;
    
    // Get custom commands from the UI
    const customCommands = getCustomCommandsFromUI();
    
    // Save to storage
    chrome.storage.sync.set({
      showFloatingButton: showFloatingButton,
      showContextMenu: showContextMenu,
      showSelectionMenu: showSelectionMenu,
      showSummarize: showSummarize,
      showExplain: showExplain,
      showNewChat: showNewChat,
      showSendSentient: showSendSentient,
      customCommands: customCommands,
      selectedLanguage: selectedLanguage
    }, function() {
      // Show success message in the appropriate language
      let successMessage = 'Settings saved successfully!';
      if (selectedLanguage && translations[selectedLanguage]) {
        successMessage = translations[selectedLanguage].successMessage;
      }
      
      showStatus(successMessage, 'success');
      
      // Notify content scripts about settings change
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsUpdated',
            settings: {
              showFloatingButton: showFloatingButton,
              showContextMenu: showContextMenu,
              showSelectionMenu: showSelectionMenu,
              showSummarize: showSummarize,
              showExplain: showExplain,
              showNewChat: showNewChat,
              showSendSentient: showSendSentient,
              customCommands: customCommands,
              selectedLanguage: selectedLanguage
            }
          }).catch(() => {
            // Ignore errors from tabs that don't have content scripts
          });
        });
      });
    });
  }
  
  // Function to render custom commands in the UI
  function renderCustomCommands(commands) {
    // Clear existing commands
    customCommandsContainer.innerHTML = '';
    
    // Add each command to the container
    commands.forEach(function(command, index) {
      const commandItem = document.createElement('div');
      commandItem.className = 'custom-command-item';
      commandItem.dataset.index = index;
      
      const commandName = document.createElement('span');
      commandName.className = 'command-name';
      commandName.textContent = command;
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-command';
      deleteButton.textContent = '×';
      deleteButton.title = 'Delete command';
      deleteButton.addEventListener('click', function() {
        deleteCustomCommand(index);
      });
      
      commandItem.appendChild(commandName);
      commandItem.appendChild(deleteButton);
      customCommandsContainer.appendChild(commandItem);
    });
  }
  
  // Function to get custom commands from the UI
  function getCustomCommandsFromUI() {
    const commands = [];
    const commandItems = customCommandsContainer.querySelectorAll('.custom-command-item');
    
    commandItems.forEach(function(item) {
      const commandName = item.querySelector('.command-name').textContent;
      commands.push(commandName);
    });
    
    return commands;
  }
  
  // Function to delete a custom command
  function deleteCustomCommand(index) {
    chrome.storage.sync.get({
      customCommands: []
    }, function(items) {
      const commands = items.customCommands;
      
      // Remove the command at the specified index
      if (index >= 0 && index < commands.length) {
        commands.splice(index, 1);
        
        // Save the updated commands
        chrome.storage.sync.set({
          customCommands: commands
        }, function() {
          // Re-render the commands
          renderCustomCommands(commands);
          
          // Show status message
          showStatus('Command removed successfully!', 'success');
        });
      }
    });
  }
  
  // Add event listener for adding a new command
  addCommandButton.addEventListener('click', function() {
    const newCommand = newCommandInput.value.trim();
    
    if (newCommand) {
      chrome.storage.sync.get({
        customCommands: []
      }, function(items) {
        const commands = items.customCommands;
        
        // Add the new command if it doesn't already exist
        if (!commands.includes(newCommand)) {
          commands.push(newCommand);
          
          // Save the updated commands
          chrome.storage.sync.set({
            customCommands: commands
          }, function() {
            // Clear the input field
            newCommandInput.value = '';
            
            // Re-render the commands
            renderCustomCommands(commands);
          });
        } else {
          // Show error if command already exists
          showStatus('Command already exists!', 'error');
        }
      });
    }
  });
  
  // Function to show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(function() {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});

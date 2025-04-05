// Değişkenler (Aynı)
let sentientPopupId = null;
const sentientBaseUrl = "https://chat.sentient.xyz/";
const sentientChatUrlPattern = "https://chat.sentient.xyz/c/";
const defaultPopupState = { width: 450, height: 700, top: 0, left: 10 };

// --- Kurulum (onInstalled) ---
chrome.runtime.onInstalled.addListener(() => {
  console.log("Eklenti kuruldu/güncellendi.");

  // --- İç İçe Menü Yapısı ---

  // 1. Ana (Parent) Menü Öğeleri (Sadece metin seçiliyken görünür)
  chrome.contextMenus.create({
    id: "sentientSummarizeParent",
    title: "Summarize with Sentient", // Ana başlık
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "sentientExplainParent",
    title: "Explain with Sentient", // Ana başlık
    contexts: ["selection"]
  });

  // 2. Alt Menü Öğeleri (Summarize için)
  chrome.contextMenus.create({
    id: "sentientSummarizeAction", // ID'ler benzersiz olmalı
    parentId: "sentientSummarizeParent", // Hangi ana menünün altına?
    title: "Summarize selection (use last chat)", // Alt seçenek başlığı
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "sentientSummarizeNewChat",
    parentId: "sentientSummarizeParent",
    title: "Summarize selection (in new chat)", // Alt seçenek başlığı
    contexts: ["selection"]
  });

  // 3. Alt Menü Öğeleri (Explain için)
  chrome.contextMenus.create({
    id: "sentientExplainAction",
    parentId: "sentientExplainParent",
    title: "Explain selection (use last chat)",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "sentientExplainNewChat",
    parentId: "sentientExplainParent",
    title: "Explain selection (in new chat)",
    contexts: ["selection"]
  });

  // 4. Ayrı "Yeni Sohbet Başlat" seçeneği (İsteğe bağlı olarak kalabilir)
  chrome.contextMenus.create({
    id: "sentientNewChat",
    title: "Sentient: Start New Chat", // Başlığı İngilizce yapalım tutarlılık için
    contexts: ["page", "selection", "link", "image", "video", "audio"]
  });
  // --- Menü Yapısı Sonu ---

});

// --- Olay Dinleyicileri ---

// Eklenti ikonuna tıklandığında -> Normal aç (Son URL'yi hatırla)
chrome.action.onClicked.addListener((tab) => {
  console.log("Sentient Popup ikonu tıklandı.");
  openSentientPopup(false);
});

// content.js'den gelen mesajları dinle -> Normal aç (Son URL'yi hatırla)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Mesaj alındı:", message);
    if (message.action === "openSentientPopup") {
        console.log("content.js'den gelen istek üzerine popup açılıyor...");
        openSentientPopup(false);
        sendResponse({ status: "Popup açıldı" });
    }
    return true;
});

// Sağ tık menüsüne tıklandığında (GÜNCELLENMİŞ)
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let promptPrefix = "";
  let forceBase = false;
  let requiresSelection = true; // Varsayılan olarak metin seçimi gerektirir

  switch (info.menuItemId) {
    // Yeni Sohbet
    case "sentientNewChat":
      forceBase = true;
      requiresSelection = false; // Metin seçimi gerekmez
      break;

    // Özetleme
    case "sentientSummarizeAction":
      promptPrefix = "Summarize: ";
      forceBase = false; // Son sohbeti kullan
      break;
    case "sentientSummarizeNewChat":
      promptPrefix = "Summarize: ";
      forceBase = true; // Yeni sohbeti zorla
      break;

    // Açıklama
    case "sentientExplainAction":
      promptPrefix = "Explain: ";
      forceBase = false; // Son sohbeti kullan
      break;
    case "sentientExplainNewChat":
      promptPrefix = "Explain: ";
      forceBase = true; // Yeni sohbeti zorla
      break;

    default:
      return; // Diğer durumları (parent menüler vb.) yoksay
  }

  // Eğer işlem metin seçimi gerektiriyorsa ve metin seçili değilse çık
  if (requiresSelection && !info.selectionText) {
      console.warn("Bu işlem için metin seçimi gerekli.");
      return;
  }

  // Yeni sohbet başlatma durumu (metin kopyalamaya gerek yok)
  if (info.menuItemId === "sentientNewChat") {
    console.log("Yeni sohbet başlatılıyor...");
    openSentientPopup(true); // Ana URL'yi açmaya zorla
  }
  // Diğer durumlar (metin kopyalama gerektirenler)
  else if (info.selectionText) {
    const textToCopy = promptPrefix + info.selectionText;
    console.log(`Panoya kopyalanacak metin: ${textToCopy}`);
    // Panoya kopyala ve ilgili popup'ı aç (forceBase değerine göre)
    copyToClipboardAndThen(textToCopy, tab.id, () => {
        console.log(`Panoya kopyalandı, popup açılıyor (forceBase: ${forceBase})`);
        openSentientPopup(forceBase);
    });
  }
});


// Popup içindeki sekme güncellendiğinde URL'yi dinle (Aynı)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // ... (kod aynı)
  if (tab.windowId === sentientPopupId && changeInfo.url) {
    if (changeInfo.url.startsWith(sentientChatUrlPattern)) {
      chrome.storage.local.set({ lastSentientUrl: changeInfo.url });
    }
  }
});

// Pencere taşındığında/yeniden boyutlandırıldığında dinle (Aynı)
chrome.windows.onBoundsChanged.addListener((window) => {
 // ... (kod aynı)
 if (window.id === sentientPopupId && window.state === "normal") {
    const popupState = { top: window.top, left: window.left, width: window.width, height: window.height };
    chrome.storage.local.set({ lastPopupState: popupState });
  }
});

// Popup penceresi kapatıldığında ID'yi temizle (Aynı)
chrome.windows.onRemoved.addListener((windowId) => {
 // ... (kod aynı)
 if (windowId === sentientPopupId) {
    console.log("Sentient popup penceresi kapatıldı.");
    sentientPopupId = null;
  }
});


// --- Yardımcı Fonksiyonlar ---

// Metni panoya kopyalayıp verilen callback'i çalıştıran fonksiyon (Aynı)
function copyToClipboardAndThen(text, tabId, callback) {
 // ... (kod aynı)
 chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (textToCopy) => { return navigator.clipboard.writeText(textToCopy); },
    args: [text]
  })
  .then(() => { if (callback) callback(); })
  .catch(err => { console.error("Script enjekte/kopyalama hatası:", err); if (callback) callback(); });
}

// Popup penceresini açan fonksiyon (Aynı)
function openSentientPopup(forceBaseUrl = false) {
 // ... (kod aynı)
 chrome.storage.local.get(['lastSentientUrl', 'lastPopupState'], (result) => {
    let urlToOpen;
    if (forceBaseUrl || !result.lastSentientUrl || !result.lastSentientUrl.startsWith(sentientChatUrlPattern)) {
      urlToOpen = sentientBaseUrl;
      console.log(`Ana URL ile popup açılıyor (Zorlandı: ${forceBaseUrl})`);
    } else {
      urlToOpen = result.lastSentientUrl;
      console.log(`Kaydedilmiş URL ile popup açılıyor: ${urlToOpen}`);
    }
    const stateToUse = result.lastPopupState || defaultPopupState;
    chrome.windows.create({ url: urlToOpen, type: "popup", width: stateToUse.width, height: stateToUse.height, top: stateToUse.top, left: stateToUse.left }, (window) => {
        if (window) {
            if (sentientPopupId && sentientPopupId !== window.id) { /* Belki eskiyi kapat? */ }
            sentientPopupId = window.id;
            console.log(`Sentient popup oluşturuldu/güncellendi, ID: ${sentientPopupId}`);
            chrome.windows.update(window.id, { focused: true });
            if (window.state !== "normal") { chrome.windows.update(window.id, { state: "normal" }); }
        } else {
            console.error("Popup penceresi oluşturulamadı.");
            sentientPopupId = null;
        }
    });
  });
}

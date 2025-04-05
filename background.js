let sentientPopupId = null;
const sentientBaseUrl = "https://chat.sentient.xyz/";
const sentientChatUrlPattern = "https://chat.sentient.xyz/c/";
// Varsayılan popup boyutları ve konumu (eğer kayıtlı değer yoksa)
const defaultPopupState = {
  width: 450,
  height: 700,
  top: 0,    // Varsayılan: Sol üst
  left: 10   // Varsayılan: Soldan biraz içeride
};

// --- Olay Dinleyicileri ---

// Eklenti ikonuna tıklandığında
chrome.action.onClicked.addListener((tab) => {
  console.log("Sentient Popup ikonu tıklandı.");
  openSentientPopup();
});

// content.js'den gelen mesajları dinlemek için
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Mesaj alındı:", message);
  if (message.action === "openSentientPopup") {
    console.log("content.js'den gelen istek üzerine popup açılıyor...");
    openSentientPopup();
    sendResponse({ status: "Popup açıldı" });
  }
  return true;
});

// Popup içindeki sekme güncellendiğinde URL'yi dinle (Son URL'yi kaydetme)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.windowId === sentientPopupId && changeInfo.url) {
    if (changeInfo.url.startsWith(sentientChatUrlPattern)) {
      chrome.storage.local.set({ lastSentientUrl: changeInfo.url }, () => {
        // console.log(`Son Sentient sohbet URL'si kaydedildi: ${changeInfo.url}`);
      });
    }
  }
});

// YENİ: Pencere taşındığında veya yeniden boyutlandırıldığında dinle
chrome.windows.onBoundsChanged.addListener((window) => {
  // Sadece bizim popup penceremizle ilgilen
  if (window.id === sentientPopupId && window.state !== "minimized" && window.state !== "maximized" && window.state !== "fullscreen") {
    // Normal durumdaki konum ve boyutları kaydet
    const popupState = {
        top: window.top,
        left: window.left,
        width: window.width,
        height: window.height
    };
    chrome.storage.local.set({ lastPopupState: popupState }, () => {
       // console.log("Popup konumu/boyutu kaydedildi:", popupState);
    });
  }
});

// Popup penceresi kapatıldığında ID'yi temizle
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === sentientPopupId) {
    console.log("Sentient popup penceresi kapatıldı.");
    sentientPopupId = null;
  }
});


// --- Yardımcı Fonksiyon ---

// Popup penceresini açan fonksiyon (kayıtlı URL, KONUM ve BOYUTU kontrol ederek)
function openSentientPopup() {
  // Önce depolamadan son URL ve durumu al
  chrome.storage.local.get(['lastSentientUrl', 'lastPopupState'], (result) => {
    // URL'yi belirle
    let urlToOpen = sentientBaseUrl;
    if (result.lastSentientUrl && result.lastSentientUrl.startsWith(sentientChatUrlPattern)) {
      urlToOpen = result.lastSentientUrl;
    }

    // Konum ve boyutları belirle (kayıtlı değer varsa kullan, yoksa varsayılanı)
    const stateToUse = result.lastPopupState || defaultPopupState;

    console.log(`Popup açılıyor: URL=${urlToOpen}, State=`, stateToUse);

    // Popup penceresini oluştur
    chrome.windows.create({
      url: urlToOpen,
      type: "popup",
      // Kayıtlı veya varsayılan değerleri kullan
      width: stateToUse.width,
      height: stateToUse.height,
      top: stateToUse.top,
      left: stateToUse.left
    }, (window) => {
      if (window) {
        sentientPopupId = window.id;
        console.log(`Sentient popup oluşturuldu, ID: ${sentientPopupId}`);
        // Tam ekran veya minimize durumunu kontrol et, gerekirse normale döndür
        if (window.state !== "normal") {
            chrome.windows.update(window.id, { state: "normal" });
        }
      } else {
         console.error("Popup penceresi oluşturulamadı.");
         sentientPopupId = null;
      }
    });
  });
}
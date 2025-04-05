console.log("Sentient content script yüklendi.");

(function() {
  const buttonId = 'sentient-logo-button';

  let button = document.getElementById(buttonId);
  if (!button) {
    button = document.createElement('button');
    button.id = buttonId;
    document.body.appendChild(button);
    console.log("Sentient logo düğmesi oluşturuldu.");
  } else {
    console.log("Sentient logo düğmesi zaten var.");
  }

  // Sürükleme İşlevselliği
  let isDragging = false;
  let offsetX, offsetY;

  button.onmousedown = function(e) {
    console.log("mousedown tetiklendi"); // DEBUG
    isDragging = true;
    offsetX = e.clientX - button.getBoundingClientRect().left;
    offsetY = e.clientY - button.getBoundingClientRect().top;
    button.style.cursor = 'grabbing';
    e.preventDefault();
  };

  document.onmousemove = function(e) {
    if (!isDragging) return;
    console.log("mousemove tetikleniyor (sürüklerken)"); // DEBUG

    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;
    const BORDER_MARGIN = 10;
    newX = Math.max(BORDER_MARGIN, Math.min(newX, window.innerWidth - button.offsetWidth - BORDER_MARGIN));
    newY = Math.max(BORDER_MARGIN, Math.min(newY, window.innerHeight - button.offsetHeight - BORDER_MARGIN));

    // Konumu GÜNCELLE (left ve top ile)
    button.style.left = newX + 'px';
    button.style.top = newY + 'px';
    // Artık right/bottom'ı auto yapmaya gerek yok, çünkü CSS de left/top kullanıyor
  };

  document.onmouseup = function(e) {
    if (isDragging) {
      console.log("mouseup tetiklendi"); // DEBUG
      isDragging = false;
      button.style.cursor = 'pointer';
    }
  };
  // --- Sürükleme Sonu ---

  // Tıklama olayı (Aynı)
  button.addEventListener('click', () => {
    if (!isDragging) { // Sadece sürüklemiyorsak popup'ı aç
        console.log("Sentient logo düğmesi tıklandı.");
        chrome.runtime.sendMessage({ action: "openSentientPopup" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Mesaj gönderme hatası:", chrome.runtime.lastError.message);
          }
        });
    }
  });

})();
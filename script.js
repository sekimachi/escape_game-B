
/* =========================================================
   脱出ゲーム メインJavaScript
========================================================= */

/* 設定 */

const GAME_TIME = 10 * 60;
const EPILOGUE_DURATION = 45000;


/* HTML要素 */

const gameScreen = document.getElementById("gameScreen");
const epilogueScreen = document.getElementById("epilogueScreen");
const epilogueText = document.getElementById("epilogueText");
const timerElement = document.getElementById("timer");
const epilogueButton = document.getElementById("epilogueButton");
const closeEpilogueButton =
  document.getElementById("closeEpilogueButton");
const imageButton = document.getElementById("imageButton");
const voiceResult = document.getElementById("voiceResult");


/* タイマー状態 */

let remainingTime = GAME_TIME;
let timerStarted = false;
let timerInterval = null;
let epilogueOpen = false;
let epilogueTimeout = null;


/* タイマー表示 */

function updateTimer() {
  remainingTime = Math.max(0, remainingTime);

  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;

  timerElement.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  timerElement.classList.remove("warning");

  if (remainingTime <= 60 && remainingTime > 0) {
    timerElement.classList.add("warning");
  }

  if (remainingTime === 0) {
    timerElement.classList.remove("warning");
    timerElement.classList.add("timeup");
    stopTimer();
    console.log("制限時間終了");
  }
}


/* タイマー開始 */

function startTimer() {
  if (timerStarted) return;

  timerStarted = true;
  updateTimer();

  timerInterval = setInterval(() => {
    if (remainingTime > 0) {
      remainingTime--;
      updateTimer();
    } else {
      stopTimer();
    }
  }, 1000);
}


/* タイマー停止 */

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}


/* エピローグ表示 */

function showEpilogue() {
  if (epilogueTimeout !== null) {
    clearTimeout(epilogueTimeout);
    epilogueTimeout = null;
  }

  // 音声認識中なら停止
  stopVoiceRecognition();

  epilogueScreen.classList.remove("hidden");
  epilogueOpen = true;

  epilogueText.style.animation = "none";
  void epilogueText.offsetWidth;

  epilogueText.style.animation =
    "epilogueScroll 35s linear forwards";

  epilogueTimeout = setTimeout(() => {
    if (epilogueOpen) {
      closeEpilogue();
    }
  }, EPILOGUE_DURATION);
}


/* エピローグ終了 */

function closeEpilogue() {
  if (!epilogueOpen) return;

  epilogueOpen = false;

  if (epilogueTimeout !== null) {
    clearTimeout(epilogueTimeout);
    epilogueTimeout = null;
  }

  epilogueScreen.classList.add("hidden");
  startTimer();
}


/* エピローグ再表示 */

epilogueButton.addEventListener("click", (event) => {
  event.stopPropagation();
  showEpilogue();
});


/* スキップボタン */

closeEpilogueButton.addEventListener("click", (event) => {
  event.stopPropagation();
  closeEpilogue();
});


/* エピローグ画面のタップでスキップ */

epilogueScreen.addEventListener("click", (event) => {
  if (closeEpilogueButton.contains(event.target)) return;

  if (epilogueOpen) {
    closeEpilogue();
  }
});


/* =========================================================
   鍵ボタン：音声認識
========================================================= */

// SafariやChromeが提供する音声認識APIを取得
const SpeechRecognitionAPI =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let recognition = null;
let isHoldingKey = false;
let recognitionRunning = false;
let recognitionRestartTimer = null;


/* 音声認識の準備 */

if (SpeechRecognitionAPI) {
  recognition = new SpeechRecognitionAPI();

  // USBを英語の略語として認識させる
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  /* 認識結果 */

  recognition.onresult = (event) => {
    if (!isHoldingKey) return;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];

      // 候補を順番に確認
      for (let j = 0; j < result.length; j++) {
        const transcript = result[j].transcript
          .trim()
          .toUpperCase();

        console.log("音声認識結果:", transcript);

        // 句読点を取り除いて判定
        const normalized = transcript
          .replace(/[.,!?]/g, "")
          .replace(/\s+/g, " ")
          .trim();

        const recognizedUSB =
          /\bUSB\b/.test(normalized) ||
          /\bU\s+S\s+B\b/.test(normalized);

        if (recognizedUSB) {
          voiceResult.textContent = "USB";

          // 正解を認識したら停止
          isHoldingKey = false;
          stopVoiceRecognition();

          console.log("USBを認識しました");
          return;
        }
      }
    }
  };

  /* 音声認識エラー */

  recognition.onerror = (event) => {
    console.log("音声認識エラー:", event.error);

    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      voiceResult.textContent = "マイクを許可してください";
      isHoldingKey = false;
    } else if (event.error === "no-speech") {
      console.log("音声が検出されませんでした");
    } else if (event.error === "network") {
      console.log("音声認識サービスへの接続に失敗しました");
    }
  };

  /* 認識終了時 */

  recognition.onend = () => {
    recognitionRunning = false;

    if (recognitionRestartTimer !== null) {
      clearTimeout(recognitionRestartTimer);
      recognitionRestartTimer = null;
    }

    // ボタンを押し続けている間だけ再開
    if (isHoldingKey && !epilogueOpen) {
      recognitionRestartTimer = setTimeout(() => {
        recognitionRestartTimer = null;
        startVoiceRecognition();
      }, 200);
    }
  };

} else {
  console.warn(
    "このブラウザはWeb Speech APIに対応していません。"
  );
}


/* 音声認識開始 */

function startVoiceRecognition() {
  if (!recognition) return;
  if (!isHoldingKey || epilogueOpen) return;
  if (recognitionRunning) return;

  try {
    recognitionRunning = true;
    recognition.start();
  } catch (error) {
    recognitionRunning = false;
    console.log("音声認識を開始できません:", error);
  }
}


/* 音声認識停止 */

function stopVoiceRecognition() {
  isHoldingKey = false;

  if (recognitionRestartTimer !== null) {
    clearTimeout(recognitionRestartTimer);
    recognitionRestartTimer = null;
  }

  if (recognition && recognitionRunning) {
    try {
      recognition.stop();
    } catch (error) {
      console.log("音声認識停止時のエラー:", error);
    }
  }
}


/* 鍵を押したとき */

function handleKeyDown(event) {
  if (epilogueOpen) return;

  // マウス操作では左ボタンだけを受け付ける
  if (event.button !== undefined && event.button !== 0) {
    return;
  }

  event.preventDefault();

  if (isHoldingKey) return;

  if (!recognition) {
    voiceResult.textContent = "音声認識に非対応";
    return;
  }

  isHoldingKey = true;
  voiceResult.textContent = "聞き取り中…";

  // start()はボタン操作から直接呼び出す
  startVoiceRecognition();

  // 指がボタンから外れても離した操作を検出する
  try {
    imageButton.setPointerCapture(event.pointerId);
  } catch (error) {
    // 非対応の場合は無視
  }
}


/* 鍵を離したとき */

function handleKeyUp(event) {
  if (event) event.preventDefault();

  if (!isHoldingKey) return;

  stopVoiceRecognition();

  // 正解表示は残し、それ以外は消す
  if (voiceResult.textContent !== "USB") {
    voiceResult.textContent = "";
  }
}


/* マウス・タッチ・ペン操作 */

imageButton.addEventListener("pointerdown", handleKeyDown);
imageButton.addEventListener("pointerup", handleKeyUp);
imageButton.addEventListener("pointercancel", handleKeyUp);
imageButton.addEventListener("lostpointercapture", handleKeyUp);


/* ページ読み込み */

window.addEventListener("load", () => {
  updateTimer();
  showEpilogue();
});


/* iPad向けダブルタップズーム防止 */

let lastTouchEnd = 0;

document.addEventListener(
  "touchend",
  (event) => {
    const now = Date.now();

    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }

    lastTouchEnd = now;
  },
  { passive: false }
);


/* 長押しメニュー防止 */

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

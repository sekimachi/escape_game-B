/* =========================================================
   脱出ゲーム メインJavaScript
========================================================= */

/* 設定 */

const GAME_TIME = 10 * 60;
const EPILOGUE_DURATION = 50000;
const EPILOGUE2_DURATION = 45000;

const CORRECT_MESSAGE = "立ち入り禁止の看板をよく見ろ";


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

const epilogue2Screen = document.getElementById("epilogue2Screen");
const epilogue2Text = document.getElementById("epilogue2Text");
const epilogue2Button = document.getElementById("epilogue2Button");
const closeEpilogue2Button =
  document.getElementById("closeEpilogue2Button");


/* タイマー状態 */

let remainingTime = GAME_TIME;
let timerStarted = false;
let timerInterval = null;
let epilogueOpen = false;
let epilogueTimeout = null;
let epilogue2Open = false;
let epilogue2Timeout = null;


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
    "epilogueScroll 45s linear forwards";

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
   エピローグ2
========================================================= */

/* エピローグ2表示 */

function showEpilogue2() {
  if (epilogue2Timeout !== null) {
    clearTimeout(epilogue2Timeout);
    epilogue2Timeout = null;
  }

  // 音声認識中なら停止
  stopVoiceRecognition();

  epilogue2Screen.classList.remove("hidden");
  epilogue2Open = true;

  epilogue2Text.style.animation = "none";
  void epilogue2Text.offsetWidth;

  epilogue2Text.style.animation =
    "epilogueScroll 40s linear forwards";

  epilogue2Timeout = setTimeout(() => {
    if (epilogue2Open) {
      closeEpilogue2();
    }
  }, EPILOGUE2_DURATION);
}


/* エピローグ2終了（タイマーには影響しない） */

function closeEpilogue2() {
  if (!epilogue2Open) return;

  epilogue2Open = false;

  if (epilogue2Timeout !== null) {
    clearTimeout(epilogue2Timeout);
    epilogue2Timeout = null;
  }

  epilogue2Screen.classList.add("hidden");
}


/* エピローグ2ボタン */

epilogue2Button.addEventListener("click", (event) => {
  event.stopPropagation();
  showEpilogue2();
});


/* エピローグ2を閉じるボタン */

closeEpilogue2Button.addEventListener("click", (event) => {
  event.stopPropagation();
  closeEpilogue2();
});


/* エピローグ2画面のタップで閉じる */

epilogue2Screen.addEventListener("click", (event) => {
  if (closeEpilogue2Button.contains(event.target)) return;

  if (epilogue2Open) {
    closeEpilogue2();
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

  // 日本語で認識
  recognition.lang = "ja-JP";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 5;

  /* 認識結果 */

  recognition.onresult = (event) => {
    if (!isHoldingKey) return;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];

      // 候補を順番に確認
      for (let j = 0; j < result.length; j++) {
        const transcript = result[j].transcript.trim();

        console.log("音声認識結果:", transcript);

        if (isUSB(transcript)) {
          onCorrectAnswer();
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
    if (isHoldingKey && !epilogueOpen && !epilogue2Open) {
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


/* 「USB」と言ったかどうかを判定 */

function isUSB(text) {
  // 大文字化・全角英数字を半角に・空白と記号を除去
  const normalized = text
    .toUpperCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    .replace(/[\s.,!?、。！？・]/g, "");

  // ひらがなをカタカナに変換
  const katakana = normalized.replace(/[\u3041-\u3096]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + 0x60)
  );

  return (
    katakana.includes("USB") ||
    katakana.includes("ユーエスビー") ||
    katakana.includes("ユーエスビ") ||
    katakana.includes("ユーエスビイ")
  );
}


/* 正解時の処理 */

function onCorrectAnswer() {
  voiceResult.textContent = CORRECT_MESSAGE;

  // 認識を停止
  isHoldingKey = false;
  stopVoiceRecognition();

  // エピローグ2ボタンを表示
  epilogue2Button.classList.remove("hidden");

  console.log("USBを認識しました");
}


/* 音声認識開始 */

function startVoiceRecognition() {
  if (!recognition) return;
  if (!isHoldingKey || epilogueOpen || epilogue2Open) return;
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
  if (epilogueOpen || epilogue2Open) return;

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

  // 表示を一旦クリア（「聞き取り中」は表示しない）
  voiceResult.textContent = "";

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

  // 正解表示は残す
  const isCorrectShown = voiceResult.textContent === CORRECT_MESSAGE;

  if (isHoldingKey) {
    stopVoiceRecognition();
  }

  // 正解表示以外は消す
  if (!isCorrectShown) {
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
"use strict";

/* ==============================
   設定
============================== */

// 制限時間：10分
const TIME_LIMIT = 10 * 60;

// エピローグの表示時間：70秒
// CSSのスクロール時間と合わせています
const EPILOGUE_DURATION = 70 * 1000;

// 音声認識の対応ブラウザ機能
const SpeechRecognitionAPI =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


/* ==============================
   HTML要素
============================== */

const gameScreen = document.getElementById("gameScreen");
const timerElement = document.getElementById("timer");

const imageButton = document.getElementById("imageButton");
const voiceResult = document.getElementById("voiceResult");

const epilogueButton = document.getElementById("epilogueButton");
const epilogueScreen = document.getElementById("epilogueScreen");
const epilogueText = document.getElementById("epilogueText");
const closeEpilogueButton =
  document.getElementById("closeEpilogueButton");

const timeUpMessage = document.getElementById("timeUpMessage");
const restartButton = document.getElementById("restartButton");


/* ==============================
   状態管理
============================== */

let remainingSeconds = TIME_LIMIT;
let timerInterval = null;
let timerStarted = false;
let gameFinished = false;

let epilogueOpen = false;
let epilogueTimeout = null;

let recognition = null;
let recognitionRunning = false;
let isHoldingKey = false;
let recognizedUSB = false;

let restartRecognitionTimeout = null;


/* ==============================
   カウントダウン
============================== */

function updateTimerDisplay() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  timerElement.textContent =
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0");

  if (remainingSeconds <= 60) {
    timerElement.classList.add("warning");
  } else {
    timerElement.classList.remove("warning");
  }
}

function startTimer() {
  if (timerStarted || gameFinished) {
    return;
  }

  timerStarted = true;

  updateTimerDisplay();

  timerInterval = window.setInterval(() => {
    if (gameFinished) {
      stopTimer();
      return;
    }

    remainingSeconds--;

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      updateTimerDisplay();
      finishGame();
      return;
    }

    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

function finishGame() {
  if (gameFinished) {
    return;
  }

  gameFinished = true;

  stopTimer();
  stopVoiceRecognition();

  epilogueOpen = false;

  if (epilogueTimeout !== null) {
    window.clearTimeout(epilogueTimeout);
    epilogueTimeout = null;
  }

  epilogueScreen.classList.remove("active");
  timeUpMessage.classList.remove("hidden");

  imageButton.disabled = true;
  epilogueButton.disabled = true;

  voiceResult.textContent = "";
}


/* ==============================
   エピローグ
============================== */

function showEpilogue() {
  if (gameFinished) {
    return;
  }

  // 音声認識を停止
  stopVoiceRecognition();

  epilogueOpen = true;

  // 表示中はゲーム画面を隠す
  gameScreen.style.display = "none";

  epilogueScreen.classList.add("active");

  // スクロールアニメーションを最初から再生する
  epilogueText.style.animation = "none";

  // ブラウザにアニメーションのリセットを反映させる
  void epilogueText.offsetHeight;

  epilogueText.style.animation = "";

  // 以前のタイマーを解除
  if (epilogueTimeout !== null) {
    window.clearTimeout(epilogueTimeout);
  }

  // 70秒後にエピローグを閉じる
  epilogueTimeout = window.setTimeout(() => {
    closeEpilogue();
  }, EPILOGUE_DURATION);
}

function closeEpilogue() {
  if (!epilogueOpen || gameFinished) {
    return;
  }

  epilogueOpen = false;

  if (epilogueTimeout !== null) {
    window.clearTimeout(epilogueTimeout);
    epilogueTimeout = null;
  }

  epilogueScreen.classList.remove("active");
  gameScreen.style.display = "";

  // エピローグを閉じたタイミングで10分の計測を開始
  startTimer();
}

// エピローグをスキップ
closeEpilogueButton.addEventListener("click", (event) => {
  event.stopPropagation();
  closeEpilogue();
});

// エピローグ再表示
epilogueButton.addEventListener("click", () => {
  showEpilogue();
});

// エピローグ画面をタップしてスキップ
epilogueScreen.addEventListener("click", (event) => {
  if (event.target === closeEpilogueButton) {
    return;
  }

  closeEpilogue();
});


/* ==============================
   音声認識の初期化
============================== */

function initializeSpeechRecognition() {
  if (!SpeechRecognitionAPI) {
    console.warn("このブラウザは音声認識に対応していません。");
    return false;
  }

  try {
    recognition = new SpeechRecognitionAPI();

    // USBという英語を認識しやすくする
    recognition.lang = "en-US";

    // 音声を継続して聞き取る
    recognition.continuous = true;

    // 認識途中の結果も受け取る
    recognition.interimResults = true;

    // 候補を複数受け取る
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      recognitionRunning = true;
      voiceResult.textContent = "聞き取り中…";
    };

    recognition.onresult = (event) => {
      if (!isHoldingKey || epilogueOpen || gameFinished) {
        return;
      }

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const result = event.results[i];

        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript || "";

          console.log("音声認識結果:", transcript);

          if (containsUSB(transcript)) {
            displayUSB();
            return;
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn("音声認識エラー:", event.error);

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        isHoldingKey = false;
        imageButton.classList.remove("holding");
        voiceResult.textContent = "マイクを許可してください";
      } else if (event.error === "no-speech") {
        // 無音の場合は、長押し中なら再開を試みる
      } else if (event.error === "audio-capture") {
        voiceResult.textContent = "マイクを利用できません";
      } else if (event.error === "network") {
        voiceResult.textContent = "音声認識の通信エラー";
      }
    };

    recognition.onend = () => {
      recognitionRunning = false;

      // 長押し中であれば、認識の再開を試みる
      if (
        isHoldingKey &&
        !epilogueOpen &&
        !gameFinished &&
        !recognizedUSB
      ) {
        scheduleRecognitionRestart();
      }
    };

    return true;
  } catch (error) {
    console.error("音声認識の初期化に失敗しました:", error);
    recognition = null;
    return false;
  }
}


/* ==============================
   USBの判定
============================== */

function containsUSB(text) {
  const normalized = String(text)
    .toUpperCase()
    .replace(/[‐‑‒–—―]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // USBをひとまとまりの単語として認識
  if (/\bUSB\b/.test(normalized)) {
    return true;
  }

  // U S B のように1文字ずつ認識した場合
  if (/\bU\s+S\s+B\b/.test(normalized)) {
    return true;
  }

  // 認識結果が文字の間に空白を入れた場合にも対応
  if (/\bU\s*S\s*B\b/.test(normalized)) {
    return true;
  }

  return false;
}

function displayUSB() {
  if (recognizedUSB || gameFinished || epilogueOpen) {
    return;
  }

  recognizedUSB = true;
  isHoldingKey = false;

  imageButton.classList.remove("holding");

  voiceResult.textContent = "USB";

  // USBを認識したら音声認識を止める
  stopVoiceRecognition();
}


/* ==============================
   音声認識の開始・停止
============================== */

function startVoiceRecognition() {
  if (epilogueOpen || gameFinished || recognizedUSB) {
    return;
  }

  if (!recognition) {
    const initialized = initializeSpeechRecognition();

    if (!initialized) {
      voiceResult.textContent = "音声認識に非対応";
      return;
    }
  }

  if (recognitionRunning) {
    return;
  }

  if (restartRecognitionTimeout !== null) {
    window.clearTimeout(restartRecognitionTimeout);
    restartRecognitionTimeout = null;
  }

  try {
    recognition.start();
  } catch (error) {
    console.warn("音声認識を開始できませんでした:", error);
    recognitionRunning = false;
  }
}

function stopVoiceRecognition() {
  isHoldingKey = false;

  if (restartRecognitionTimeout !== null) {
    window.clearTimeout(restartRecognitionTimeout);
    restartRecognitionTimeout = null;
  }

  imageButton.classList.remove("holding");

  if (recognition && recognitionRunning) {
    try {
      recognition.stop();
    } catch (error) {
      console.warn("音声認識の停止に失敗しました:", error);
    }
  }

  recognitionRunning = false;
}

function scheduleRecognitionRestart() {
  if (restartRecognitionTimeout !== null) {
    window.clearTimeout(restartRecognitionTimeout);
  }

  restartRecognitionTimeout = window.setTimeout(() => {
    restartRecognitionTimeout = null;

    if (
      isHoldingKey &&
      !epilogueOpen &&
      !gameFinished &&
      !recognizedUSB
    ) {
      startVoiceRecognition();
    }
  }, 300);
}


/* ==============================
   ボタン長押し操作
============================== */

function beginHolding(event) {
  if (epilogueOpen || gameFinished) {
    return;
  }

  // マウスの右クリックなどは無視する
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  event.preventDefault();

  if (isHoldingKey) {
    return;
  }

  // 以前にUSBを認識した場合、再度押すと認識をやり直す
  recognizedUSB = false;

  isHoldingKey = true;

  imageButton.classList.add("holding");
  voiceResult.textContent = "聞き取り中…";

  try {
    imageButton.setPointerCapture(event.pointerId);
  } catch (error) {
    // Pointer Captureが使えない場合も操作を継続
  }

  // ユーザーの長押し操作をきっかけに音声認識を開始
  startVoiceRecognition();
}

function endHolding(event) {
  if (event) {
    event.preventDefault();
  }

  if (!isHoldingKey) {
    return;
  }

  isHoldingKey = false;

  imageButton.classList.remove("holding");

  stopVoiceRecognition();

  // USBを認識済みの場合は結果を残す
  if (!recognizedUSB) {
    voiceResult.textContent = "";
  }
}

imageButton.addEventListener("pointerdown", beginHolding);

imageButton.addEventListener("pointerup", endHolding);
imageButton.addEventListener("pointercancel", endHolding);
imageButton.addEventListener("lostpointercapture", () => {
  if (isHoldingKey) {
    endHolding();
  }
});

// 長押し中に指がボタンの外へ移動した場合
imageButton.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

// iPadのタッチ操作でページが動かないようにする
imageButton.addEventListener(
  "touchmove",
  (event) => {
    event.preventDefault();
  },
  { passive: false }
);


/* ==============================
   もう一度遊ぶ
============================== */

restartButton.addEventListener("click", () => {
  stopTimer();
  stopVoiceRecognition();

  remainingSeconds = TIME_LIMIT;
  timerStarted = false;
  gameFinished = false;
  recognizedUSB = false;
  isHoldingKey = false;

  timerElement.classList.remove("warning");
  timeUpMessage.classList.add("hidden");

  imageButton.disabled = false;
  epilogueButton.disabled = false;

  voiceResult.textContent = "";

  updateTimerDisplay();

  // エピローグを再び表示する
  showEpilogue();
});


/* ==============================
   初期表示
============================== */

function initializeGame() {
  updateTimerDisplay();

  // 最初にエピローグを表示する
  // エピローグを閉じると10分のタイマーが開始される
  showEpilogue();
}

initializeGame();
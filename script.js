
"use strict";

/* =========================
   設定
========================= */

// 制限時間：10分
const GAME_TIME_SECONDS = 10 * 60;

// エピローグのスクロール時間：60秒
const EPILOGUE_SCROLL_SECONDS = 60;

// USBを認識したときに表示する文章
const RECOGNIZED_MESSAGE = "立ち入り禁止の看板をよく見ろ";

// 音声認識で探す言葉
const RECOGNITION_WORD = /\bU\s*S\s*B\b/i;


/* =========================
   エピローグ本文
========================= */

// エピローグ1
// 以前使っていた本文がある場合は、この文章だけ差し替えてください。
const epilogue1Text = `放課後の校舎に残された謎。

散らばった手がかりをつなぎ合わせ、
隠された真実を明らかにしよう。

すべての謎を解き明かしたとき、
物語の最後の扉が開かれる。`;

// エピローグ2
const epilogue2Text = `結果、それらを隠したのは同じゼミ生の一人だった。

理由はその研究結果を後日自分だけの名義で発表して自分の手柄にするためであった。

ただ、見つかったUSBは主人公のUSBの他に、ゼミ生全員分のUSBも混在していた。

また、PCのパスワードも変更されていた。

プレイヤーは、正しいUSBと正しいパスワードを導き出し、PC内に回答しよう！`;


/* =========================
   HTML要素
========================= */

const gameScreen = document.getElementById("gameScreen");
const timerElement = document.getElementById("timer");

const imageButton = document.getElementById("imageButton");
const voiceResult = document.getElementById("voiceResult");

const epilogueButton = document.getElementById("epilogueButton");
const epilogue2Button = document.getElementById("epilogue2Button");

const epilogueScreen = document.getElementById("epilogueScreen");
const epilogueTitle = document.getElementById("epilogueTitle");
const epilogueText = document.getElementById("epilogueText");
const closeEpilogueButton = document.getElementById("closeEpilogueButton");


/* =========================
   タイマー
========================= */

let remainingTime = GAME_TIME_SECONDS;
let timerInterval = null;
let gameStarted = false;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0")
  );
}

function updateTimer() {
  timerElement.textContent = formatTime(remainingTime);

  timerElement.classList.toggle(
    "warning",
    remainingTime > 0 && remainingTime <= 60
  );

  timerElement.classList.toggle(
    "timeup",
    remainingTime <= 0
  );
}

function startTimer() {
  if (timerInterval !== null || remainingTime <= 0) {
    return;
  }

  gameStarted = true;
  updateTimer();

  timerInterval = window.setInterval(() => {
    if (remainingTime > 0) {
      remainingTime--;
      updateTimer();
    }

    if (remainingTime <= 0) {
      window.clearInterval(timerInterval);
      timerInterval = null;
      stopVoiceRecognition();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}


/* =========================
   エピローグ表示
========================= */

let epilogueTimeout = null;

function showEpilogue(title, content) {
  stopVoiceRecognition();

  if (epilogueTimeout !== null) {
    window.clearTimeout(epilogueTimeout);
    epilogueTimeout = null;
  }

  epilogueTitle.textContent = title;
  epilogueText.textContent = content;

  epilogueScreen.classList.remove("hidden");

  // スクロールアニメーションを最初から再生
  epilogueTitle.style.animation = "none";
  epilogueText.style.animation = "none";

  void epilogueScreen.offsetHeight;

  const duration = `${EPILOGUE_SCROLL_SECONDS}s`;

  epilogueTitle.style.animation =
    `epilogueTitleScroll ${duration} linear forwards`;

  epilogueText.style.animation =
    `epilogueScroll ${duration} linear forwards`;

  // スクロール終了後も画面は自動で閉じない。
  // 「戻る」ボタンを押すとゲーム画面に戻る。
}

function hideEpilogue() {
  if (epilogueTimeout !== null) {
    window.clearTimeout(epilogueTimeout);
    epilogueTimeout = null;
  }

  epilogueScreen.classList.add("hidden");

  // ゲーム開始前なら、戻ったタイミングでタイマーを開始
  if (!gameStarted) {
    startTimer();
  }
}

epilogueButton.addEventListener("click", () => {
  showEpilogue("EPILOGUE", epilogue1Text);
});

epilogue2Button.addEventListener("click", () => {
  showEpilogue("EPILOGUE 2", epilogue2Text);
});

closeEpilogueButton.addEventListener("click", hideEpilogue);


/* =========================
   音声認識
========================= */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let recognition = null;
let isHoldingButton = false;
let recognitionRunning = false;
let recognitionSupported = Boolean(SpeechRecognition);
let usbAlreadyRecognized = false;

if (recognitionSupported) {
  recognition = new SpeechRecognition();

  // USBという英字を認識するため英語設定
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  recognition.onstart = () => {
    recognitionRunning = true;
    imageButton.classList.add("listening");
  };

  recognition.onresult = (event) => {
    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      const result = event.results[i];

      for (let j = 0; j < result.length; j++) {
        const transcript = result[j].transcript;

        // USBと認識したら指定の文章を表示
        if (RECOGNITION_WORD.test(transcript)) {
          usbAlreadyRecognized = true;
          voiceResult.textContent = RECOGNIZED_MESSAGE;

          stopVoiceRecognition();
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
      voiceResult.textContent = "マイクの使用を許可してください。";
    }

    recognitionRunning = false;
    imageButton.classList.remove("listening");
  };

  recognition.onend = () => {
    recognitionRunning = false;
    imageButton.classList.remove("listening");

    // ボタンを押し続けている場合は再開を試みる
    if (
      isHoldingButton &&
      !usbAlreadyRecognized &&
      epilogueScreen.classList.contains("hidden")
    ) {
      window.setTimeout(() => {
        if (
          isHoldingButton &&
          !recognitionRunning &&
          !usbAlreadyRecognized
        ) {
          startVoiceRecognition();
        }
      }, 200);
    }
  };
}


/* =========================
   音声認識の開始・停止
========================= */

function startVoiceRecognition() {
  if (!recognitionSupported || !recognition) {
    return;
  }

  if (
    recognitionRunning ||
    usbAlreadyRecognized ||
    !isHoldingButton
  ) {
    return;
  }

  try {
    recognition.start();
  } catch (error) {
    // すでに開始されている場合などは無視
    console.debug("音声認識を開始できませんでした:", error);
  }
}

function stopVoiceRecognition() {
  isHoldingButton = false;
  imageButton.classList.remove("listening");

  if (recognition && recognitionRunning) {
    try {
      recognition.stop();
    } catch (error) {
      console.debug("音声認識を停止できませんでした:", error);
    }
  }
}


/* =========================
   画像ボタンの長押し
========================= */

function handlePressStart(event) {
  if (!epilogueScreen.classList.contains("hidden")) {
    return;
  }

  if (event.cancelable) {
    event.preventDefault();
  }

  isHoldingButton = true;

  // 「聞き取り中…」などの文字は表示しない
  if (!usbAlreadyRecognized) {
    voiceResult.textContent = "";
  }

  if (!recognitionSupported) {
    voiceResult.textContent =
      "このブラウザでは音声認識を利用できません。";
    return;
  }

  startVoiceRecognition();
}

function handlePressEnd() {
  isHoldingButton = false;
  imageButton.classList.remove("listening");

  if (recognition && recognitionRunning) {
    try {
      recognition.stop();
    } catch (error) {
      console.debug("音声認識を停止できませんでした:", error);
    }
  }
}

imageButton.addEventListener("pointerdown", handlePressStart);
imageButton.addEventListener("pointerup", handlePressEnd);
imageButton.addEventListener("pointercancel", handlePressEnd);
imageButton.addEventListener("lostpointercapture", handlePressEnd);

// 右クリックメニューや画像のドラッグを防止
imageButton.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

imageButton.addEventListener("dragstart", (event) => {
  event.preventDefault();
});


/* =========================
   初期化
========================= */

function initializeGame() {
  remainingTime = GAME_TIME_SECONDS;
  updateTimer();

  // 最初にエピローグ1を表示。
  // 「戻る」を押すと10分のタイマーが始まる。
  showEpilogue("EPILOGUE", epilogue1Text);
}

initializeGame();

"use strict";

/* ========================================
   設定
======================================== */

// 制限時間：10分
const GAME_TIME = 10 * 60;

// エピローグのスクロール時間：60秒
const EPILOGUE_DURATION = 60000;

// エピローグ自動終了までの時間
const EPILOGUE_AUTO_CLOSE = 60000;


/* ========================================
   エピローグ1の文章
======================================== */

// 以前のエピローグ1の本文がある場合は、
// 下の文章を以前の本文に置き換えてください。
const epilogue1Text = `
ここにエピローグ1の本文を入れてください。
`;


/* ========================================
   エピローグ2の文章
======================================== */

const epilogue2Text = `
結果、それらを隠したのは同じゼミ生の一人だった。

理由はその研究結果を後日自分だけの名義で発表して自分の手柄にするためであった。

ただ、見つかったUSBは主人公のUSBの他に、ゼミ生全員分のUSBも混在していた。

また、PCのパスワードも変更されていた。

プレイヤーは、正しいUSBと正しいパスワードを導き出し、PC内に回答しよう！
`;


/* ========================================
   HTML要素
======================================== */

const gameScreen = document.getElementById("gameScreen");
const timerElement = document.getElementById("timer");

const imageButton = document.getElementById("imageButton");
const voiceResult = document.getElementById("voiceResult");

const epilogueButton = document.getElementById("epilogueButton");
const epilogueScreen = document.getElementById("epilogueScreen");
const epilogueTitle = document.getElementById("epilogueTitle");
const epilogueText = document.getElementById("epilogueText");
const epilogueViewport = document.getElementById("epilogueViewport");

const epilogue2Button = document.getElementById("epilogue2Button");
const closeEpilogueButton =
  document.getElementById("closeEpilogueButton");
const skipHint = document.getElementById("skipHint");


/* ========================================
   タイマー
======================================== */

let remainingTime = GAME_TIME;
let timerInterval = null;
let timerStarted = false;
let timerFinished = false;

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
  if (!timerElement) return;

  timerElement.textContent = formatTime(remainingTime);

  timerElement.classList.remove("warning", "timeup");

  if (remainingTime <= 60 && remainingTime > 0) {
    timerElement.classList.add("warning");
  }

  if (remainingTime <= 0) {
    timerElement.textContent = "00:00";
    timerElement.classList.add("timeup");
  }
}

function startTimer() {
  if (timerStarted || timerFinished) return;

  timerStarted = true;
  updateTimer();

  timerInterval = setInterval(() => {
    if (remainingTime > 0) {
      remainingTime--;
      updateTimer();
    }

    if (remainingTime <= 0) {
      stopTimer();
      timerFinished = true;
      timerElement.textContent = "00:00";
      timerElement.classList.add("timeup");
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}


/* ========================================
   エピローグ
======================================== */

let epilogueOpen = false;
let epilogueAutoCloseTimeout = null;

function clearEpilogueAutoClose() {
  if (epilogueAutoCloseTimeout !== null) {
    clearTimeout(epilogueAutoCloseTimeout);
    epilogueAutoCloseTimeout = null;
  }
}

function showEpilogue(title, content) {
  clearEpilogueAutoClose();

  stopVoiceRecognition();

  epilogueOpen = true;

  gameScreen.classList.add("hidden");
  epilogueScreen.classList.remove("hidden");

  epilogueTitle.textContent = title;
  epilogueText.textContent = content;

  // スクロールアニメーションを最初からやり直す
  epilogueText.classList.remove("scrolling");

  // アニメーションを確実に再起動する
  void epilogueText.offsetHeight;

  epilogueText.style.animationDuration =
    `${EPILOGUE_DURATION / 1000}s`;

  epilogueText.classList.add("scrolling");

  // エピローグ1は自動で閉じる。
  // エピローグ2は文章を読み終える時間を確保し、
  // 自動では閉じない。
  if (title === "EPILOGUE") {
    epilogueAutoCloseTimeout = setTimeout(() => {
      closeEpilogue();
    }, EPILOGUE_AUTO_CLOSE);
  }
}

function showEpilogue1() {
  showEpilogue("EPILOGUE", epilogue1Text);
}

function showEpilogue2() {
  // エピローグ2を表示している間は自動で閉じない
  clearEpilogueAutoClose();
  showEpilogue("EPILOGUE 2", epilogue2Text);
}

function closeEpilogue() {
  clearEpilogueAutoClose();

  epilogueOpen = false;

  epilogueScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  // エピローグを閉じた最初のタイミングでタイマー開始
  startTimer();
}


/* ========================================
   エピローグのボタン
======================================== */

if (epilogueButton) {
  epilogueButton.addEventListener("click", (event) => {
    event.stopPropagation();
    showEpilogue1();
  });
}

if (epilogue2Button) {
  epilogue2Button.addEventListener("click", (event) => {
    event.stopPropagation();
    showEpilogue2();
  });
}

if (closeEpilogueButton) {
  closeEpilogueButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeEpilogue();
  });
}

// エピローグ画面の背景をタップすると閉じる。
// ボタンや文章部分を押した場合は閉じない。
if (epilogueScreen) {
  epilogueScreen.addEventListener("click", (event) => {
    if (
      event.target === epilogueScreen ||
      event.target === epilogueViewport
    ) {
      closeEpilogue();
    }
  });
}


/* ========================================
   音声認識
======================================== */

const SpeechRecognitionAPI =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let recognition = null;
let recognitionRunning = false;
let isHoldingKey = false;
let recognitionRestartTimeout = null;
let voiceRecognitionUnavailable = false;

function showVoiceMessage(message) {
  if (!voiceResult) return;

  voiceResult.textContent = message;

  if (message) {
    voiceResult.classList.add("visible");
  } else {
    voiceResult.classList.remove("visible");
  }
}

function clearRecognitionRestartTimeout() {
  if (recognitionRestartTimeout !== null) {
    clearTimeout(recognitionRestartTimeout);
    recognitionRestartTimeout = null;
  }
}

function stopVoiceRecognition() {
  isHoldingKey = false;
  clearRecognitionRestartTimeout();

  if (recognition && recognitionRunning) {
    try {
      recognition.stop();
    } catch (error) {
      console.log("音声認識の停止:", error);
    }
  }

  // 聞き取り中の文字は表示しない
}

function startVoiceRecognition() {
  if (!SpeechRecognitionAPI) {
    voiceRecognitionUnavailable = true;
    showVoiceMessage("このブラウザでは音声認識を利用できません。");
    return;
  }

  if (epilogueOpen || timerFinished) {
    return;
  }

  if (recognitionRunning) {
    return;
  }

  clearRecognitionRestartTimeout();

  if (!recognition) {
    recognition = new SpeechRecognitionAPI();

    // USBという英語を認識しやすくする設定
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      recognitionRunning = true;

      // 「聞き取り中…」などの文字は表示しない
      if (
        voiceResult.textContent !==
        "立ち入り禁止の看板をよく見ろ"
      ) {
        showVoiceMessage("");
      }
    };

    recognition.onresult = (event) => {
      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const result = event.results[i];

        for (
          let j = 0;
          j < result.length;
          j++
        ) {
          const transcript = result[j].transcript
            .trim()
            .toUpperCase()
            .replace(/[.,!?。、！？]/g, " ");

          // USB、U S B、U-S-Bなどを判定
          const normalized = transcript
            .replace(/[^A-Z0-9]/g, "");

          const isUSB =
            normalized.includes("USB") ||
            /\bU\s*[- ]\s*S\s*[- ]\s*B\b/i.test(transcript);

          if (isUSB) {
            // 認識成功メッセージを表示
            showVoiceMessage(
              "立ち入り禁止の看板をよく見ろ"
            );

            // 認識後は音声認識を終了
            isHoldingKey = false;
            stopVoiceRecognition();

            return;
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.log("音声認識エラー:", event.error);

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        isHoldingKey = false;
        showVoiceMessage("マイクの使用を許可してください。");
      } else if (event.error === "audio-capture") {
        isHoldingKey = false;
        showVoiceMessage("マイクを利用できません。");
      }

      // 通常の無音や一時的なエラーでは
      // 「聞き取り中」などを表示しない
    };

    recognition.onend = () => {
      recognitionRunning = false;

      // 押し続けている場合だけ再開を試みる
      if (
        isHoldingKey &&
        !epilogueOpen &&
        !timerFinished
      ) {
        clearRecognitionRestartTimeout();

        recognitionRestartTimeout = setTimeout(() => {
          if (
            isHoldingKey &&
            !epilogueOpen &&
            !timerFinished
          ) {
            try {
              recognition.start();
            } catch (error) {
              console.log("音声認識の再開:", error);
            }
          }
        }, 250);
      }
    };
  }

  try {
    recognition.start();
  } catch (error) {
    console.log("音声認識の開始:", error);
  }
}


/* ========================================
   画像ボタンの長押し操作
======================================== */

function beginVoiceHold(event) {
  if (event) {
    event.preventDefault();
  }

  if (epilogueOpen || timerFinished) return;

  // 認識成功メッセージを消してから再認識
  showVoiceMessage("");

  isHoldingKey = true;
  startVoiceRecognition();
}

function endVoiceHold(event) {
  if (event) {
    event.preventDefault();
  }

  isHoldingKey = false;
  clearRecognitionRestartTimeout();

  if (recognition && recognitionRunning) {
    try {
      recognition.stop();
    } catch (error) {
      console.log("音声認識の停止:", error);
    }
  }

  // 認識成功メッセージ以外は表示しない
}

if (imageButton) {
  imageButton.addEventListener("pointerdown", (event) => {
    beginVoiceHold(event);

    try {
      imageButton.setPointerCapture(event.pointerId);
    } catch (error) {
      // Pointer Capture非対応時は何もしない
    }
  });

  imageButton.addEventListener("pointerup", endVoiceHold);
  imageButton.addEventListener("pointercancel", endVoiceHold);
  imageButton.addEventListener("lostpointercapture", () => {
    isHoldingKey = false;
  });

  // 右クリックメニューなどを抑制
  imageButton.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  // キーボード操作にも対応
  imageButton.addEventListener("keydown", (event) => {
    if (
      event.key === " " ||
      event.key === "Enter"
    ) {
      if (!event.repeat) {
        beginVoiceHold(event);
      }
    }
  });

  imageButton.addEventListener("keyup", (event) => {
    if (
      event.key === " " ||
      event.key === "Enter"
    ) {
      endVoiceHold(event);
    }
  });
}


/* ========================================
   画面操作の補助
======================================== */

// iPadなどでダブルタップによる拡大を抑制
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

// 長押しメニューを抑制
document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});


/* ========================================
   起動時
======================================== */

function initializeGame() {
  remainingTime = GAME_TIME;
  timerStarted = false;
  timerFinished = false;

  updateTimer();

  // ページを開いたら最初のエピローグを表示
  showEpilogue1();
}

initializeGame();
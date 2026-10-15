
/* =========================================================
   脱出ゲーム メインJavaScript
========================================================= */


/* =========================================================
   設定
========================================================= */

// 制限時間：12分
const GAME_TIME = 12 * 60;

// エピローグの表示時間：35秒
const EPILOGUE_DURATION = 35000;


/* =========================================================
   HTML要素
========================================================= */

const gameScreen = document.getElementById("gameScreen");

const epilogueScreen =
  document.getElementById("epilogueScreen");

const epilogueText =
  document.getElementById("epilogueText");

const timerElement =
  document.getElementById("timer");

const epilogueButton =
  document.getElementById("epilogueButton");

const closeEpilogueButton =
  document.getElementById("closeEpilogueButton");

const imageButton =
  document.getElementById("imageButton");


/* =========================================================
   タイマー状態
========================================================= */

// 残り時間
let remainingTime = GAME_TIME;

// タイマー開始済みか
let timerStarted = false;

// タイマーのID
let timerInterval = null;

// エピローグが表示中か
let epilogueOpen = false;

// エピローグ自動終了タイマー
let epilogueTimeout = null;


/* =========================================================
   タイマー表示
========================================================= */

function updateTimer() {
  // 0未満にならないようにする
  remainingTime = Math.max(0, remainingTime);

  // 分と秒を計算
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;

  // 2桁表示
  const minuteText = String(minutes).padStart(2, "0");
  const secondText = String(seconds).padStart(2, "0");

  // タイマー表示
  timerElement.textContent =
    `${minuteText}:${secondText}`;

  // 警告表示をリセット
  timerElement.classList.remove("warning");

  // 残り1分以下なら警告
  if (remainingTime <= 60 && remainingTime > 0) {
    timerElement.classList.add("warning");
  }

  // 時間切れ
  if (remainingTime === 0) {
    timerElement.classList.remove("warning");
    timerElement.classList.add("timeup");

    stopTimer();

    console.log("制限時間終了");
  }
}


/* =========================================================
   タイマー開始
========================================================= */

function startTimer() {
  // 二重起動を防ぐ
  if (timerStarted) {
    return;
  }

  // 開始済みにする
  timerStarted = true;

  // 初回表示
  updateTimer();

  // 1秒ごとにカウントダウン
  timerInterval = setInterval(() => {
    if (remainingTime > 0) {
      remainingTime--;
      updateTimer();
    } else {
      stopTimer();
    }
  }, 1000);
}


/* =========================================================
   タイマー停止
========================================================= */

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}


/* =========================================================
   エピローグ表示
========================================================= */

function showEpilogue() {
  // 古い自動終了タイマーを解除
  if (epilogueTimeout !== null) {
    clearTimeout(epilogueTimeout);
    epilogueTimeout = null;
  }

  // エピローグを表示
  epilogueScreen.classList.remove("hidden");

  epilogueOpen = true;

  // 文章アニメーションをリセット
  epilogueText.style.animation = "none";

  // 再描画してアニメーションを再実行できるようにする
  void epilogueText.offsetWidth;

  // 文章スクロールを最初から再生
  epilogueText.style.animation =
    "epilogueScroll 35s linear forwards";

  // 35秒後に自動終了
  epilogueTimeout = setTimeout(() => {
    if (epilogueOpen) {
      closeEpilogue();
    }
  }, EPILOGUE_DURATION);
}


/* =========================================================
   エピローグ終了
========================================================= */

function closeEpilogue() {
  // すでに閉じていたら何もしない
  if (!epilogueOpen) {
    return;
  }

  epilogueOpen = false;

  // 自動終了タイマーを解除
  if (epilogueTimeout !== null) {
    clearTimeout(epilogueTimeout);
    epilogueTimeout = null;
  }

  // エピローグを非表示
  epilogueScreen.classList.add("hidden");

  // タイマーを開始
  // すでに開始済みなら二重起動しない
  startTimer();
}


/* =========================================================
   エピローグ再表示ボタン
========================================================= */

epilogueButton.addEventListener("click", (event) => {
  event.stopPropagation();

  showEpilogue();
});


/* =========================================================
   スキップボタン
========================================================= */

closeEpilogueButton.addEventListener("click", (event) => {
  event.stopPropagation();

  closeEpilogue();
});


/* =========================================================
   エピローグ画面のタップでスキップ
========================================================= */

epilogueScreen.addEventListener("click", (event) => {
  // スキップボタンの処理と重複させない
  if (closeEpilogueButton.contains(event.target)) {
    return;
  }

  // エピローグが表示中なら閉じる
  if (epilogueOpen) {
    closeEpilogue();
  }
});


/* =========================================================
   画像ボタン
========================================================= */

imageButton.addEventListener("click", () => {
  console.log("画像ボタンが押されました");

  /*
    ここにボタンを押したときの処理を追加できます。

    例：
    ・謎解き画面を表示する
    ・画像や文章を表示する
    ・別のページに移動する
    ・正解判定を行う
  */
});


/* =========================================================
   ページ読み込み
========================================================= */

window.addEventListener("load", () => {
  // タイマーの初期表示
  updateTimer();

  // 最初にエピローグを表示
  showEpilogue();
});


/* =========================================================
   iPad向けダブルタップズーム防止
========================================================= */

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
  {
    passive: false
  }
);


/* =========================================================
   長押しメニュー防止
========================================================= */

document.addEventListener("contextmenu", (event) => {
  // ボタンや画像の長押しメニューを防止
  event.preventDefault();
});

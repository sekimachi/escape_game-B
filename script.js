
/* =========================================================
   脱出ゲーム メインJavaScript
========================================================= */


/* =========================================================
   設定
========================================================= */

/*
  制限時間

  12分 × 60秒
  = 720秒
*/

const GAME_TIME = 12 * 60;


/*
  エピローグの長さ

  CSSの35秒と合わせる
*/

const EPILOGUE_DURATION = 35000;


/* =========================================================
   HTML要素
========================================================= */

const gameScreen =
  document.getElementById("gameScreen");

const epilogueScreen =
  document.getElementById("epilogueScreen");

const epilogueText =
  document.getElementById("epilogueText");

const timerElement =
  document.getElementById("timer");

const epilogueButton =
  document.getElementById("epilogueButton");

const closeEpilogueButton =
  document.getElementById(
    "closeEpilogueButton"
  );


/* =========================================================
   タイマー状態
========================================================= */


/*
  残り時間
*/

let remainingTime =
  GAME_TIME;


/*
  タイマーが開始済みか
*/

let timerStarted =
  false;


/*
  setIntervalのID
*/

let timerInterval =
  null;


/*
  初回エピローグかどうか
*/

let firstEpilogue =
  true;


/*
  初回エピローグの自動終了タイマー
*/

let epilogueTimeout =
  null;


/* =========================================================
   タイマー表示
========================================================= */

function updateTimer() {

  /*
    0未満にならないようにする
  */

  if (remainingTime < 0) {

    remainingTime = 0;
  }


  /*
    分を計算
  */

  const minutes =
    Math.floor(
      remainingTime / 60
    );


  /*
    秒を計算
  */

  const seconds =
    remainingTime % 60;


  /*
    2桁表示
  */

  const minuteText =
    String(minutes)
      .padStart(2, "0");

  const secondText =
    String(seconds)
      .padStart(2, "0");


  /*
    タイマー表示
  */

  timerElement.textContent =
    `${minuteText}:${secondText}`;


  /*
    残り1分以下
  */

  if (
    remainingTime <= 60 &&
    remainingTime > 0
  ) {

    timerElement.classList.add(
      "warning"
    );

  } else {

    timerElement.classList.remove(
      "warning"
    );
  }


  /*
    時間切れ
  */

  if (
    remainingTime === 0
  ) {

    timerElement.classList.remove(
      "warning"
    );

    timerElement.classList.add(
      "timeup"
    );

    stopTimer();

    console.log(
      "制限時間終了"
    );
  }
}


/* =========================================================
   タイマー開始
========================================================= */

function startTimer() {

  /*
    二重起動防止
  */

  if (timerStarted) {

    return;
  }


  /*
    開始済みにする
  */

  timerStarted = true;


  /*
    最初の表示
  */

  updateTimer();


  /*
    1秒ごとに処理
  */

  timerInterval =
    setInterval(() => {

      /*
        残り時間がある場合
      */

      if (
        remainingTime > 0
      ) {

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

  if (
    timerInterval !== null
  ) {

    clearInterval(
      timerInterval
    );

    timerInterval = null;
  }
}


/* =========================================================
   エピローグ表示
========================================================= */

function showEpilogue() {

  /*
    エピローグを表示
  */

  epilogueScreen.classList.remove(
    "hidden"
  );


  /*
    文章アニメーションを
    一度リセットする
  */

  epilogueText.style.animation =
    "none";


  /*
    強制的に再描画する

    これによって、
    何度エピローグを開いても
    最初から文章が流れる
  */

  void epilogueText.offsetWidth;


  /*
    エピローグ再生
  */

  epilogueText.style.animation =
    "epilogueScroll 35s linear forwards";
}


/* =========================================================
   エピローグ終了
========================================================= */

function closeEpilogue() {

  /*
    自動終了処理を解除
  */

  if (
    epilogueTimeout !== null
  ) {

    clearTimeout(
      epilogueTimeout
    );

    epilogueTimeout = null;
  }


  /*
    エピローグを閉じる
  */

  epilogueScreen.classList.add(
    "hidden"
  );


  /*
    タイマー開始

    すでに開始済みなら
    何もしない
  */

  startTimer();
}


/* =========================================================
   初回エピローグ
========================================================= */

function startFirstEpilogue() {

  /*
    初回状態
  */

  firstEpilogue = true;


  /*
    文章を最初から再生
  */

  showEpilogue();


  /*
    35秒後に自動終了
  */

  epilogueTimeout =
    setTimeout(() => {

      /*
        まだ初回エピローグなら
        自動的に閉じる
      */

      if (
        firstEpilogue
      ) {

        firstEpilogue = false;

        closeEpilogue();
      }

    }, EPILOGUE_DURATION);
}


/* =========================================================
   エピローグボタン
========================================================= */

epilogueButton.addEventListener(
  "click",
  () => {

    showEpilogue();
  }
);


/* =========================================================
   スキップボタン
========================================================= */

closeEpilogueButton.addEventListener(
  "click",
  (event) => {

    /*
      親要素のクリック処理に
      伝わらないようにする
    */

    event.stopPropagation();


    /*
      初回エピローグ終了
    */

    firstEpilogue = false;


    /*
      エピローグ終了
    */

    closeEpilogue();
  }
);


/* =========================================================
   エピローグ画面タップ
========================================================= */

epilogueScreen.addEventListener(
  "click",
  (event) => {

    /*
      スキップボタンを押した場合は
      ここでは処理しない
    */

    if (
      event.target ===
      closeEpilogueButton
    ) {

      return;
    }


    /*
      初回エピローグのみ
      画面タップでスキップ
    */

    if (
      firstEpilogue
    ) {

      firstEpilogue = false;

      closeEpilogue();
    }
  }
);


/* =========================================================
   ページ読み込み
========================================================= */

window.addEventListener(
  "load",
  () => {

    /*
      初期タイマー表示
    */

    updateTimer();


    /*
      エピローグ開始
    */

    startFirstEpilogue();
  }
);


/* =========================================================
   iPad向けダブルタップズーム防止
========================================================= */

let lastTouchEnd = 0;


document.addEventListener(
  "touchend",
  (event) => {

    const now =
      Date.now();


    if (
      now - lastTouchEnd <= 300
    ) {

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

document.addEventListener(
  "contextmenu",
  (event) => {

    event.preventDefault();
  }
);

/** 觸發時間：小時 */
let triggerHour;
/** 觸發時間：分鐘 */
let triggerMinute;
/** 觸發時間：秒鐘 */
let triggerSecond;
/** 現在時間 Date 物件 */
let now = new Date();
/** 倒數計時剩餘秒數 */
let countdownSeconds = 0;
/** 倒數計時 Timeout ID */
let countdownTimeoutId;

/** 是否呈現 debug 訊息 */
const debugFlag = false;
/** 於 console 與 log 檔呈現 debug 訊息 */
function debug(message) {
    if (!debugFlag) return;
    console.log('[DEBUG] ' + message);
    Neutralino.debug.log(message, 'DEBUG');
}


// ===== 初始化 =====
Neutralino.init();

Neutralino.events.on("ready", async () => {
    debug('Neutralino 準備就緒！');
    
    // 設置系統托盤
    setTray();
    
    // 註冊事件監聽
    Neutralino.events.on("trayMenuItemClicked", onTrayClicked);
    Neutralino.events.on("windowClose", () => {
        Neutralino.app.exit();
    });

    // 載入設定並啟動定時器
    await loadSettings();
    timer();
    setInterval(timer, 1000);  // 每秒行動
    
    debug('初始化成功！');
});


// ===== 載入設定檔 =====

/** 載入設定檔：stop-wandering-on-windows-settings.ini */
async function loadSettings() {
    try {
        // 使用 NL_PATH 獲取程式所在目錄的絕對路徑，避免開機啟動時工作目錄錯誤
        const settingsPath = `${NL_PATH}/stop-wandering-on-windows-settings.ini`;
        debug(`正在從此路徑讀取設定檔：${settingsPath}`);
        
        const data = await Neutralino.filesystem.readFile(settingsPath);
        const lines = data.split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line.charAt(0) === '[' || line.indexOf('time=') < 0) continue;
            const [_, time] = line.split("=");
            [triggerHour, triggerMinute, triggerSecond] = time.split(":").map(Number);
            debug(`觸發時間：${String(triggerHour).padStart(2, '0')}:${String(triggerMinute).padStart(2, '0')}:${String(triggerSecond).padStart(2, '0')}`);
        }
    } catch (error) {
        Neutralino.debug.log('設定檔 stop-wandering-on-windows-settings.ini 不存在或讀取失敗！', 'WARNING');
        debug(`讀取設定檔失敗：${error.message}`);
    }
}


// ===== tray =====

/** 設置系統托盤 */
function setTray() {
    if (NL_OS !== 'Darwin' && NL_MODE === 'window') {
        let tray = {
            icon: "/src/favicon.png",
            menuItems: [
                { id: "OPEN", text: "開啟視窗" },
                // { text: "-" },
                // { id: "QUIT", text: "關閉" },
            ]
        };
        Neutralino.os.setTray(tray);
    }
}

/** 系統托盤行為 */
async function onTrayClicked(event) {
    debug('onTrayClicked');
    switch(event.detail.id) {
        case 'OPEN':
            show();
            break;
        // case 'QUIT':
        //     Neutralino.app.exit();
        //     break;
    }
}


// ===== 時間 =====

/** 顯示時間 */
function showTime() {
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('hour-1').textContent = hour.charAt(0);
    document.getElementById('hour-2').textContent = hour.charAt(1);
    document.getElementById('minute-1').textContent = minute.charAt(0);
    document.getElementById('minute-2').textContent = minute.charAt(1);
    document.getElementById('second-1').textContent = second.charAt(0);
    document.getElementById('second-2').textContent = second.charAt(1);

    // debug(`現在時間：${hour}:${minute}:${second}，倒數計時 ${countdownSeconds} 秒。`);

    if (countdownSeconds >= 0) {
        document.getElementById('countdown').textContent = countdownSeconds;
        countdownSeconds--;
    }
}

/** 每秒行動的定時器 */
function timer() {
    now = new Date();
    showTime();

    if (now.getHours() === triggerHour &&
        now.getMinutes() === triggerMinute &&
        now.getSeconds() === triggerSecond
    ) {
        startCountdown();
    }
}

/** 開始倒數 60 秒關機 */
function startCountdown() {
    if (countdownTimeoutId) {
        clearTimeout(countdownTimeoutId);
        countdownTimeoutId = undefined;
    }
    countdownTimeoutId = setTimeout(() => {
        debug(new Date().toLocaleTimeString() + '：關機！');
        Neutralino.os.execCommand('shutdown /s /t 0');
    }, 60500);  // 60.5 秒
    countdownSeconds = 60;

    showTime();
    show();
}


// ===== 顯示視窗 =====

/** 顯示視窗 */
async function show() {
    const ratio = window.devicePixelRatio;  // 介面縮放比例

    // 右下四分之一的尺寸
    const overlayWidth = Math.floor(window.screen.availWidth * ratio / 2);
    const overlayHeight = Math.floor(window.screen.availHeight * ratio / 2);

    // 視窗左上角的 x 與 y 座標
    const posX = overlayWidth;
    const posY = overlayHeight;

    // 依序執行視窗變形與移動
    await Neutralino.window.setSize({
        width: overlayWidth,
        height: overlayHeight
    });
    await Neutralino.window.move(posX, posY);

    // 設定為最頂層並顯示
    await Neutralino.window.setAlwaysOnTop(true);
    await Neutralino.window.show();
    await Neutralino.window.focus();
}


// ===== 按鈕功能 =====

/** 隱藏 5 秒鐘 */
function minimize() {
    Neutralino.window.hide();
    setTimeout(() => {
        show();
    }, 5000);  // 5 秒鐘
}

/** 延遲 10 分鐘 */
function delay() {
    Neutralino.window.hide();
    setTimeout(() => {
        startCountdown();
    }, 600000);  // 10 分鐘
    if (countdownTimeoutId) {
        clearTimeout(countdownTimeoutId);
        countdownTimeoutId = undefined;
    }
}



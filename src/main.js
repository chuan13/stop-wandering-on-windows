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

/** 視窗恢復與顯示邏輯 */
async function restoreWindow() {
    debug('正在執行 restoreWindow...');
    try {
        const isVisible = await Neutralino.window.isVisible();
        debug(`視窗目前狀態: ${isVisible ? '可見' : '隱藏'}`);

        if (!isVisible) {
            await Neutralino.window.show();
        }

        // 處理可能被最小化的情況
        try {
            await Neutralino.window.unminimize();
        } catch (e) {
            // 有些版本可能不支援 unminimize 或視窗未最小化時會報錯
        }

        const ratio = window.devicePixelRatio || 1;
        const overlayWidth = Math.floor(window.screen.availWidth * ratio / 2);
        const overlayHeight = Math.floor(window.screen.availHeight * ratio / 2);
        const posX = overlayWidth;
        const posY = overlayHeight;

        await Neutralino.window.setSize({
            width: overlayWidth,
            height: overlayHeight
        });
        await Neutralino.window.move(posX, posY);

        // 強制置頂與焦點，觸發 Z-order 刷新
        await Neutralino.window.setAlwaysOnTop(true);
        await Neutralino.window.focus();
        debug('restoreWindow 執行完畢');
    } catch (err) {
        debug(`restoreWindow 發生錯誤: ${err.message}`);
        // 如果 API 失效，嘗試重新載入作為最後手段
        window.location.reload();
    }
}

Neutralino.events.on("ready", async () => {
    debug('Neutralino 準備就緒！');
    
    // 設置系統托盤
    setTray();
    
    // 註冊事件監聽
    Neutralino.events.on("trayMenuItemClicked", onTrayClicked);
    Neutralino.events.on("windowClose", () => {
        debug('視窗關閉，程式結束');
        Neutralino.app.exit();
    });

    // 關鍵修補：監聽伺服器斷線（睡眠後常見狀況）
    Neutralino.events.on("serverOffline", () => {
        debug('檢測到 Neutralino 伺服器斷線，正在重新載入...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
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
        // 使用 NL_PATH 獲取程式所在目錄的絕對路徑
        const settingsPath = `${NL_PATH}/stop-wandering-on-windows-settings.ini`;
        debug(`正在從此路徑讀取設定檔：${settingsPath}`);
        
        const data = await Neutralino.filesystem.readFile(settingsPath);
        const lines = data.split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line.charAt(0) === '[' || line.indexOf('time=') < 0) continue;
            const [_, time] = line.split("=");
            const timeParts = time.split(":").map(Number);
            if (timeParts.length === 3) {
                [triggerHour, triggerMinute, triggerSecond] = timeParts;
                debug(`觸發時間設定成功：${String(triggerHour).padStart(2, '0')}:${String(triggerMinute).padStart(2, '0')}:${String(triggerSecond).padStart(2, '0')}`);
            }
        }
    } catch (error) {
        debug(`讀取設定檔失敗：${error.message}`);
        Neutralino.debug.log('設定檔讀取失敗，請檢查檔案是否存在', 'WARNING');
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
            ]
        };
        Neutralino.os.setTray(tray);
        debug('系統托盤已設置');
    }
}

/** 系統托盤行為 */
async function onTrayClicked(event) {
    debug(`點擊托盤選單: ${event.detail.id}`);
    switch(event.detail.id) {
        case 'OPEN':
            restoreWindow();
            break;
    }
}


// ===== 時間 =====

/** 顯示時間 */
function showTime() {
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    const elements = {
        'hour-1': hour.charAt(0),
        'hour-2': hour.charAt(1),
        'minute-1': minute.charAt(0),
        'minute-2': minute.charAt(1),
        'second-1': second.charAt(0),
        'second-2': second.charAt(1),
        'countdown': countdownSeconds >= 0 ? countdownSeconds : ''
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    if (countdownSeconds >= 0) {
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
        debug('到達觸發時間，開始啟動倒數');
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
        debug(new Date().toLocaleTimeString() + '：執行關機指令！');
        Neutralino.os.execCommand('shutdown /s /t 0');
    }, 60500);  // 60.5 秒
    countdownSeconds = 60;

    showTime();
    restoreWindow();
}


// ===== 顯示視窗 =====
// (舊的 show() 已整合進 restoreWindow)

/** 顯示視窗 (保持相容性) */
async function show() {
    return await restoreWindow();
}


// ===== 按鈕功能 =====

/** 隱藏 5 秒鐘 */
function minimize() {
    debug('使用者點擊隱藏 5 秒');
    Neutralino.window.hide();
    setTimeout(() => {
        restoreWindow();
    }, 5000);
}

/** 延遲 10 分鐘 */
function delay() {
    debug('使用者點擊延遲 10 分鐘');
    Neutralino.window.hide();
    setTimeout(() => {
        startCountdown();
    }, 600000);
    if (countdownTimeoutId) {
        clearTimeout(countdownTimeoutId);
        countdownTimeoutId = undefined;
    }
}



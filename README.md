# Stop Wandering On Windows

在每日指定時間開始倒數 60 秒關機。

## 使用說明

於 exe 檔同目錄下放置 `stop-wandering-on-windows-settings.ini` 檔，`time` 的值設為要觸發的時間（24 小時制）。


## Build from source code

``` sh
npm install -g @neutralinojs/neu
neu update
neu run  # 啟動 dev server
neu build --embed-resources  # 打包為 portable exe
```

## 第三方套件與資源
- Framework: [Neutralinojs](https://neutralino.js.org/)
- Icon: 素材取自 [Icons8](https://icons8.com/) 的 [Windows 10](https://icons8.com/icon/108792/windows-10) 和 [Minus](https://icons8.com/icon/WoRS7aKQWjbH/minus)、使用 [Photopea](https://www.photopea.com/) 調整

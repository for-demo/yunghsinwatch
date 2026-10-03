# 動畫套件

本機資源由頁面直接引用，無執行時 CDN 或 npm 依賴。原始發行檔不手動修改。

| 套件 | 版本 | 本機檔案 | 來源與授權 |
| --- | --- | --- | --- |
| Lenis | 1.3.19 | `lenis/lenis.min.js`、`lenis/lenis.css` | [官方專案](https://github.com/darkroomengineering/lenis)，MIT，完整授權在 `lenis/LICENSE` |
| GSAP | 3.14.2 | `gsap/gsap.min.js`、`gsap/ScrollTrigger.min.js`、`gsap/CustomEase.min.js` | [官方專案](https://github.com/greensock/GSAP)，[GSAP Standard License](https://gsap.com/standard-license)，保留發行檔授權標頭及 `gsap/UPSTREAM-README.md` |

下載日期：2026-10-01。下載網址：

- `https://cdn.jsdelivr.net/npm/lenis@1.3.19/dist/lenis.min.js`
- `https://cdn.jsdelivr.net/npm/lenis@1.3.19/dist/lenis.css`
- `https://cdn.jsdelivr.net/npm/lenis@1.3.19/LICENSE`
- `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js`
- `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/ScrollTrigger.min.js`
- `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/CustomEase.min.js`
- `https://cdn.jsdelivr.net/npm/gsap@3.14.2/README.md`

這些網址只用於取得檔案，不會出現在頁面的 script 或 stylesheet 引用。
更新時先確認官方版本與授權，下載固定版本的上述檔案並一起更新版本記錄；
GSAP core 與兩個 plugin 必須使用相同版本。保留原始授權標頭，重新執行
`npm run format:check`、`npm run check`，並用 `file://` 驗證完整輸出。

載入順序：Lenis → GSAP → ScrollTrigger → CustomEase → builder 注入的頁面 JS。
只用 GSAP ticker 驅動 Lenis，不額外啟動 RAF。減少動態效果時停用平滑捲動與進場動畫。

# pg-mazeglow

街機風**迴廊拾光**：迷宮裡撿光點、躲开（或反制）追逐者。純前端，無建置步驟。

名稱、迷宮與角色為原創小品，致敬「迷宮拾取＋追逐」玩法類型，非任一商業作品復刻。

也可當作 [Playgrounds（遊樂場）](https://samkuo.me/playgrounds/) 的 **SAM**（`index.html` 入口）。覺得關卡或 AI 不夠完美？開進來玩，再叫 AI 幫你改一版。

## 一鍵開 SAM 小

**[一鍵開 SAM 小](https://samkuo.me/playgrounds/?open=sampot%2Fpg-mazeglow&name=%E8%BF%B4%E5%BB%8A%E6%8B%BE%E5%85%89)**

```
https://samkuo.me/playgrounds/?open=sampot/pg-mazeglow&name=迴廊拾光
```

同源會重用本機已匯入的沙盒；要強制新建可加 `&fresh=1`。

## 試玩（本機）

```bash
npx --yes serve .
# 或
python3 -m http.server 8080
```

點一下頁面後音效才會出聲。

## 操作

| 操作 | 說明 |
| --- | --- |
| ← → ↑ ↓／WASD | 移動 |
| 觸控滑動 | 指定方向 |
| 出發 | 開始／下一關／再來一局 |
| 大光點 | 短暫讓追逐者被反制 |
| 音效開／關 | 靜音 |
| 重來 | 分數與關卡歸零 |

## 檔案

| 檔案 | 說明 |
| --- | --- |
| `index.html` | 結構 |
| `styles.css` | 亮／暗色主題 |
| `app.js` | Canvas 繪製與輸入 |
| `game.js` | 迷宮、碰撞、關卡 |
| `audio.js` | Web Audio 合成音效 |
| `functions.js` | Playgrounds 可選 stub |

## License

MIT

# 電卓アプリ

シンプルで美しい電卓アプリケーションです。

## 機能

- 基本的な四則演算（加算、減算、乗算、除算）
- クリア機能（AC）
- 削除機能（DEL）
- キーボードサポート
- レスポンシブデザイン
- 美しいグラデーションUI

## 使用方法

### インストール
```bash
cd calculator-app
npm install
```

### 開発サーバーの起動
```bash
npm run dev
```

### 本番ビルド
```bash
npm run build
```

## キーボードショートカット

- `0-9`: 数字入力
- `+`, `-`, `*`, `/`: 演算子
- `Enter` または `=`: 計算実行
- `Backspace`: 1文字削除
- `Escape`: 全クリア

## 技術スタック

- HTML5
- CSS3 (Grid, Flexbox, グラデーション)
- Vanilla JavaScript (ES6+)
- Live Server (開発用)

## プロジェクト構造

```
calculator-app/
├── public/
│   └── index.html
├── src/
│   └── calculator.js
├── styles/
│   └── calculator.css
├── package.json
└── README.md
```

## ライセンス

MIT License 
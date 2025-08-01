# Cursor Git Project

このプロジェクトは、Cursor IDEとGitHubの連携をテストするためのプロジェクトです。

## 機能
- MCP（Model Context Protocol）によるGitHub連携
- 自動化されたGit操作
- AI支援によるコード開発
- 美しい電卓アプリケーション

## プロジェクト構造

```
cursor_git/
├── .git/                          # Gitリポジトリ
├── .gitignore                     # Git除外設定
├── README.md                      # プロジェクト説明
├── mcp-config.json               # MCP設定ファイル
└── calculator-app/                # 電卓アプリケーション
    ├── package.json              # 依存関係設定
    ├── package-lock.json         # 依存関係ロックファイル
    ├── README.md                 # 電卓アプリ説明
    ├── public/                   # 公開ファイル
    │   └── index.html           # メインHTMLファイル
    ├── src/                      # ソースコード
    │   └── calculator.js        # JavaScriptロジック
    └── styles/                   # スタイルシート
        └── calculator.css       # CSSスタイル
```

## セットアップ
1. GitHub CLIの認証
2. MCPサーバーの設定
3. 環境変数の設定

## 使用方法

### プロジェクト全体
```bash
# リポジトリのクローン
git clone https://github.com/youki-dmp/250801_cursor.git

# プロジェクトディレクトリに移動
cd 250801_cursor
```

### 電卓アプリの実行
```bash
# 電卓アプリディレクトリに移動
cd calculator-app

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### MCP連携の確認
```bash
# プロジェクトルートで
git status
git log --oneline
``` 
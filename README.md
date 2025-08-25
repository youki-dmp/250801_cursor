# Cursor Git Project

このプロジェクトは、Cursor IDEとGitHubの連携をテストするためのプロジェクトです。

## 機能
- MCP（Model Context Protocol）によるGitHub連携
- 自動化されたGit操作
- AI支援によるコード開発
- 美しい電卓アプリケーション
- ToDoリストアプリケーション
- **NEW!** AIと開発した2Dランナーゲーム

## 公開ページ
- **ランナーゲーム (Ver 0.3):** [こちらでプレイできます](./docs/runner-game-v0.3/index.html)
- **AI画像ギャラリー:** [https://youki-dmp.github.io/250801_cursor/image-gallery/index.html](https://youki-dmp.github.io/250801_cursor/image-gallery/index.html)
- **電卓アプリ:** [https://youki-dmp.github.io/250801_cursor/index.html](https://youki-dmp.github.io/250801_cursor/index.html)
- **ToDoアプリ:** [https://youki-dmp.github.io/250801_cursor/todo-docs/index.html](https://youki-dmp.github.io/250801_cursor/todo-docs/index.html)

## プロジェクト構造

```
cursor_git/
├── .git/                          # Gitリポジトリ
├── .gitignore                     # Git除外設定
├── README.md                      # プロジェクト説明
├── REPLICATION_PROMPT.md          # AIによるゲーム開発再現プロンプト
├── mcp-config.json                # MCP設定ファイル
├── runner-game/                   # ランナーゲーム（開発用）
│   ├── ...
├── calculator-app/                # 電卓アプリケーション（開発用）
│   ├── ...
├── todo-list-app/                 # ToDoリストアプリケーション（開発用）
│   ├── ...
└── docs/                          # 公開用ファイル
    ├── runner-game-v0.3/          # ランナーゲーム v0.3
    │   ├── index.html
    │   ├── style.css
    │   └── game.js
    ├── image-gallery/             # AI画像ギャラリー
    │   ├── ...
    ├── index.html                 # 電卓アプリのHTML
    ├── ...
    └── todo-docs/                 # ToDoアプリ
        ├── ...
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

### 開発サーバーの起動
各アプリケーションをローカルで開発・確認する場合は、それぞれのディレクトリに移動して実行してください。

#### 電卓アプリ
```bash
# 電卓アプリディレクトリに移動
cd calculator-app

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

#### ToDoアプリ
（ToDoアプリ用のnpmスクリプトがpackage.jsonに定義されている場合）
```bash
# ToDoアプリディレクトリに移動
cd todo-list-app

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

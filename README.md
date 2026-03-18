# MD Editor

**Machst Du Editor** — A lightweight dual-pane Markdown editor optimized for reviewing and editing AI-generated text.

[日本語](#日本語) | [繁體中文](#繁體中文) | [简体中文](#简体中文) | [한국어](#한국어)

## Features

- **Dual-pane editing** — Source (CodeMirror 6) on the left, WYSIWYG (TipTap) on the right
- **Bidirectional sync** — Edit in either pane; the focused pane is the master
- **Multi-tab support** — Each tab holds an independent document
- **Search & Replace** — Regex support, case sensitivity toggle, match count
- **Table insertion** — LibreOffice-style grid picker with row/column operations
- **Word-compatible shortcuts** — Ctrl+B, Ctrl+I, Ctrl+K, Alt+1/2/3, and more
- **i18n** — English, Japanese, Traditional Chinese, Simplified Chinese, Korean
- **File operations** — Open, Save, Save As (UTF-8 only), recent file history

## Tech Stack

- **Framework**: Tauri 2 (Win64 primary)
- **Source editor**: CodeMirror 6
- **WYSIWYG editor**: TipTap (ProseMirror)
- **Language**: TypeScript
- **Build**: Vite

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+1` / `Ctrl+2` | Focus Source / WYSIWYG pane |
| `Ctrl+Tab` | Next tab |
| `Ctrl+N` / `Ctrl+W` | New / Close tab |
| `Ctrl+O` / `Ctrl+S` | Open / Save |
| `Ctrl+F` | Find & Replace |
| `Ctrl+B` / `Ctrl+I` | Bold / Italic |
| `Ctrl+K` | Insert link |
| `Alt+1/2/3/4` | Heading 1–4 |
| `Ctrl+/` | Shortcut help |

## Build

```bash
npm install
npm run tauri build
```

## License

MIT License

---

## 日本語

**Machst Du Editor** — AI生成テキストの確認・編集に最適化した、軽量デュアルペインMarkdownエディタ。

### 機能

- **デュアルペイン編集** — 左にソース（CodeMirror 6）、右にWYSIWYG（TipTap）
- **双方向同期** — どちらのペインからでも編集可能。フォーカスのあるペインがマスター
- **マルチタブ** — 各タブが独立したドキュメントを保持
- **検索・置換** — 正規表現、大文字小文字区別、マッチ件数表示
- **テーブル挿入** — LibreOffice風グリッドピッカー、行列の追加・削除
- **Word互換ショートカット** — Ctrl+B、Ctrl+I、Ctrl+K、Alt+1/2/3 など
- **多言語対応** — 英語、日本語、繁体中国語、簡体中国語、韓国語
- **ファイル操作** — 開く、保存、名前を付けて保存（UTF-8専用）、最近使ったファイル

### ビルド

```bash
npm install
npm run tauri build
```

### ライセンス

MIT License

---

## 繁體中文

**Machst Du Editor** — 針對 AI 生成文字審閱與編輯最佳化的輕量雙窗格 Markdown 編輯器。

### 功能

- **雙窗格編輯** — 左側原始碼（CodeMirror 6），右側所見即所得（TipTap）
- **雙向同步** — 可在任一窗格編輯，取得焦點的窗格為主窗格
- **多分頁** — 每個分頁持有獨立文件
- **尋找與取代** — 支援正規表示式、區分大小寫、顯示符合數
- **表格插入** — LibreOffice 風格網格選取器，可新增/刪除欄列
- **Word 相容快捷鍵** — Ctrl+B、Ctrl+I、Ctrl+K、Alt+1/2/3 等
- **多語言** — 英語、日語、繁體中文、簡體中文、韓語
- **檔案操作** — 開啟、儲存、另存新檔（僅 UTF-8）、最近使用的檔案

### 建置

```bash
npm install
npm run tauri build
```

### 授權

MIT License

---

## 简体中文

**Machst Du Editor** — 专为审阅与编辑 AI 生成文本优化的轻量双窗格 Markdown 编辑器。

### 功能

- **双窗格编辑** — 左侧源码（CodeMirror 6），右侧所见即所得（TipTap）
- **双向同步** — 可在任一窗格编辑，获得焦点的窗格为主窗格
- **多标签页** — 每个标签页持有独立文档
- **查找与替换** — 支持正则表达式、区分大小写、显示匹配数
- **表格插入** — LibreOffice 风格网格选取器，可添加/删除行列
- **Word 兼容快捷键** — Ctrl+B、Ctrl+I、Ctrl+K、Alt+1/2/3 等
- **多语言** — 英语、日语、繁体中文、简体中文、韩语
- **文件操作** — 打开、保存、另存为（仅 UTF-8）、最近使用的文件

### 构建

```bash
npm install
npm run tauri build
```

### 许可证

MIT License

---

## 한국어

**Machst Du Editor** — AI 생성 텍스트 검토 및 편집에 최적화된 경량 듀얼 패널 Markdown 편집기.

### 기능

- **듀얼 패널 편집** — 왼쪽 소스(CodeMirror 6), 오른쪽 위지위그(TipTap)
- **양방향 동기화** — 어느 패널에서든 편집 가능. 포커스된 패널이 마스터
- **멀티 탭** — 각 탭이 독립된 문서를 보유
- **찾기 및 바꾸기** — 정규식, 대소문자 구분, 일치 건수 표시
- **표 삽입** — LibreOffice 스타일 그리드 선택기, 행/열 추가·삭제
- **Word 호환 단축키** — Ctrl+B, Ctrl+I, Ctrl+K, Alt+1/2/3 등
- **다국어** — 영어, 일본어, 번체 중국어, 간체 중국어, 한국어
- **파일 작업** — 열기, 저장, 다른 이름으로 저장(UTF-8 전용), 최근 파일

### 빌드

```bash
npm install
npm run tauri build
```

### 라이선스

MIT License

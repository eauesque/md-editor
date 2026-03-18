import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { highlightSelectionMatches } from "@codemirror/search";
import { oneDark } from "@codemirror/theme-one-dark";

export type SourceChangeCallback = (content: string) => void;

let view: EditorView | null = null;
let changeCallback: SourceChangeCallback | null = null;
let suppressUpdates = false;

export function createSourceEditor(
  container: HTMLElement,
  initialContent: string,
  onChange: SourceChangeCallback
): EditorView {
  changeCallback = onChange;

  const state = EditorState.create({
    doc: initialContent,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      highlightSelectionMatches(),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      oneDark,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !suppressUpdates) {
          changeCallback?.(update.state.doc.toString());
        }
      }),
      EditorView.lineWrapping,
    ],
  });

  view = new EditorView({ state, parent: container });
  return view;
}

export function setSourceContent(content: string) {
  if (!view) return;
  suppressUpdates = true;
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: content,
    },
  });
  suppressUpdates = false;
}

export function getSourceContent(): string {
  return view?.state.doc.toString() || "";
}

export function getSourceCursorInfo(): { line: number; col: number } {
  if (!view) return { line: 1, col: 1 };
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  return { line: line.number, col: pos - line.from + 1 };
}

export function focusSource() {
  view?.focus();
}

export function getSourceView(): EditorView | null {
  return view;
}

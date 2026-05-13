/** @format */

"use client";

import TextareaCodeEditor from "@uiw/react-textarea-code-editor";

interface CodeEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ id, value, onChange }: CodeEditorProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-2 shadow-soft">
      <TextareaCodeEditor
        id={id}
        value={value}
        language="js"
        placeholder="Enter your JavaScript solution here..."
        onChange={(event) => onChange(event.target.value)}
        padding={18}
        style={{
          fontSize: 14,
          backgroundColor: "#020617",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          minHeight: 360,
          borderRadius: 24,
          color: "#e2e8f0",
        }}
      />
    </div>
  );
}

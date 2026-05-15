import { useRef, useImperativeHandle, forwardRef } from 'react';

export interface CodeEditorHandle {
  shake: () => void;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(({ value, onChange }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    shake() {
      const el = textareaRef.current;
      if (!el) return;
      el.classList.remove('shake');
      void el.offsetHeight;
      el.classList.add('shake');
      el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
    },
  }));

  return (
    <div className="card">
      <p className="card-label">Wklej kod do analizy</p>
      <textarea
        ref={textareaRef}
        className="code-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="// Wklej tutaj swój kod TypeScript lub JavaScript..."
        spellCheck={false}
      />
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';

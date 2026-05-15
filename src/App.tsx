import { useRef, useState } from 'react';
import { analyzeCode, type AgentResult } from './api/agent';
import { FloatingOrbs } from './components/FloatingOrbs';
import { FloatingParticles } from './components/FloatingParticles';
import { Header } from './components/Header';
import { CodeEditor, type CodeEditorHandle } from './components/CodeEditor';
import { Loader } from './components/Loader';
import { ScoreDisplay } from './components/ScoreDisplay';
import { IssuesList } from './components/IssuesList';
import { SuggestionBox } from './components/SuggestionBox';

type UiState = 'idle' | 'loading' | 'results' | 'error';

export default function App() {
  const [code, setCode]       = useState('');
  const [uiState, setUiState] = useState<UiState>('idle');
  const [result, setResult]   = useState<AgentResult | null>(null);
  const [error, setError]     = useState('');
  const editorRef = useRef<CodeEditorHandle>(null);

  async function handleAnalyze() {
    if (!code.trim()) {
      editorRef.current?.shake();
      return;
    }
    setUiState('loading');
    setError('');
    try {
      const data = await analyzeCode(code);
      setResult(data);
      setUiState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd połączenia z serwerem');
      setUiState('error');
    }
  }

  return (
    <>
      <FloatingOrbs />
      <FloatingParticles />

      <div className="container">
        <Header />

        <CodeEditor ref={editorRef} value={code} onChange={setCode} />

        {uiState === 'error' && (
          <div className="error-box">⚠ {error}</div>
        )}

        <div className="btn-wrap">
          <button
            className="btn-analyze"
            onClick={handleAnalyze}
            disabled={uiState === 'loading'}
          >
            ⚡ Analizuj kod
          </button>
        </div>

        {uiState === 'loading' && <Loader />}

        {uiState === 'results' && result && (
          <>
            <ScoreDisplay score={result.score} grade={result.grade} />
            <IssuesList issues={result.issues} />
            <SuggestionBox text={result.suggestion} />
          </>
        )}
      </div>
    </>
  );
}

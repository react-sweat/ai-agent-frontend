const GRADE_COLORS: Record<string, string> = {
  A: '#ffdd55',
  B: '#ffaa00',
  C: '#ff8800',
  D: '#ff5500',
  F: '#ff2233',
};

const GRADE_LABELS: Record<string, string> = {
  A: 'Wyśmienity kod!',
  B: 'Dobra robota',
  C: 'Przeciętny poziom',
  D: 'Wymaga uwagi',
  F: 'Krytyczne błędy',
};

interface Props {
  score: number;
  grade: string;
}

export function ScoreDisplay({ score, grade }: Props) {
  const color = GRADE_COLORS[grade] ?? '#ff2233';
  const pct   = Math.min(100, Math.max(0, score));
  const deg   = (pct / 100) * 360;

  return (
    <div className="card">
      <p className="section-title">Wynik analizy</p>
      <div className="score-row">

        <div className="score-circle-wrap">
          <div
            className="score-ring"
            style={{
              background: `conic-gradient(${color} ${deg}deg, rgba(255,255,255,0.06) ${deg}deg)`,
              borderRadius: '50%',
            }}
          />
          <div className="score-ring-inner">
            <span className="score-num" style={{ color, textShadow: `0 0 18px ${color}88` }}>
              {score}
            </span>
            <span className="score-100">/ 100</span>
          </div>
        </div>

        <div
          className="grade-badge"
          style={{
            color,
            borderColor: color,
            boxShadow: `0 0 24px ${color}55`,
            background: `${color}11`,
            textShadow: `0 0 12px ${color}`,
          }}
        >
          {grade}
        </div>

        <div className="score-info">
          <p className="score-label">{GRADE_LABELS[grade] ?? 'Analiza gotowa'}</p>
          <div className="score-bar-track">
            <div
              className="score-bar-fill"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, var(--red), ${color})`,
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

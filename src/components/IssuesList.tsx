const COLORS = ['#ff4422', '#ff7700', '#ffaa00', '#ff5500', '#ffdd55'];

interface Props {
  issues: string[];
}

export function IssuesList({ issues }: Props) {
  return (
    <div className="card">
      <p className="section-title">Wykryte problemy</p>
      {issues.length === 0 ? (
        <p className="no-issues">✓ Brak wykrytych problemów</p>
      ) : (
        <ul className="issues-list">
          {issues.map((issue, i) => {
            const color = COLORS[i % COLORS.length];
            return (
              <li
                key={i}
                className="issue-item"
                style={{ borderLeftColor: color, animationDelay: `${i * 0.07}s` }}
              >
                <span
                  className="issue-dot"
                  style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                />
                <span>{issue}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

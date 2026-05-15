interface Props {
  text: string;
}

export function SuggestionBox({ text }: Props) {
  return (
    <div className="card">
      <p className="section-title">Sugestia agenta</p>
      <div className="suggestion-box">
        <span className="suggestion-emoji">💡</span>
        <p>{text}</p>
      </div>
    </div>
  );
}

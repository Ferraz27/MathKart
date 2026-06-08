export default function HistoryTable({ history }) {
  return (
    <article className="panel">
      <h3>Historico de jogadas</h3>
      <div className="table-scroll">
        <table className="history-table">
          <thead>
            <tr>
              <th>Turno</th><th>Jogador</th><th>Pergunta</th><th>Resposta</th><th>Resultado</th><th>Posicao</th>
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map((row, i) => (
              <tr key={i} className={row.resultText === "Acerto" ? "row-ok" : "row-fail"}>
                <td>{row.turn}</td>
                <td>{row.playerName}</td>
                <td>{row.question}</td>
                <td>{row.answer}</td>
                <td>{row.resultText}</td>
                <td>{row.position}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

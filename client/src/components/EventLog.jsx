export default function EventLog({ events }) {
  return (
    <article className="panel">
      <h3>Eventos da corrida</h3>
      <ul className="event-list">
        {events.map((e, i) => <li key={i}>{e}</li>)}
      </ul>
    </article>
  );
}

const BEFORE = [
  'Post "LF2M ranked" in six servers',
  'Wait while the post scrolls away',
  'Half the replies are already in a game',
  'Find out their rank after you queue',
];
const AFTER = [
  'Everyone you see is online and looking',
  'Only countries and ranks you chose',
  'Both of you say yes before a chat opens',
  'Their Riot ID is in the chat, ready to add',
];

const STEPS = [
  { title: 'Set what you want', body: 'Competitive or Unrated, the countries you want to play with, a rank range, mic or no mic.' },
  { title: 'Swipe or open a lobby', body: 'Swipe through players for a duo, or post a lobby with the roles you are missing.' },
  { title: 'Match in real time', body: 'When you both say yes, a chat opens instantly. Lobby hosts accept players slot by slot.' },
  { title: 'Queue together', body: 'Add their Riot ID from the chat, send the party code, and play.' },
];

/** The problem (Discord-hopping) next to what Squad Up changes, then the four steps. */
export function SquadUpStory() {
  return (
    <>
      <section className="su-section su-compare" aria-labelledby="su-compare-title">
        <h2 id="su-compare-title">One page instead of six servers.</h2>
        <div className="su-compare-grid">
          <div>
            <h3>Finding players on Discord</h3>
            <ul>{BEFORE.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="su-compare-now">
            <h3>Finding players on Squad Up</h3>
            <ul>{AFTER.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      </section>
      <section className="su-section" id="how-it-works" aria-labelledby="su-how-title">
        <h2 id="su-how-title">How it works</h2>
        <ol className="su-steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="su-step-n" aria-hidden>{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

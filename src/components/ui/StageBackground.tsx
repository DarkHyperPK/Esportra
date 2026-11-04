import './stage-background.css';

/**
 * The Esportra stage ground: stage black with a hairline 96px grid, one cool light from
 * above, fine grain and a soft vignette (the same ground as the Scrims reel).
 * Purely decorative and fixed behind the page, so it never scrolls or takes input.
 */
export function StageBackground() {
  return (
    <div aria-hidden="true" className="stage-bg">
      <div className="stage-bg-grid" />
      <div className="stage-bg-light" />
      <div className="stage-bg-grain" />
      <div className="stage-bg-vignette" />
    </div>
  );
}

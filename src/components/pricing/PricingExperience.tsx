import { Link } from 'react-router-dom';
import { ArrowUpRight, Check } from 'lucide-react';
import PricingOverlayPreview from './PricingOverlayPreview';

const GAMES = [
  { name: 'Valorant', publisher: 'Riot Games', image: 'valorant', logo: 'valorant', className: 'pricing-game-valorant' },
  { name: 'Tekken 8', publisher: 'Bandai Namco Entertainment', image: 'tekken', logo: 'tekken8', className: 'pricing-game-tekken' },
  { name: 'PUBG: Battlegrounds', publisher: 'KRAFTON', image: 'pubg', logo: 'pubg', className: 'pricing-game-pubg' },
];

export default function PricingExperience() {
  return (
    <section id="experience" className="pricing-experience" aria-labelledby="experience-title">
      <p className="pricing-caption pricing-experience-caption">03 / Be part of the moment</p>
      <figure className="pricing-moment">
        <img className="pricing-moment-photo" src="/pricing/tournament-stem-list-unsplash.jpg" alt="A community gathered around a tournament match" width={2000} height={1125} loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
        <div className="pricing-moment-shade" aria-hidden="true" />
        <div className="pricing-moment-topline"><span>THE GOOD PART.</span><span>YOUR PEOPLE. YOUR MATCH DAY.</span></div>
        <div className="pricing-moment-copy"><h2 id="experience-title">Enjoy the final.<br />You hosted it.</h2><p>You brought everyone together.<br />Make room to enjoy it with them.</p></div>
        <figcaption><a href="https://unsplash.com/photos/EVgsAbL51Rk" target="_blank" rel="noreferrer">Photo: Stem List / Unsplash</a></figcaption>
      </figure>
      <div className="pricing-game-gallery">
        {GAMES.map(game => (
          <figure className={`pricing-game-window ${game.className}`} key={game.name}>
            <Link className="pricing-game-link" to={`/tournaments?game=${game.logo}`} aria-label={`Browse ${game.name} tournaments`}>
            <img className="pricing-game-art" src={`/pricing/${game.image}-art.jpg`} alt="" loading="lazy" decoding="async" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
            <div className="pricing-game-shade" aria-hidden="true" />
            </Link>
            <figcaption><img src={`/games/${game.logo}-logo.png`} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} /><span>{game.name}<small>Artwork: {game.publisher}</small></span><ArrowUpRight className="pricing-game-arrow" size={17} aria-hidden="true" /></figcaption>
          </figure>
        ))}
      </div>
      <div className="pricing-overlay-showcase">
        <p className="pricing-caption">Organizer Pro / A shared view of the moment</p>
        <div className="pricing-overlay-copy"><h3>Keep everyone<br />in the moment.</h3><div className="pricing-broadcast-details"><p>Make the pick-and-ban clear for players and viewers. A shared view of what’s happening means fewer questions about what comes next.</p><Link to="/contact">Plan my Pro event <ArrowUpRight size={16} aria-hidden="true" /></Link></div></div>
        <div className="pricing-broadcast-screen"><PricingOverlayPreview /></div>
        <ul className="pricing-broadcast-inclusions">{['Your own pick & ban sequence', 'Veto overlays for players and viewers', 'An OBS overlay for your stream'].map(text => <li key={text}><Check size={15} aria-hidden="true" />{text}</li>)}</ul>
      </div>
    </section>
  );
}

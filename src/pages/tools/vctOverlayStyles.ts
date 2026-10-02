/**
 * VCT-style skin for the broadcast overlay. It rides on BROADCAST_OVERLAY_CSS:
 * same layers, same paced timeline, restyled in the VCT broadcast idiom (ink
 * and cream, red / teal team colours, condensed type, angled corners, straight
 * stamps). Uses no Riot or VCT marks. Selectors start with .bcv-vct so they
 * outrank the base theme; motion stays !important for the same reason as there.
 */
export const VCT_INK = "#0f1923";
export const VCT_CREAM = "#ece8e1";
export const VCT_RED = "#ff4655";
export const VCT_TEAL = "#26d9c0";
export const VCT_DISPLAY_FONT = "'Anton', 'Bebas Neue', Impact, sans-serif";
export const VCT_LABEL_FONT = "'Barlow Condensed', 'Rajdhani', 'Arial Narrow', sans-serif";
export const VCT_FONTS_HREF = "https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;600;700&display=swap";

export const VCT_OVERLAY_CSS = `
/* Angled top-right corner on the art. */
.bcv-vct .vct-cut { clip-path: polygon(0 0, calc(100% - 1.6vw) 0, 100% 1.6vw, 100% 100%, 0 100%); }

/* Straight stamps: VCT graphics don't tilt. */
.bcv-vct .bcv-card, .bcv-vct .bcv-card.picked, .bcv-vct .bcv-card.decider { --tilt: 0deg; }

/* Name sits on the cream plate in ink. */
.bcv-vct .bcv-card .bcv-name { color: ${VCT_INK}; }
.bcv-vct .bcv-card.banned .bcv-name { color: rgba(15,25,35,.45); }
.bcv-vct .bcv-card .vct-plate { background-color: ${VCT_CREAM}; transition: background-color .6s cubic-bezier(.65,0,.35,1) !important; }
.bcv-vct .bcv-card.banned .vct-plate { background-color: #8e8a84; transition: background-color .7s cubic-bezier(.45,0,.55,1) 1.1s !important; }

/* No red wash on the decider here; it's framed in cream instead. */
.bcv-vct .bcv-card.decider .bcv-red { opacity: 0; }
.bcv-vct .bcv-card.picked .bcv-frame { stroke: var(--team); }
.bcv-vct .bcv-card.decider .bcv-frame { stroke: ${VCT_CREAM}; }

/* The record tag (team + verdict) rises out of the plate once the stamp lands. */
.bcv-vct .bcv-card .vct-tag { opacity: 0; transform: translateY(100%); transition: transform .4s cubic-bezier(.65,0,.35,1), opacity .3s ease !important; }
.bcv-vct .bcv-card.banned .vct-tag,
.bcv-vct .bcv-card.picked .vct-tag,
.bcv-vct .bcv-card.decider .vct-tag { opacity: 1; transform: none; }
.bcv-vct .bcv-card.banned .vct-tag { transition: transform .6s cubic-bezier(.2,.8,.2,1) 2.3s, opacity .3s ease 2.3s !important; }
.bcv-vct .bcv-card.picked .vct-tag { transition: transform .6s cubic-bezier(.2,.8,.2,1) 2.2s, opacity .3s ease 2.2s !important; }
.bcv-vct .bcv-card.decider .vct-tag { transition: transform .6s cubic-bezier(.2,.8,.2,1) 2.4s, opacity .3s ease 2.4s !important; }

/* Settled before playback: these rules outrank the base quiet rule, so restate it. */
.bcv-vct .bcv-card.bcv-quiet .vct-tag, .bcv-vct .bcv-card.bcv-quiet .vct-plate { transition: none !important; }
`;

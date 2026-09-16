import React, { useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/apiClient";
import type { AbilityCasts } from "@/types/scoreboardPlayer";
import type { EnrichedRiotMatchData } from "@/types/enrichedRiotMatch";
import { resolveEnrichedPlayer } from "@/types/enrichedRiotMatch";

type OverlayMode = "match" | "player" | "compare";
type OverlayTransition = "none" | "up" | "left" | "right";
type OverlayTheme = "tactical" | "premium" | "glitch";

type AgentAsset = {
  uuid: string;
  displayName?: string;
  displayIcon?: string;
  fullPortrait?: string;
  bustPortrait?: string;
  role?: {
    displayName?: string;
    displayIcon?: string;
  };
};

type MapAsset = {
  mapUrl?: string;
  displayName?: string;
  splash?: string;
  listViewIcon?: string;
};

type PlayerCardData = EnrichedRiotMatchData["players"][number] & {
  acs: number | null;
  kdRatio: number | null;
  kd: string;
  kda: string;
  adr: number | null;
  hsPct: number | null;
  firstBloods: number | null;
  abilityCasts?: AbilityCasts | null;
  agent?: AgentAsset;
};

type TeamPanel = {
  id: string;
  alias: string;
  logo: string;
  color: string;
  textColor: string;
  score: number;
  outcome: "WIN" | "LOSS";
  players: PlayerCardData[];
};

type OverlayOptions = {
  accentColor: string;
  bgDim: number;
  leftMode: string;
  mapNameOverride: string;
  mvpLabel: string;
  nameMode: "short" | "full";
  playerTitle: string;
  playerSubtitle: string;
  sponsorImage: string;
  sponsorLabel: string;
  sponsorSize: number;
  sponsorWidth: number;
  sponsorHeight: number;
  sponsorX: number;
  sponsorY: number;
  sponsorFit: "contain" | "cover";
  theme: OverlayTheme;
  transition: OverlayTransition;
  showAbilityCasts: boolean;
  showAcs: boolean;
  showAdr: boolean;
  showAgent: boolean;
  showAgents: boolean;
  showDelta: boolean;
  showFb: boolean;
  showHs: boolean;
  showKda: boolean;
  showKdRatio: boolean;
  showLogos: boolean;
  showMap: boolean;
  showMvpBadges: boolean;
  showPortraits: boolean;
  showRows: boolean;
  showTeam: boolean;
  showTeamContext: boolean;
  highlightLeader: boolean;
};

const STAGE_W = 1600;
const STAGE_H = 900;

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return response.json() as Promise<T>;
};

const useOverlayScale = () => {
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return scale;
};

const boolParam = (value: string | null, fallback: boolean) => {
  if (value === null) return fallback;
  return !["0", "false", "no", "off"].includes(value.toLowerCase());
};

const clampNumber = (value: string | null, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const safeColor = (value: string | null, fallback: string) =>
  value && /^#(?:[0-9a-f]{3}){1,2}$/i.test(value) ? value : fallback;

const textColorFor = (hex: string) => {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((char) => char + char).join("") : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#271044" : "#ffffff";
};

const shortName = (name: string, fallback: string) => {
  const clean = name.trim();
  if (!clean) return fallback;
  const initials = clean.split(/\s+/).map((part) => part[0]).join("").replace(/[^a-z0-9]/gi, "").toUpperCase();
  return (initials || clean.slice(0, 4).toUpperCase()).slice(0, 6);
};

const displayName = (name: string, fallback: string, mode: OverlayOptions["nameMode"]) =>
  mode === "full" ? (name.trim() || fallback) : shortName(name, fallback);

const themedPanelStyle = (panel: TeamPanel, theme: OverlayTheme, side: "left" | "right"): React.CSSProperties => {
  if (theme === "premium") {
    return {
      backgroundColor: "rgba(244,244,247,0.94)",
      color: "#180d35",
      borderColor: panel.color,
    };
  }

  if (theme === "glitch") {
    return {
      background: side === "left"
        ? `linear-gradient(100deg, ${panel.color} 0%, #351064 62%, #ff2bd6 130%)`
        : `linear-gradient(260deg, ${panel.color} 0%, #351064 62%, #ff2bd6 130%)`,
      color: "#ffffff",
      borderColor: "#ff2bd6",
    };
  }

  return {
    background: side === "left"
      ? `linear-gradient(105deg, ${panel.color} 0%, #11152b 112%)`
      : `linear-gradient(255deg, ${panel.color} 0%, #11152b 112%)`,
    color: panel.textColor,
    borderColor: "rgba(125,249,255,.28)",
  };
};

const overlayTransition = (value: string | null): OverlayTransition =>
  value === "up" || value === "left" || value === "right" ? value : "none";

const objectFitParam = (value: string | null): "contain" | "cover" =>
  value === "cover" ? "cover" : "contain";

const themeParam = (value: string | null): OverlayTheme =>
  value === "premium" || value === "glitch" ? value : "tactical";

const transitionAnimationName = (transition: OverlayTransition) => {
  if (transition === "up") return "riotOverlaySlideUp";
  if (transition === "left") return "riotOverlaySlideLeft";
  if (transition === "right") return "riotOverlaySlideRight";
  return "none";
};

const getModeFromPath = (pathname: string): OverlayMode => {
  if (pathname.endsWith("/player")) return "player";
  if (pathname.endsWith("/compare")) return "compare";
  return "match";
};

const teamScore = (match: EnrichedRiotMatchData, teamId?: string) =>
  match.teams.find((team) => team.teamId === teamId)?.roundsWon ?? 0;

const getTeamIds = (match: EnrichedRiotMatchData, leftMode: string) => {
  const winner = match.teams.find((team) => team.won)?.teamId || match.teams[0]?.teamId || "";
  const loser = match.teams.find((team) => team.teamId !== winner)?.teamId || match.teams[1]?.teamId || "";
  const blue = match.teams.find((team) => team.teamId.toLowerCase() === "blue")?.teamId;
  const red = match.teams.find((team) => team.teamId.toLowerCase() === "red")?.teamId;

  if (leftMode === "blue" && blue) return { left: blue, right: match.teams.find((team) => team.teamId !== blue)?.teamId || red || loser };
  if (leftMode === "red" && red) return { left: red, right: match.teams.find((team) => team.teamId !== red)?.teamId || blue || loser };
  if (leftMode === "loser") return { left: loser, right: winner };
  return { left: winner, right: loser };
};

const getTeamAlias = (player: PlayerCardData | null, left: TeamPanel, right: TeamPanel) => {
  if (!player) return "Unknown";
  return player.teamId === left.id ? left.alias : player.teamId === right.id ? right.alias : String(player.teamId || "Unknown");
};

const statAcs = (match: EnrichedRiotMatchData, player: EnrichedRiotMatchData["players"][number]) => {
  const enriched = resolveEnrichedPlayer(match, player.puuid);
  if (typeof enriched?.acs === "number") return Math.round(enriched.acs);
  return Math.round(player.stats.score / Math.max(1, player.stats.roundsPlayed ?? 1));
};

const statKdRatio = (player: EnrichedRiotMatchData["players"][number]) => {
  const deaths = player.stats.deaths ?? 0;
  if (deaths === 0) return player.stats.kills > 0 ? player.stats.kills : null;
  return Math.round((player.stats.kills / deaths) * 100) / 100;
};

const statKd = (player: EnrichedRiotMatchData["players"][number]) =>
  `${player.stats.kills}/${player.stats.deaths}`;

const statKda = (player: EnrichedRiotMatchData["players"][number]) =>
  `${player.stats.kills}/${player.stats.deaths}/${player.stats.assists}`;

const totalAbilityCasts = (casts?: AbilityCasts | null) => {
  if (!casts) return null;
  const total = (casts.grenadeCasts ?? 0) + (casts.ability1Casts ?? 0) + (casts.ability2Casts ?? 0) + (casts.ultimateCasts ?? 0);
  return total > 0 ? total : null;
};

const formatNumber = (value: number | null | undefined, digits = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return digits > 0 ? value.toFixed(digits) : String(Math.round(value));
};

const formatPercent = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value) ? "-" : `${Math.round(value)}%`;

const buildPlayer = (
  match: EnrichedRiotMatchData,
  player: EnrichedRiotMatchData["players"][number],
  agents: Record<string, AgentAsset>,
): PlayerCardData => {
  const enriched = resolveEnrichedPlayer(match, player.puuid);
  return {
    ...player,
    acs: statAcs(match, player),
    kdRatio: enriched?.kdRatio ?? statKdRatio(player),
    kd: statKd(player),
    kda: statKda(player),
    adr: enriched?.adr ?? null,
    hsPct: enriched?.hsPct ?? null,
    firstBloods: enriched?.firstBloods ?? null,
    abilityCasts: enriched?.abilityCasts ?? player.stats.abilityCasts ?? null,
    agent: player.characterId ? agents[String(player.characterId).toLowerCase()] : undefined,
  };
};

const buildAllPlayers = (match: EnrichedRiotMatchData, agents: Record<string, AgentAsset>) =>
  match.players
    .map((player) => buildPlayer(match, player, agents))
    .sort((a, b) => (b.acs ?? 0) - (a.acs ?? 0) || b.stats.kills - a.stats.kills);

const buildTeamPlayers = (match: EnrichedRiotMatchData, teamId: string, agents: Record<string, AgentAsset>) =>
  buildAllPlayers(match, agents).filter((player) => player.teamId === teamId);

const getMvp = (players: PlayerCardData[]) => players[0] ?? null;

const parseOptions = (params: URLSearchParams): OverlayOptions => {
  const statSet = params.get("statSet") || "advanced";
  const advanced = statSet !== "core";
  return {
    accentColor: safeColor(params.get("accentColor"), "#ef151c"),
    bgDim: clampNumber(params.get("bgDim"), 0.72, 0.35, 0.9),
    leftMode: params.get("leftSide") || "winner",
    mapNameOverride: params.get("mapName") || "",
    mvpLabel: params.get("mvpLabel") || "MVP",
    nameMode: params.get("nameMode") === "full" ? "full" : "short",
    playerTitle: params.get("title") || "Player Stats",
    playerSubtitle: params.get("subtitle") || "Match Performance",
    sponsorImage: params.get("sponsorImage") || "",
    sponsorLabel: params.get("sponsorLabel") || "SPONSOR",
    sponsorSize: clampNumber(params.get("sponsorSize"), 1, 0.45, 1.6),
    sponsorWidth: clampNumber(params.get("sponsorWidth"), 210, 40, 250),
    sponsorHeight: clampNumber(params.get("sponsorHeight"), 170, 40, 340),
    sponsorX: clampNumber(params.get("sponsorX"), 0, -125, 125),
    sponsorY: clampNumber(params.get("sponsorY"), 0, -170, 170),
    sponsorFit: objectFitParam(params.get("sponsorFit")),
    theme: themeParam(params.get("theme")),
    transition: overlayTransition(params.get("transition")),
    showAbilityCasts: boolParam(params.get("showAbilityCasts"), advanced),
    showAcs: boolParam(params.get("showAcs"), true),
    showAdr: boolParam(params.get("showAdr"), advanced),
    showAgent: boolParam(params.get("showAgent"), true),
    showAgents: boolParam(params.get("showAgents"), true),
    showDelta: boolParam(params.get("showDelta"), true),
    showFb: boolParam(params.get("showFb"), advanced),
    showHs: boolParam(params.get("showHs"), advanced),
    showKda: boolParam(params.get("showKda"), true),
    showKdRatio: boolParam(params.get("showKdRatio"), true),
    showLogos: boolParam(params.get("showLogos"), true),
    showMap: boolParam(params.get("showMap"), true),
    showMvpBadges: boolParam(params.get("showMvpBadges"), true),
    showPortraits: boolParam(params.get("showPortraits"), true),
    showRows: boolParam(params.get("showRows"), true),
    showTeam: boolParam(params.get("showTeam"), true),
    showTeamContext: boolParam(params.get("showTeamContext"), true),
    highlightLeader: boolParam(params.get("highlightLeader"), true),
  };
};

const TeamHeader = ({ panel, fallback, nameMode, side, theme }: { panel: TeamPanel; fallback: string; nameMode: OverlayOptions["nameMode"]; side: "left" | "right"; theme: OverlayTheme }) => (
  <div
    className={[
      "riot-team-header absolute top-[58px] h-[126px] w-[620px] overflow-hidden px-[56px] py-[20px]",
      side === "left" ? "riot-team-header-left left-[78px] text-left" : "riot-team-header-right right-[78px] text-right",
    ].join(" ")}
    style={themedPanelStyle(panel, theme, side)}
  >
    <div className={side === "left" ? "pr-[145px]" : "pl-[145px]"}>
      <div className="truncate text-[50px] font-black uppercase leading-none">
        {displayName(panel.alias, fallback, nameMode)}
      </div>
      <div className="mt-1 text-[25px] font-black uppercase opacity-80">{panel.outcome}</div>
    </div>
    <div className={["absolute top-[16px] text-[94px] font-black leading-none", side === "left" ? "right-[34px]" : "left-[34px]"].join(" ")}>
      {panel.score}
    </div>
  </div>
);

const AgentIcon = ({ agent }: { agent?: AgentAsset }) => (
  <div className="relative h-full bg-black/22">
    {agent?.displayIcon ? <img src={agent.displayIcon} className="h-full w-full object-cover" alt="" /> : null}
    {agent?.role?.displayIcon ? (
      <div className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center">
        <img
          src={agent.role.displayIcon}
          className="h-5 w-5 object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.85)]"
          style={{ filter: "brightness(0) invert(1)" }}
          alt=""
        />
      </div>
    ) : null}
  </div>
);

const RowStats = ({ player, align = "left" }: { player: PlayerCardData | null; align?: "left" | "right" }) => (
  <div className={`grid grid-cols-2 gap-x-3 gap-y-1 px-2 text-[15px] leading-none ${align === "right" ? "text-right" : "text-left"}`}>
    <div>{player?.kd || "-"}</div>
    <div>{formatNumber(player?.acs)}</div>
    <div>{formatPercent(player?.hsPct)}</div>
    <div>{formatNumber(player?.firstBloods)}</div>
  </div>
);

const playerNameSize = (name?: string) => {
  const length = (name || "").trim().length;
  if (length > 18) return 16;
  if (length > 15) return 18;
  if (length > 12) return 20;
  return 23;
};

const PlayerRow = ({ player, panel, side, theme }: { player: PlayerCardData | null; panel: TeamPanel; side: "left" | "right"; theme: OverlayTheme }) => {
  return (
    <div
      className={[
        "riot-player-row grid h-[68px] items-center overflow-hidden border-y border-black/60 font-black uppercase",
        side === "left" ? "grid-cols-[72px_minmax(0,1fr)_96px]" : "grid-cols-[96px_minmax(0,1fr)_72px]",
      ].join(" ")}
      style={themedPanelStyle(panel, theme, side)}
    >
      {side === "left" && <AgentIcon agent={player?.agent} />}
      {side === "right" && <RowStats player={player} />}
      <div className={side === "left" ? "px-4" : "px-4 text-right"}>
        <div className="whitespace-nowrap text-[11px] opacity-70">
          {player?.agent?.displayName || "Agent"}{player?.agent?.role?.displayName ? ` · ${player.agent.role.displayName}` : ""}
        </div>
        <div className="whitespace-nowrap leading-none" style={{ fontSize: playerNameSize(player?.gameName) }}>
          {player?.gameName || "TBD"}
        </div>
      </div>
      {side === "left" && <RowStats player={player} align="right" />}
      {side === "right" && <AgentIcon agent={player?.agent} />}
    </div>
  );
};

const MvpPanel = ({
  accentColor,
  panel,
  side,
  showBadge,
  showPortrait,
  label,
}: {
  accentColor: string;
  panel: TeamPanel;
  side: "left" | "right";
  showBadge: boolean;
  showPortrait: boolean;
  label: string;
}) => {
  const player = getMvp(panel.players);
  const portrait = player?.agent?.fullPortrait || player?.agent?.bustPortrait || player?.agent?.displayIcon;
  return (
    <div className={["riot-mvp-panel absolute top-[206px] w-[540px]", side === "left" ? "riot-mvp-left left-[78px] text-left" : "riot-mvp-right right-[78px] text-right"].join(" ")}>
      {showBadge ? (
        <div className="mb-[16px] inline-grid h-[70px] min-w-[168px] place-items-center px-8 text-[31px] font-black uppercase text-black" style={{ backgroundColor: accentColor }}>
          {label}
        </div>
      ) : null}
      <div className="relative h-[176px]">
        <div className={["absolute bottom-[8px] max-w-[300px]", side === "left" ? "left-0" : "right-0"].join(" ")}>
        <div className="riot-kicker text-[20px] font-black uppercase text-white/78">{player?.agent?.displayName || "Agent"}</div>
          <div className="max-w-full truncate text-[36px] font-black uppercase leading-none text-white">{player?.gameName || "TBD"}</div>
        </div>
        {showPortrait && portrait ? (
          <img
            src={portrait}
            className={["absolute bottom-[-2px] max-h-[252px] object-contain drop-shadow-[0_20px_26px_rgba(0,0,0,0.75)]", side === "left" ? "left-[300px]" : "right-[300px]"].join(" ")}
            alt=""
          />
        ) : null}
      </div>
    </div>
  );
};

const CenterStats = ({ left, right }: { left: PlayerCardData | null; right: PlayerCardData | null }) => (
  <div className="riot-center-stats absolute left-[640px] top-[238px] w-[320px] text-center">
    <div className="grid grid-cols-[1fr_62px_1fr] items-center gap-x-8 gap-y-3">
      <div className="text-right text-[34px] font-black">{left?.kd || "-"}</div>
      <div className="text-[12px] font-black uppercase tracking-widest text-white/58">K/D</div>
      <div className="text-left text-[34px] font-black">{right?.kd || "-"}</div>
      <div className="text-right text-[34px] font-black">{formatNumber(left?.acs)}</div>
      <div className="text-[12px] font-black uppercase tracking-widest text-white/58">ACS</div>
      <div className="text-left text-[34px] font-black">{formatNumber(right?.acs)}</div>
      <div className="text-right text-[34px] font-black">{formatPercent(left?.hsPct)}</div>
      <div className="text-[12px] font-black uppercase tracking-widest text-white/58">HS</div>
      <div className="text-left text-[34px] font-black">{formatPercent(right?.hsPct)}</div>
      <div className="text-right text-[34px] font-black">{formatNumber(left?.firstBloods)}</div>
      <div className="text-[12px] font-black uppercase tracking-widest text-white/58">FK</div>
      <div className="text-left text-[34px] font-black">{formatNumber(right?.firstBloods)}</div>
    </div>
  </div>
);

const MapCard = ({ mapAsset, mapName }: { mapAsset?: MapAsset; mapName: string }) => (
  <div className="riot-map-card absolute left-[78px] top-[510px] h-[340px] w-[250px] overflow-hidden bg-[#4b1a84]">
    {mapAsset?.splash ? <img src={mapAsset.splash} className="h-full w-full object-cover" alt="" /> : null}
    <div className="absolute inset-0 bg-black/8" />
    <div className="absolute bottom-[18px] left-0 right-0 text-center text-[34px] font-black uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
      {mapName}
    </div>
  </div>
);

const LogoPanel = ({ panel, side }: { panel: TeamPanel; side: "left" | "right" }) => (
  <div className={["riot-logo-panel absolute top-[510px] grid h-[340px] w-[250px] place-items-center overflow-hidden", side === "left" ? "left-[78px]" : "right-[78px]"].join(" ")} style={{ backgroundColor: panel.color, color: panel.textColor }}>
    {panel.logo ? <img src={panel.logo} className="max-h-[215px] max-w-[215px] object-contain" alt="" /> : <div className="max-w-[190px] truncate text-center text-[28px] font-black uppercase opacity-58">{panel.alias}</div>}
  </div>
);

const SponsorPanel = ({ image, label, panel, options }: { image: string; label: string; panel: TeamPanel; options: OverlayOptions }) => {
  if (!image) return null;
  const width = clampNumber(String(options.sponsorWidth || 210), 210, 40, 250);
  const height = clampNumber(String(options.sponsorHeight || 170), 170, 40, 340);
  const maxX = (250 - width) / 2;
  const maxY = (340 - height) / 2;
  const x = Math.min(maxX, Math.max(-maxX, options.sponsorX || 0));
  const y = Math.min(maxY, Math.max(-maxY, options.sponsorY || 0));

  return (
    <div
      className={[
        "absolute right-[78px] top-[510px] h-[340px] w-[250px] overflow-hidden",
        "bg-transparent",
      ].join(" ")}
      style={{ color: panel.textColor }}
    >
      <div
        className="absolute grid place-items-center"
        style={{
          left: `calc(50% + ${x}px)`,
          top: `calc(50% + ${y}px)`,
          width,
          height,
          transform: "translate(-50%, -50%)",
        }}
      >
        <img
          src={image}
          className="h-full w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.62)]"
          style={{ objectFit: options.sponsorFit }}
          loading="eager"
          alt={label}
        />
      </div>
    </div>
  );
};

const Rows = ({ panel, side, theme }: { panel: TeamPanel; side: "left" | "right"; theme: OverlayTheme }) => {
  const rows = panel.players.slice(0, 5);
  return (
  <div className={["riot-roster absolute top-[510px] w-[392px]", side === "left" ? "riot-roster-left left-[340px]" : "riot-roster-right right-[340px]"].join(" ")}>
      {Array.from({ length: 5 }).map((_, index) => (
        <PlayerRow key={rows[index]?.puuid || `${panel.id}-${index}`} player={rows[index] ?? null} panel={panel} side={side} theme={theme} />
      ))}
    </div>
  );
};

const CenterRowLabels = () => (
  <div className="riot-center-labels absolute left-[744px] top-[510px] w-[112px]">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="grid h-[68px] grid-cols-2 place-items-center border-y border-white/10 bg-black/28 px-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-white/72">
        <span>K/D</span>
        <span>ACS</span>
        <span>HS</span>
        <span>FK</span>
      </div>
    ))}
  </div>
);

const StatTile = ({ label, value, tone = "dark" }: { label: string; value: string; tone?: "dark" | "light" | "accent" }) => (
  <div className={["riot-stat-tile min-h-[94px] border px-5 py-4 backdrop-blur-sm", tone === "light" ? "border-white/20 bg-white/14 text-white" : tone === "accent" ? "border-white/36 bg-white/22 text-white" : "border-white/14 bg-black/55 text-white"].join(" ")}>
    <div className="text-[13px] font-black uppercase tracking-[0.18em] opacity-65">{label}</div>
    <div className="mt-2 truncate text-[40px] font-black uppercase leading-none" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.34)" }}>{value}</div>
  </div>
);

const MiniPlayerLine = ({ player, panel, side, light = false }: { player: PlayerCardData | null; panel: TeamPanel; side: "left" | "right"; light?: boolean }) => (
  <div
    className={[
      "grid h-[58px] items-center gap-3 overflow-hidden border-b font-black uppercase",
      side === "left" ? "grid-cols-[48px_minmax(0,1fr)_116px]" : "grid-cols-[116px_minmax(0,1fr)_48px]",
      light ? "border-[#21123f]/18 bg-white/88 text-[#170d32]" : "border-white/12 bg-black/32 text-white",
    ].join(" ")}
  >
    {side === "left" ? <AgentIcon agent={player?.agent} /> : <RowStats player={player} />}
    <div className={side === "left" ? "min-w-0" : "min-w-0 text-right"}>
      <div className="truncate text-[10px] tracking-[0.08em] opacity-62">
        {player?.agent?.displayName || "Agent"}{player?.agent?.role?.displayName ? ` - ${player.agent.role.displayName}` : ""}
      </div>
      <div className="truncate text-[22px] leading-none" style={{ color: light ? "#170d32" : panel.textColor }}>
        {player?.gameName || "TBD"}
      </div>
    </div>
    {side === "left" ? <RowStats player={player} align="right" /> : <AgentIcon agent={player?.agent} />}
  </div>
);

const FloatingSponsor = ({ image, label, options, className = "" }: { image: string; label: string; options: OverlayOptions; className?: string }) => {
  if (!image) return null;
  return (
    <div className={`absolute grid place-items-center ${className}`} style={{ width: options.sponsorWidth, height: options.sponsorHeight }}>
      <img src={image} className="h-full w-full drop-shadow-[0_12px_22px_rgba(0,0,0,.62)]" style={{ objectFit: options.sponsorFit }} alt={label} />
    </div>
  );
};

const PremiumScoreBlock = ({ panel, side }: { panel: TeamPanel; side: "left" | "right" }) => (
  <div className={["absolute top-[58px] w-[620px] border border-white/18 bg-white/90 px-9 py-7 text-[#170d32] shadow-[0_22px_46px_rgba(0,0,0,.22)]", side === "left" ? "left-[74px]" : "right-[74px] text-right"].join(" ")}>
    <div className="text-[18px] font-black uppercase tracking-[0.18em] opacity-62">{panel.outcome}</div>
    <div className="mt-1 grid grid-cols-[minmax(0,1fr)_130px] items-end gap-5">
      <div className="truncate text-[58px] font-black uppercase leading-none">{panel.alias}</div>
      <div className="text-[96px] font-black leading-[.78]">{panel.score}</div>
    </div>
  </div>
);

const PremiumMatchOverlay = ({ leftPanel, rightPanel, mapAsset, mapName, options }: { leftPanel: TeamPanel; rightPanel: TeamPanel; mapAsset?: MapAsset; mapName: string; options: OverlayOptions }) => {
  const leftMvp = getMvp(leftPanel.players);
  const rightMvp = getMvp(rightPanel.players);
  return (
    <>
      <div className="absolute left-[74px] right-[74px] top-[20px] flex items-center justify-center gap-5 text-[13px] font-black uppercase tracking-[0.24em] text-white/70">
        <span className="h-px w-[240px] bg-white/28" />
        <span>Match Statistics</span>
        <span className="text-white">{mapName}</span>
        <span className="h-px w-[240px] bg-white/28" />
      </div>
      <PremiumScoreBlock panel={leftPanel} side="left" />
      <PremiumScoreBlock panel={rightPanel} side="right" />
      <div className="absolute left-[100px] top-[230px] w-[575px]">
        <div className="mb-3 text-[14px] font-black uppercase tracking-[0.18em] text-white/60">{leftPanel.alias} Roster</div>
        {leftPanel.players.slice(0, 5).map((player) => <MiniPlayerLine key={player.puuid} player={player} panel={leftPanel} side="left" light />)}
      </div>
      <div className="absolute right-[100px] top-[230px] w-[575px]">
        <div className="mb-3 text-right text-[14px] font-black uppercase tracking-[0.18em] text-white/60">{rightPanel.alias} Roster</div>
        {rightPanel.players.slice(0, 5).map((player) => <MiniPlayerLine key={player.puuid} player={player} panel={rightPanel} side="right" light />)}
      </div>
      <div className="absolute left-[682px] top-[250px] h-[360px] w-[236px] overflow-hidden border border-white/18 bg-white/8">
        {options.showMap && mapAsset?.splash ? <img src={mapAsset.splash} className="h-full w-full object-cover" alt="" /> : null}
        <div className="absolute inset-0 bg-black/18" />
        <div className="absolute bottom-5 left-0 right-0 text-center text-[32px] font-black uppercase text-white drop-shadow-[0_4px_12px_rgba(0,0,0,.82)]">{mapName}</div>
      </div>
      <div className="absolute left-[610px] top-[640px] grid w-[380px] grid-cols-[1fr_88px_1fr] gap-y-2 text-center font-black uppercase text-white">
        <div className="text-right text-[32px]">{leftMvp?.kd || "-"}</div><div className="text-[12px] tracking-[0.18em] text-white/50">K/D</div><div className="text-left text-[32px]">{rightMvp?.kd || "-"}</div>
        <div className="text-right text-[32px]">{formatNumber(leftMvp?.acs)}</div><div className="text-[12px] tracking-[0.18em] text-white/50">ACS</div><div className="text-left text-[32px]">{formatNumber(rightMvp?.acs)}</div>
        <div className="text-right text-[32px]">{formatPercent(leftMvp?.hsPct)}</div><div className="text-[12px] tracking-[0.18em] text-white/50">HS</div><div className="text-left text-[32px]">{formatPercent(rightMvp?.hsPct)}</div>
      </div>
      <FloatingSponsor image={options.sponsorImage} label={options.sponsorLabel} options={options} className="right-[88px] bottom-[52px]" />
    </>
  );
};

const GlitchMatchOverlay = ({ leftPanel, rightPanel, mapAsset, mapName, options }: { leftPanel: TeamPanel; rightPanel: TeamPanel; mapAsset?: MapAsset; mapName: string; options: OverlayOptions }) => {
  const leftMvp = getMvp(leftPanel.players);
  const rightMvp = getMvp(rightPanel.players);
  return (
    <>
      <div className="absolute left-[60px] top-[42px] text-[28px] font-black uppercase tracking-[0.22em] text-fuchsia-200 drop-shadow-[3px_0_0_rgba(0,255,255,.34)]">Post Match</div>
      <div className="absolute right-[64px] top-[38px] text-right text-[74px] font-black uppercase leading-none text-white drop-shadow-[4px_0_0_rgba(255,43,214,.5)]">{mapName}</div>
      <div className="absolute left-[70px] top-[136px] h-[152px] w-[650px] -skew-x-6 border border-fuchsia-300/40 bg-[#16051f]/86 p-7 shadow-[7px_0_rgba(0,255,255,.18)]">
        <div className="skew-x-6 text-[18px] font-black uppercase tracking-[0.18em] text-fuchsia-100/70">{leftPanel.outcome}</div>
        <div className="skew-x-6 flex items-end justify-between"><span className="truncate text-[58px] font-black uppercase">{leftPanel.alias}</span><span className="text-[108px] font-black leading-[.78]">{leftPanel.score}</span></div>
      </div>
      <div className="absolute right-[70px] top-[156px] h-[152px] w-[650px] -skew-x-6 border border-fuchsia-300/40 bg-[#3d0c50]/86 p-7 text-right shadow-[-7px_0_rgba(255,43,214,.28)]">
        <div className="skew-x-6 text-[18px] font-black uppercase tracking-[0.18em] text-fuchsia-100/70">{rightPanel.outcome}</div>
        <div className="skew-x-6 flex flex-row-reverse items-end justify-between"><span className="truncate text-[58px] font-black uppercase">{rightPanel.alias}</span><span className="text-[108px] font-black leading-[.78]">{rightPanel.score}</span></div>
      </div>
      <div className="absolute left-[82px] top-[360px] w-[552px] -skew-x-3">
        {leftPanel.players.slice(0, 5).map((player, index) => <div key={player.puuid} style={{ marginLeft: index % 2 ? 28 : 0 }}><MiniPlayerLine player={player} panel={leftPanel} side="left" /></div>)}
      </div>
      <div className="absolute right-[82px] top-[372px] w-[552px] -skew-x-3">
        {rightPanel.players.slice(0, 5).map((player, index) => <div key={player.puuid} style={{ marginRight: index % 2 ? 28 : 0 }}><MiniPlayerLine player={player} panel={rightPanel} side="right" /></div>)}
      </div>
      <div className="absolute left-[656px] top-[338px] h-[310px] w-[288px] rotate-[-2deg] overflow-hidden border border-fuchsia-300/30 bg-black/30 shadow-[5px_0_rgba(0,255,255,.20)]">
        {options.showMap && mapAsset?.splash ? <img src={mapAsset.splash} className="h-full w-full object-cover opacity-80" alt="" /> : null}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,.08)_0_1px,transparent_1px_5px)]" />
      </div>
      <div className="absolute left-[620px] top-[676px] grid w-[360px] grid-cols-[1fr_78px_1fr] gap-y-1 text-center font-black uppercase">
        <div className="text-right text-[30px]">{leftMvp?.kd || "-"}</div><div className="text-[11px] tracking-[0.18em] text-fuchsia-100/62">K/D</div><div className="text-left text-[30px]">{rightMvp?.kd || "-"}</div>
        <div className="text-right text-[30px]">{formatNumber(leftMvp?.acs)}</div><div className="text-[11px] tracking-[0.18em] text-fuchsia-100/62">ACS</div><div className="text-left text-[30px]">{formatNumber(rightMvp?.acs)}</div>
      </div>
      <FloatingSponsor image={options.sponsorImage} label={options.sponsorLabel} options={options} className="right-[76px] bottom-[42px]" />
    </>
  );
};

const playerStatTiles = (player: PlayerCardData | null, options: OverlayOptions) => {
  if (!player) return [];
  return [
    options.showKda ? { label: "K/D/A", value: player.kda } : null,
    options.showAcs ? { label: "ACS", value: formatNumber(player.acs) } : null,
    options.showKdRatio ? { label: "K/D", value: formatNumber(player.kdRatio, 2) } : null,
    options.showAdr ? { label: "ADR", value: formatNumber(player.adr) } : null,
    options.showHs ? { label: "HS%", value: formatPercent(player.hsPct) } : null,
    options.showFb ? { label: "First Bloods", value: formatNumber(player.firstBloods) } : null,
    options.showAbilityCasts ? { label: "Ability Casts", value: formatNumber(totalAbilityCasts(player.abilityCasts)) } : null,
  ].filter((tile): tile is { label: string; value: string } => Boolean(tile));
};

const MatchOverlay = ({
  leftPanel,
  rightPanel,
  mapAsset,
  mapName,
  options,
}: {
  leftPanel: TeamPanel;
  rightPanel: TeamPanel;
  mapAsset?: MapAsset;
  mapName: string;
  options: OverlayOptions;
}) => {
  if (options.theme === "premium") return <PremiumMatchOverlay leftPanel={leftPanel} rightPanel={rightPanel} mapAsset={mapAsset} mapName={mapName} options={options} />;
  if (options.theme === "glitch") return <GlitchMatchOverlay leftPanel={leftPanel} rightPanel={rightPanel} mapAsset={mapAsset} mapName={mapName} options={options} />;
  return (
    <>
      <TeamHeader panel={leftPanel} fallback="TMA" nameMode="full" side="left" theme={options.theme} />
      <TeamHeader panel={rightPanel} fallback="TMB" nameMode="full" side="right" theme={options.theme} />
      <MvpPanel accentColor={options.accentColor} panel={leftPanel} side="left" showBadge={options.showMvpBadges} showPortrait={options.showPortraits} label={options.mvpLabel} />
      <MvpPanel accentColor={options.accentColor} panel={rightPanel} side="right" showBadge={options.showMvpBadges} showPortrait={options.showPortraits} label={options.mvpLabel} />
      <CenterStats left={getMvp(leftPanel.players)} right={getMvp(rightPanel.players)} />
      {options.showMap ? <MapCard mapAsset={mapAsset} mapName={mapName} /> : options.showLogos ? <LogoPanel panel={leftPanel} side="left" /> : null}
      {options.showLogos ? <SponsorPanel image={options.sponsorImage} label={options.sponsorLabel} panel={rightPanel} options={options} /> : null}
      {options.showRows ? (
        <>
          <Rows panel={leftPanel} side="left" theme={options.theme} />
          <CenterRowLabels />
          <Rows panel={rightPanel} side="right" theme={options.theme} />
        </>
      ) : null}
    </>
  );
};

const PlayerOverlay = ({
  player,
  leftPanel,
  rightPanel,
  mapAsset,
  mapName,
  options,
}: {
  player: PlayerCardData | null;
  leftPanel: TeamPanel;
  rightPanel: TeamPanel;
  mapAsset?: MapAsset;
  mapName: string;
  options: OverlayOptions;
}) => {
  const portrait = player?.agent?.fullPortrait || player?.agent?.bustPortrait || player?.agent?.displayIcon;
  const playerTeam = player?.teamId === leftPanel.id ? leftPanel : rightPanel;
  const tiles = playerStatTiles(player, options).slice(0, 7);

  if (options.theme === "premium") {
    return (
      <>
        <div className="absolute left-[70px] top-[44px] text-white">
          <div className="text-[17px] font-black uppercase tracking-[0.28em] text-white/58">{options.playerSubtitle}</div>
          <div className="mt-1 text-[76px] font-black uppercase leading-none">{options.playerTitle}</div>
        </div>
        <div className="absolute right-[78px] top-[58px] text-right text-white">
          <div className="text-[17px] font-black uppercase tracking-[0.18em] text-white/62">{options.showTeam ? getTeamAlias(player, leftPanel, rightPanel) : mapName}</div>
          <div className="text-[78px] font-black leading-none">{playerTeam.score}</div>
        </div>
        <div className="absolute left-[72px] top-[212px] h-[610px] w-[465px] overflow-hidden border border-white/18 bg-white/8">
          {options.showMap && mapAsset?.splash ? <img src={mapAsset.splash} className="absolute inset-0 h-full w-full object-cover opacity-34" alt="" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.06),rgba(199,84,214,.46))]" />
          {options.showAgent && portrait ? <img src={portrait} className="absolute bottom-[-18px] left-[-42px] h-[650px] w-[540px] object-contain drop-shadow-[0_26px_34px_rgba(0,0,0,.72)]" alt="" /> : null}
          <div className="absolute bottom-9 left-9 right-9">
            <div className="text-[23px] font-black uppercase tracking-[0.04em] text-white/72">{player?.agent?.displayName || "Agent"}</div>
            <div className="text-[54px] font-black uppercase leading-none text-white">{player?.gameName || "Unknown"}</div>
          </div>
        </div>
        <div className="absolute left-[585px] top-[230px] grid w-[610px] grid-cols-2 gap-5">
          {tiles.map((tile, index) => <StatTile key={tile.label} label={tile.label} value={tile.value} tone={index === 1 ? "light" : "dark"} />)}
        </div>
        <div className="absolute right-[78px] bottom-[70px] w-[288px] text-right font-black uppercase text-white">
          <div className="text-[14px] tracking-[0.22em] text-white/52">Map</div>
          <div className="mt-1 text-[44px] leading-none">{mapName}</div>
        </div>
      </>
    );
  }

  if (options.theme === "glitch") {
    return (
      <>
        <div className="absolute left-[58px] top-[40px] -skew-x-6 text-white">
          <div className="text-[18px] font-black uppercase tracking-[0.28em] text-fuchsia-200/70">{options.playerSubtitle}</div>
          <div className="text-[82px] font-black uppercase leading-none drop-shadow-[4px_0_0_rgba(255,43,214,.48)]">{options.playerTitle}</div>
        </div>
        <div className="absolute right-[68px] top-[68px] -skew-x-6 border border-fuchsia-300/34 bg-[#2c073b]/82 px-10 py-5 text-right font-black uppercase text-white shadow-[-6px_0_rgba(0,255,255,.18)]">
          <div className="text-[16px] tracking-[0.2em] text-fuchsia-100/66">{options.showTeam ? getTeamAlias(player, leftPanel, rightPanel) : mapName}</div>
          <div className="text-[76px] leading-none">{playerTeam.score}</div>
        </div>
        <div className="absolute left-[105px] top-[220px] h-[600px] w-[400px] rotate-[-2deg] overflow-visible">
          {options.showMap && mapAsset?.splash ? <img src={mapAsset.splash} className="absolute inset-0 h-full w-full object-cover opacity-28" alt="" /> : null}
          <div className="absolute inset-0 border border-fuchsia-300/30 bg-black/28 shadow-[5px_0_rgba(0,255,255,.20)]" />
          {options.showAgent && portrait ? <img src={portrait} className="absolute bottom-[-10px] left-[-86px] h-[640px] w-[560px] object-contain drop-shadow-[0_28px_34px_rgba(0,0,0,.78)]" alt="" /> : null}
          <div className="absolute bottom-7 left-7 right-7 font-black uppercase">
            <div className="text-[20px] text-fuchsia-100/72">{player?.agent?.displayName || "Agent"}</div>
            <div className="text-[48px] leading-none text-white">{player?.gameName || "Unknown"}</div>
          </div>
        </div>
        <div className="absolute left-[565px] top-[226px] grid w-[700px] grid-cols-2 gap-4 -skew-x-3">
          {tiles.map((tile, index) => <StatTile key={tile.label} label={tile.label} value={tile.value} tone={index % 2 ? "accent" : "dark"} />)}
        </div>
        <div className="absolute right-[74px] bottom-[62px] -skew-x-6 text-right font-black uppercase text-white">
          <div className="text-[15px] tracking-[0.22em] text-fuchsia-100/62">Map</div>
          <div className="text-[52px] leading-none drop-shadow-[3px_0_0_rgba(255,43,214,.42)]">{mapName}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="riot-player-title absolute left-[78px] right-[78px] top-[54px] flex items-start justify-between">
        <div>
          <div className="text-[18px] font-black uppercase tracking-[0.2em] text-white/70">{options.playerSubtitle}</div>
          <div className="mt-1 text-[66px] font-black uppercase leading-none text-white">{options.playerTitle}</div>
        </div>
      </div>
      <div className="riot-player-card absolute left-[92px] top-[230px] h-[560px] w-[430px] overflow-hidden bg-black/35">
        {options.showMap && mapAsset?.splash ? <img src={mapAsset.splash} className="absolute inset-0 h-full w-full object-cover opacity-28" alt="" /> : null}
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent, ${playerTeam.color} 105%)` }} />
        {options.showAgent && portrait ? <img src={portrait} className="absolute bottom-[-10px] left-[-35px] h-[590px] w-[510px] object-contain drop-shadow-[0_24px_28px_rgba(0,0,0,0.75)]" alt="" /> : null}
        <div className="absolute bottom-8 left-8 right-8">
          <div className="text-[22px] font-black uppercase text-white/70">{player?.agent?.displayName || "Agent"}</div>
          <div className="truncate text-[52px] font-black uppercase leading-none text-white">{player?.gameName || "Unknown"}</div>
        </div>
      </div>
      <div className="riot-player-stats-grid absolute left-[560px] top-[230px] w-[520px]">
        <div className="grid grid-cols-2 gap-4">
          {tiles.map((tile, index) => <StatTile key={tile.label} label={tile.label} value={tile.value} tone={index === 1 ? "accent" : "dark"} />)}
        </div>
      </div>
      <div className="riot-context-panel absolute right-[92px] top-[230px] h-[560px] w-[360px] bg-black/60 backdrop-blur-sm p-8">
        <div className="text-[14px] font-black uppercase tracking-[0.18em] text-white/55">Match Context</div>
        <div className="mt-6 space-y-4">
          {/* Map tile with actual image */}
          <div className="riot-stat-tile relative min-h-[140px] overflow-hidden border border-white/20 text-white">
            {mapAsset?.splash ? (
              <img src={mapAsset.splash} className="absolute inset-0 h-full w-full object-cover" alt="" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
            <div className="relative px-5 py-4">
              <div className="text-[13px] font-black uppercase tracking-[0.18em] opacity-65">Map</div>
              <div className="mt-2 truncate text-[40px] font-black uppercase leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">{mapName}</div>
            </div>
          </div>
          {/* Team tiles with logos */}
          <div className="riot-stat-tile min-h-[94px] border border-white/20 bg-black/55 backdrop-blur-sm px-5 py-4 text-white">
            <div className="text-[13px] font-black uppercase tracking-[0.18em] opacity-65">{leftPanel.alias}</div>
            <div className="mt-2 flex items-center gap-4">
              {leftPanel.logo ? (
                <img src={leftPanel.logo} className="h-[42px] w-[42px] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" alt="" />
              ) : (
                <div className="grid h-[42px] w-[42px] place-items-center rounded bg-white/10 border border-white/20 text-[18px] font-black uppercase text-white/80" style={{ backgroundColor: leftPanel.color }}>
                  {leftPanel.alias.slice(0, 2)}
                </div>
              )}
              <div className="text-[40px] font-black uppercase leading-none" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.34)" }}>{String(leftPanel.score)}</div>
            </div>
          </div>
          <div className="riot-stat-tile min-h-[94px] border border-white/20 bg-black/55 backdrop-blur-sm px-5 py-4 text-white">
            <div className="text-[13px] font-black uppercase tracking-[0.18em] opacity-65">{rightPanel.alias}</div>
            <div className="mt-2 flex items-center gap-4">
              {rightPanel.logo ? (
                <img src={rightPanel.logo} className="h-[42px] w-[42px] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" alt="" />
              ) : (
                <div className="grid h-[42px] w-[42px] place-items-center rounded bg-white/10 border border-white/20 text-[18px] font-black uppercase text-white/80" style={{ backgroundColor: rightPanel.color }}>
                  {rightPanel.alias.slice(0, 2)}
                </div>
              )}
              <div className="text-[40px] font-black uppercase leading-none" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.34)" }}>{String(rightPanel.score)}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const CompareStatRow = ({
  label,
  left,
  right,
  options,
}: {
  label: string;
  left: string;
  right: string;
  options: OverlayOptions;
}) => {
  const leftNum = Number(left.replace("%", ""));
  const rightNum = Number(right.replace("%", ""));
  const leftWins = options.highlightLeader && Number.isFinite(leftNum) && Number.isFinite(rightNum) && leftNum > rightNum;
  const rightWins = options.highlightLeader && Number.isFinite(leftNum) && Number.isFinite(rightNum) && rightNum > leftNum;
  const delta = Number.isFinite(leftNum) && Number.isFinite(rightNum) ? Math.abs(leftNum - rightNum) : null;
  return (
    <div className="grid grid-cols-[1fr_154px_1fr] items-center border-b border-white/10 py-2 text-white last:border-b-0">
      <div className={`text-right text-[28px] font-black leading-none ${leftWins ? "text-emerald-300" : ""}`}>{left}</div>
      <div className="text-center">
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/58">{label}</div>
        {options.showDelta && delta !== null ? <div className="mt-0.5 text-[10px] font-black uppercase text-white/40">Delta {formatNumber(delta, label === "K/D" ? 2 : 0)}</div> : null}
      </div>
      <div className={`text-left text-[28px] font-black leading-none ${rightWins ? "text-emerald-300" : ""}`}>{right}</div>
    </div>
  );
};

const ComparePlayerCard = ({
  player,
  panel,
  side,
  showAgents,
}: {
  player: PlayerCardData | null;
  panel: TeamPanel;
  side: "left" | "right";
  showAgents: boolean;
}) => {
  const portrait = player?.agent?.fullPortrait || player?.agent?.bustPortrait || player?.agent?.displayIcon;
  return (
    <div className={`riot-compare-card absolute top-[205px] h-[560px] w-[410px] overflow-visible text-white ${side === "left" ? "left-[84px]" : "right-[84px]"}`}>
      <div
        className={`absolute top-0 inline-flex min-w-[150px] items-end gap-4 border border-white/15 bg-black/28 px-5 py-3 backdrop-blur-[1px] ${side === "left" ? "left-0" : "right-0 flex-row-reverse"}`}
        style={{ borderColor: panel.color }}
      >
        <div className="text-[17px] font-black uppercase tracking-[0.1em] text-white/74">{panel.alias}</div>
        <div className="text-[48px] font-black leading-none" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.22)" }}>{panel.score}</div>
      </div>
      {showAgents && portrait ? (
        <img
          src={portrait}
          className={`absolute bottom-[54px] h-[430px] w-[360px] object-contain opacity-95 drop-shadow-[0_24px_28px_rgba(0,0,0,0.78)] ${side === "left" ? "left-[34px]" : "right-[34px]"}`}
          alt=""
        />
      ) : null}
      <div className={`absolute bottom-[22px] max-w-full ${side === "left" ? "left-0 text-left" : "right-0 text-right"}`}>
        <div className="text-[20px] font-black uppercase text-white/68">{player?.agent?.displayName || "Agent"}{player?.agent?.role?.displayName ? ` - ${player.agent.role.displayName}` : ""}</div>
        <div className="max-w-[390px] truncate text-[46px] font-black uppercase leading-none text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.7)]">{player?.gameName || "Unknown"}</div>
      </div>
    </div>
  );
};

const CompareOverlay = ({
  leftPlayer,
  rightPlayer,
  leftPanel,
  rightPanel,
  mapName,
  options,
}: {
  leftPlayer: PlayerCardData | null;
  rightPlayer: PlayerCardData | null;
  leftPanel: TeamPanel;
  rightPanel: TeamPanel;
  mapName: string;
  options: OverlayOptions;
}) => {
  const leftTeam = leftPlayer?.teamId === leftPanel.id ? leftPanel : rightPanel;
  const rightTeam = rightPlayer?.teamId === leftPanel.id ? leftPanel : rightPanel;
  const rows = [
    options.showKda ? ["K/D/A", leftPlayer?.kda || "-", rightPlayer?.kda || "-"] : null,
    options.showAcs ? ["ACS", formatNumber(leftPlayer?.acs), formatNumber(rightPlayer?.acs)] : null,
    options.showKdRatio ? ["K/D", formatNumber(leftPlayer?.kdRatio, 2), formatNumber(rightPlayer?.kdRatio, 2)] : null,
    options.showAdr ? ["ADR", formatNumber(leftPlayer?.adr), formatNumber(rightPlayer?.adr)] : null,
    options.showHs ? ["HS%", formatPercent(leftPlayer?.hsPct), formatPercent(rightPlayer?.hsPct)] : null,
    options.showFb ? ["First Bloods", formatNumber(leftPlayer?.firstBloods), formatNumber(rightPlayer?.firstBloods)] : null,
    options.showAbilityCasts ? ["Ability Casts", formatNumber(totalAbilityCasts(leftPlayer?.abilityCasts)), formatNumber(totalAbilityCasts(rightPlayer?.abilityCasts))] : null,
  ].filter((row): row is string[] => Boolean(row));
  const leftPortrait = leftPlayer?.agent?.fullPortrait || leftPlayer?.agent?.bustPortrait || leftPlayer?.agent?.displayIcon;
  const rightPortrait = rightPlayer?.agent?.fullPortrait || rightPlayer?.agent?.bustPortrait || rightPlayer?.agent?.displayIcon;

  if (options.theme === "premium") {
    return (
      <>
        <div className="absolute left-[78px] right-[78px] top-[42px] text-center font-black uppercase text-white">
          <div className="text-[16px] tracking-[0.28em] text-white/58">{mapName}</div>
          <div className="text-[76px] leading-none">Player Comparison</div>
        </div>
        <div className="absolute left-[88px] top-[218px] h-[560px] w-[420px] border border-white/16 bg-white/8 p-8 text-white">
          <div className="text-[16px] font-black uppercase tracking-[0.18em] text-white/60">{leftTeam.alias}</div>
          <div className="text-[62px] font-black leading-none">{leftTeam.score}</div>
          {options.showAgents && leftPortrait ? (
            <img src={leftPortrait} className="absolute bottom-[82px] left-[22px] h-[390px] w-[360px] object-contain drop-shadow-[0_22px_30px_rgba(0,0,0,.72)]" alt="" />
          ) : null}
          <div className="absolute bottom-8 left-8 right-8 font-black uppercase">
            <div className="text-[20px] text-white/62">{leftPlayer?.agent?.displayName || "Agent"}</div>
            <div className="text-[44px] leading-none">{leftPlayer?.gameName || "Unknown"}</div>
          </div>
        </div>
        <div className="absolute right-[88px] top-[218px] h-[560px] w-[420px] border border-white/16 bg-white/8 p-8 text-right text-white">
          <div className="text-[16px] font-black uppercase tracking-[0.18em] text-white/60">{rightTeam.alias}</div>
          <div className="text-[62px] font-black leading-none">{rightTeam.score}</div>
          {options.showAgents && rightPortrait ? (
            <img src={rightPortrait} className="absolute bottom-[82px] right-[22px] h-[390px] w-[360px] object-contain drop-shadow-[0_22px_30px_rgba(0,0,0,.72)]" alt="" />
          ) : null}
          <div className="absolute bottom-8 left-8 right-8 font-black uppercase">
            <div className="text-[20px] text-white/62">{rightPlayer?.agent?.displayName || "Agent"}</div>
            <div className="text-[44px] leading-none">{rightPlayer?.gameName || "Unknown"}</div>
          </div>
        </div>
        <div className="absolute left-[548px] top-[214px] w-[504px]">
          <div className="mb-5 grid place-items-center">
            <div className="border border-white/16 bg-white px-10 py-3 text-[44px] font-black leading-none text-[#170d32]">VS</div>
          </div>
          <div className="border-y border-white/18 bg-black/18 px-8 py-4">
            {rows.map(([label, left, right]) => <CompareStatRow key={label} label={label} left={left} right={right} options={options} />)}
          </div>
        </div>
      </>
    );
  }

  if (options.theme === "glitch") {
    return (
      <>
        <div className="absolute left-[60px] top-[42px] -skew-x-6 font-black uppercase text-white">
          <div className="text-[16px] tracking-[0.28em] text-fuchsia-200/68">{mapName}</div>
          <div className="text-[78px] leading-none drop-shadow-[4px_0_0_rgba(255,43,214,.46)]">Player Comparison</div>
        </div>
        <ComparePlayerCard player={leftPlayer} panel={leftTeam} side="left" showAgents={options.showAgents} />
        <ComparePlayerCard player={rightPlayer} panel={rightTeam} side="right" showAgents={options.showAgents} />
        <div className="absolute left-[518px] top-[165px] w-[565px] -skew-x-6 pb-[96px]">
          <div className="mb-4 grid place-items-center">
            <div className="grid h-[74px] w-[150px] place-items-center border border-fuchsia-200/34 bg-[#ff2bd6] text-[42px] font-black text-[#09000f] shadow-[5px_0_rgba(0,255,255,.24)]">VS</div>
          </div>
          <div className="bg-[#0b0311]/66 px-8 py-3 shadow-[5px_0_rgba(0,255,255,.16)]">
            {rows.map(([label, left, right]) => <CompareStatRow key={label} label={label} left={left} right={right} options={options} />)}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="riot-compare-title absolute left-[78px] right-[78px] top-[54px] text-center">
        <div className="text-[18px] font-black uppercase tracking-[0.2em] text-white/65">{mapName}</div>
        <div className="text-[66px] font-black uppercase leading-none text-white">Player Comparison</div>
      </div>
      <ComparePlayerCard player={leftPlayer} panel={leftTeam} side="left" showAgents={options.showAgents} />
      <ComparePlayerCard player={rightPlayer} panel={rightTeam} side="right" showAgents={options.showAgents} />
      <div className="riot-compare-stats absolute left-[535px] top-[176px] w-[530px] pb-[46px]">
        <div className="mb-3 grid place-items-center">
          <div className="riot-vs-box grid h-[68px] w-[126px] place-items-center bg-white text-[38px] font-black text-[#271044]">VS</div>
        </div>
        <div className="bg-black/30 px-8 py-2 backdrop-blur-[1px]">
          {rows.map(([label, left, right]) => <CompareStatRow key={label} label={label} left={left} right={right} options={options} />)}
        </div>
        {options.showTeamContext ? (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <StatTile label="Left Team" value={getTeamAlias(leftPlayer, leftPanel, rightPanel)} tone="light" />
            <StatTile label="Right Team" value={getTeamAlias(rightPlayer, leftPanel, rightPanel)} tone="light" />
          </div>
        ) : null}
      </div>
    </>
  );
};

const RiotPostMatchOverlay = () => {
  const location = useLocation();
  const [params] = useSearchParams();
  const scale = useOverlayScale();
  const mode = getModeFromPath(location.pathname);
  const region = params.get("region") || "ap";
  const matchId = params.get("matchId") || "";
  const teamAName = params.get("teamA") || "Team A";
  const teamBName = params.get("teamB") || "Team B";
  const options = parseOptions(params);
  const teamAColor = safeColor(params.get("teamAColor"), "#4c1d83");
  const teamBColor = safeColor(params.get("teamBColor"), "#cf69da");

  const matchQuery = useQuery({
    queryKey: ["riot-post-match-overlay", region, matchId],
    queryFn: () => apiClient.post<EnrichedRiotMatchData>("/api/integrations/riot/enriched-match", { region, matchId }),
    enabled: Boolean(matchId),
    refetchInterval: false,
  });

  const agentsQuery = useQuery({
    queryKey: ["valorant-agents-overlay"],
    queryFn: async () => {
      const data = await fetchJson<{ data?: AgentAsset[] }>("https://valorant-api.com/v1/agents?isPlayableCharacter=true");
      return Object.fromEntries((data.data ?? []).map((agent) => [agent.uuid.toLowerCase(), agent]));
    },
    staleTime: Infinity,
  });

  const mapsQuery = useQuery({
    queryKey: ["valorant-maps-overlay"],
    queryFn: async () => {
      const data = await fetchJson<{ data?: MapAsset[] }>("https://valorant-api.com/v1/maps");
      return data.data ?? [];
    },
    staleTime: Infinity,
  });

  const match = matchQuery.data;
  const agents = useMemo(() => agentsQuery.data ?? {}, [agentsQuery.data]);
  const teamIds = match ? getTeamIds(match, options.leftMode) : { left: "", right: "" };
  const leftPlayers = useMemo(() => (match && teamIds.left ? buildTeamPlayers(match, teamIds.left, agents) : []), [agents, match, teamIds.left]);
  const rightPlayers = useMemo(() => (match && teamIds.right ? buildTeamPlayers(match, teamIds.right, agents) : []), [agents, match, teamIds.right]);
  const allPlayers = useMemo(() => (match ? buildAllPlayers(match, agents) : []), [agents, match]);
  const mapAsset = useMemo(() => mapsQuery.data?.find((map) => map.mapUrl === match?.matchInfo.mapId), [mapsQuery.data, match?.matchInfo.mapId]);

  if (matchQuery.isLoading || !matchId) {
    return (
      <main className="h-dvh w-dvw bg-transparent" />
    );
  }

  if (matchQuery.error || !match) {
    return (
      <main className="grid h-dvh w-dvw place-items-center bg-black px-6 text-center text-sm text-white/70">
        {getApiErrorMessage(matchQuery.error, "This Riot overlay could not be loaded.")}
      </main>
    );
  }

  const leftTeam = match.teams.find((team) => team.teamId === teamIds.left);
  const rightTeam = match.teams.find((team) => team.teamId === teamIds.right);
  const leftPanel: TeamPanel = {
    id: teamIds.left,
    alias: teamAName,
    logo: params.get("teamALogo") || "",
    color: teamAColor,
    textColor: textColorFor(teamAColor),
    score: teamScore(match, teamIds.left),
    outcome: leftTeam?.won ? "WIN" : "LOSS",
    players: leftPlayers,
  };
  const rightPanel: TeamPanel = {
    id: teamIds.right,
    alias: teamBName,
    logo: params.get("teamBLogo") || "",
    color: teamBColor,
    textColor: textColorFor(teamBColor),
    score: teamScore(match, teamIds.right),
    outcome: rightTeam?.won ? "WIN" : "LOSS",
    players: rightPlayers,
  };
  const mapName = options.mapNameOverride || mapAsset?.displayName || "Map";
  const selectedPlayer = allPlayers.find((player) => player.puuid === params.get("playerPuuid")) ?? allPlayers[0] ?? null;
  const selectedLeft = allPlayers.find((player) => player.puuid === params.get("leftPlayerPuuid")) ?? allPlayers[0] ?? null;
  const selectedRight = allPlayers.find((player) => player.puuid === params.get("rightPlayerPuuid")) ?? allPlayers.find((player) => player.puuid !== selectedLeft?.puuid) ?? null;

  return (
    <main className="grid h-dvh w-dvw place-items-center overflow-hidden bg-black">
      <section
        className={`riot-stage riot-theme-${options.theme} relative origin-center overflow-hidden bg-black text-white`}
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
        aria-label="Riot OBS overlay"
      >
        <style>
          {`
            @keyframes riotOverlaySlideUp {
              from { opacity: 0; transform: translate3d(0, 90px, 0); }
              to { opacity: 1; transform: translate3d(0, 0, 0); }
            }
            @keyframes riotOverlaySlideLeft {
              from { opacity: 0; transform: translate3d(-120px, 0, 0); }
              to { opacity: 1; transform: translate3d(0, 0, 0); }
            }
            @keyframes riotOverlaySlideRight {
              from { opacity: 0; transform: translate3d(120px, 0, 0); }
              to { opacity: 1; transform: translate3d(0, 0, 0); }
            }
            @media (prefers-reduced-motion: reduce) {
              .riot-overlay-enter { animation: none !important; }
            }
            .riot-stage::before {
              content: "";
              position: absolute;
              inset: 0;
              pointer-events: none;
              z-index: 2;
            }
            .riot-stage::after {
              content: "";
              position: absolute;
              inset: 22px;
              pointer-events: none;
              z-index: 3;
            }
            .riot-overlay-enter {
              z-index: 4;
            }
            .riot-team-header,
            .riot-map-card,
            .riot-logo-panel,
            .riot-player-card,
            .riot-context-panel {
              position: absolute;
            }
            .riot-team-header {
              box-shadow: inset 0 0 0 1px rgba(255,255,255,.16), 0 18px 36px rgba(0,0,0,.28);
            }
            .riot-theme-tactical .riot-team-header {
              clip-path: polygon(0 0, 96% 0, 100% 22%, 100% 100%, 4% 100%, 0 78%);
              background-image: linear-gradient(135deg, rgba(255,255,255,.14), transparent 32%), repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 1px, transparent 1px 42px);
              border: 1px solid rgba(125,249,255,.24);
            }
            .riot-theme-premium .riot-team-header {
              clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
              background-image: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,0));
              border: 1px solid rgba(255,255,255,.16);
              top: 46px !important;
              width: 560px !important;
              height: 112px !important;
              padding-top: 17px !important;
              padding-bottom: 17px !important;
            }
            .riot-theme-glitch .riot-team-header {
              clip-path: polygon(0 0, 92% 0, 100% 18%, 100% 100%, 8% 100%, 0 82%);
              background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.11) 0 1px, transparent 1px 5px), linear-gradient(90deg, rgba(255,43,214,.20), transparent 55%);
              border: 1px solid rgba(255,43,214,.38);
              text-shadow: 2px 0 rgba(255,43,214,.55), -2px 0 rgba(0,255,255,.32);
              top: 72px !important;
              transform: skewX(-5deg);
            }
            .riot-theme-premium .riot-mvp-panel {
              top: 184px !important;
              width: 460px !important;
            }
            .riot-theme-premium .riot-mvp-left {
              left: 96px !important;
            }
            .riot-theme-premium .riot-mvp-right {
              right: 96px !important;
            }
            .riot-theme-premium .riot-center-stats {
              left: 600px !important;
              top: 215px !important;
              width: 400px !important;
            }
            .riot-theme-glitch .riot-mvp-panel {
              top: 214px !important;
              transform: skewX(-3deg);
            }
            .riot-theme-glitch .riot-mvp-left {
              left: 52px !important;
            }
            .riot-theme-glitch .riot-mvp-right {
              right: 52px !important;
            }
            .riot-theme-glitch .riot-center-stats {
              left: 614px !important;
              top: 220px !important;
              width: 372px !important;
              transform: skewX(-4deg);
            }
            .riot-theme-tactical::before {
              background: radial-gradient(circle at 50% 45%, rgba(0,255,255,.12), transparent 32%), linear-gradient(90deg, rgba(0,0,0,.66), transparent 43%, transparent 57%, rgba(0,0,0,.66));
            }
            .riot-theme-premium::before {
              background: radial-gradient(circle at 50% 45%, rgba(255,255,255,.09), transparent 34%), linear-gradient(90deg, rgba(0,0,0,.56), transparent 48%, rgba(0,0,0,.56));
            }
            .riot-theme-glitch::before {
              background: radial-gradient(circle at 50% 45%, rgba(255,43,214,.18), transparent 34%), repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 5px), linear-gradient(90deg, rgba(0,0,0,.70), transparent 44%, transparent 56%, rgba(0,0,0,.70));
            }
            .riot-theme-tactical::after {
              border: 1px solid rgba(125,249,255,.24);
              box-shadow: inset 0 0 0 1px rgba(255,255,255,.05);
              clip-path: polygon(0 0, 100% 0, 100% 86%, 96% 100%, 0 100%);
            }
            .riot-theme-premium::after {
              border-top: 1px solid rgba(255,255,255,.36);
              border-bottom: 1px solid rgba(255,255,255,.18);
            }
            .riot-theme-glitch::after {
              border: 1px solid rgba(255,43,214,.34);
              box-shadow: 3px 0 rgba(0,255,255,.18), -3px 0 rgba(255,43,214,.2);
            }
            .riot-theme-tactical .riot-player-row,
            .riot-theme-tactical .riot-map-card,
            .riot-theme-tactical .riot-logo-panel,
            .riot-theme-tactical .riot-player-card,
            .riot-theme-tactical .riot-context-panel,
            .riot-theme-tactical .riot-stat-tile {
              clip-path: polygon(0 0, 97% 0, 100% 16%, 100% 100%, 3% 100%, 0 84%);
              box-shadow: inset 0 0 0 1px rgba(125,249,255,.14), 0 14px 28px rgba(0,0,0,.26);
            }
            .riot-theme-premium .riot-player-row,
            .riot-theme-premium .riot-map-card,
            .riot-theme-premium .riot-logo-panel,
            .riot-theme-premium .riot-player-card,
            .riot-theme-premium .riot-context-panel,
            .riot-theme-premium .riot-stat-tile {
              border-color: rgba(255,255,255,.20);
              box-shadow: inset 0 0 0 1px rgba(255,255,255,.07);
            }
            .riot-theme-premium .riot-player-row {
              height: 64px !important;
              border-color: rgba(24,13,53,.18);
            }
            .riot-theme-premium .riot-roster {
              top: 500px !important;
              width: 420px !important;
            }
            .riot-theme-premium .riot-roster-left {
              left: 336px !important;
            }
            .riot-theme-premium .riot-roster-right {
              right: 336px !important;
            }
            .riot-theme-premium .riot-map-card {
              left: 92px !important;
              top: 500px !important;
              width: 224px !important;
              height: 320px !important;
            }
            .riot-theme-premium .riot-center-labels > div {
              height: 64px !important;
            }
            .riot-theme-premium .riot-center-labels {
              top: 500px !important;
            }
            .riot-theme-premium .riot-player-title {
              top: 42px !important;
            }
            .riot-theme-premium .riot-player-card {
              left: 72px !important;
              top: 198px !important;
              width: 500px !important;
              height: 612px !important;
              background: rgba(255,255,255,.09) !important;
            }
            .riot-theme-premium .riot-player-stats-grid {
              left: 610px !important;
              top: 226px !important;
              width: 565px !important;
            }
            .riot-theme-premium .riot-context-panel {
              right: 78px !important;
              top: 250px !important;
              width: 300px !important;
              height: auto !important;
              background: transparent !important;
              padding: 0 !important;
            }
            .riot-theme-premium .riot-compare-title {
              top: 36px !important;
            }
            .riot-theme-premium .riot-compare-card {
              top: 220px !important;
              width: 440px !important;
              height: 535px !important;
            }
            .riot-theme-premium .riot-compare-stats {
              left: 524px !important;
              top: 185px !important;
              width: 552px !important;
              padding-bottom: 76px !important;
            }
            .riot-theme-glitch .riot-player-row,
            .riot-theme-glitch .riot-map-card,
            .riot-theme-glitch .riot-logo-panel,
            .riot-theme-glitch .riot-player-card,
            .riot-theme-glitch .riot-context-panel,
            .riot-theme-glitch .riot-stat-tile {
              clip-path: polygon(0 0, 94% 0, 100% 14%, 100% 100%, 6% 100%, 0 86%);
              box-shadow: inset 0 0 0 1px rgba(255,43,214,.25), 3px 0 rgba(0,255,255,.18);
            }
            .riot-theme-glitch .riot-player-row:nth-child(odd) {
              transform: translateX(8px) skewX(-3deg);
            }
            .riot-theme-glitch .riot-player-row:nth-child(even) {
              transform: translateX(-6px) skewX(-3deg);
            }
            .riot-theme-glitch .riot-roster {
              top: 505px !important;
              width: 405px !important;
            }
            .riot-theme-glitch .riot-roster-left {
              left: 342px !important;
            }
            .riot-theme-glitch .riot-roster-right {
              right: 342px !important;
            }
            .riot-theme-glitch .riot-map-card {
              transform: rotate(-1.5deg);
              top: 505px !important;
              height: 340px !important;
            }
            .riot-theme-glitch .riot-center-labels {
              top: 505px !important;
            }
            .riot-theme-glitch .riot-player-title {
              top: 44px !important;
              transform: skewX(-4deg);
            }
            .riot-theme-glitch .riot-player-card {
              left: 70px !important;
              top: 218px !important;
              width: 455px !important;
              height: 585px !important;
              transform: rotate(-1.5deg) skewX(-2deg);
            }
            .riot-theme-glitch .riot-player-stats-grid {
              left: 572px !important;
              top: 212px !important;
              width: 570px !important;
              transform: skewX(-3deg);
            }
            .riot-theme-glitch .riot-context-panel {
              right: 70px !important;
              top: 236px !important;
              width: 332px !important;
              height: auto !important;
              transform: skewX(-3deg);
            }
            .riot-theme-glitch .riot-compare-title {
              top: 44px !important;
              transform: skewX(-4deg);
            }
            .riot-theme-glitch .riot-compare-card {
              top: 210px !important;
              transform: skewX(-3deg);
            }
            .riot-theme-glitch .riot-compare-stats {
              left: 520px !important;
              top: 168px !important;
              width: 560px !important;
              padding-bottom: 88px !important;
              transform: skewX(-3deg);
            }
            .riot-theme-glitch .riot-center-labels > div:nth-child(odd) {
              transform: translateX(-4px) skewX(-3deg);
            }
            .riot-theme-glitch .riot-center-labels > div:nth-child(even) {
              transform: translateX(4px) skewX(-3deg);
            }
            .riot-theme-tactical .riot-stat-tile {
              background: linear-gradient(135deg, rgba(0,255,255,.10), rgba(0,0,0,.55));
            }
            .riot-theme-premium .riot-stat-tile {
              background: rgba(255,255,255,.08);
            }
            .riot-theme-glitch .riot-stat-tile {
              background: repeating-linear-gradient(0deg, rgba(255,255,255,.07) 0 1px, transparent 1px 5px), rgba(255,43,214,.12);
            }
            .riot-theme-tactical .riot-center-labels > div {
              background: rgba(3, 13, 23, .72);
              border-color: rgba(125,249,255,.22);
            }
            .riot-theme-premium .riot-center-labels > div {
              background: rgba(255,255,255,.10);
            }
            .riot-theme-glitch .riot-center-labels > div {
              background: rgba(28, 3, 39, .82);
              border-color: rgba(255,43,214,.22);
              color: rgba(255,255,255,.82);
            }
            .riot-theme-tactical .riot-vs-box {
              clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);
              box-shadow: 0 0 26px rgba(125,249,255,.18);
            }
            .riot-theme-glitch .riot-vs-box {
              background: #ff2bd6;
              color: #09000f;
              text-shadow: 2px 0 rgba(0,255,255,.42);
              clip-path: polygon(0 0, 88% 0, 100% 24%, 100% 100%, 12% 100%, 0 76%);
            }
          `}
        </style>
        <div
          className="riot-overlay-enter absolute inset-0"
          style={{
            animationName: transitionAnimationName(options.transition),
            animationDuration: options.transition === "none" ? "0ms" : "720ms",
            animationTimingFunction: "cubic-bezier(.2,.84,.2,1)",
            animationFillMode: "both",
          }}
        >
          {mapAsset?.splash ? <img src={mapAsset.splash} className="absolute inset-0 h-full w-full object-cover blur-[2px]" alt="" /> : null}
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${options.bgDim})` }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(92,35,131,0.48),transparent_42%),linear-gradient(90deg,rgba(0,0,0,.55),transparent_44%,transparent_56%,rgba(0,0,0,.55))]" />

          {mode === "player" ? (
            <PlayerOverlay player={selectedPlayer} leftPanel={leftPanel} rightPanel={rightPanel} mapAsset={mapAsset} mapName={mapName} options={options} />
          ) : mode === "compare" ? (
            <CompareOverlay leftPlayer={selectedLeft} rightPlayer={selectedRight} leftPanel={leftPanel} rightPanel={rightPanel} mapName={mapName} options={options} />
          ) : (
            <MatchOverlay leftPanel={leftPanel} rightPanel={rightPanel} mapAsset={mapAsset} mapName={mapName} options={options} />
          )}
        </div>
      </section>
    </main>
  );
};

export default RiotPostMatchOverlay;

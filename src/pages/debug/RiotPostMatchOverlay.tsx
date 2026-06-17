import React, { useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/apiClient";
import type { AbilityCasts } from "@/types/scoreboardPlayer";
import type { EnrichedRiotMatchData } from "@/types/enrichedRiotMatch";
import { resolveEnrichedPlayer } from "@/types/enrichedRiotMatch";

type OverlayMode = "match" | "player" | "compare";
type OverlayTransition = "none" | "up" | "left" | "right";

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

const overlayTransition = (value: string | null): OverlayTransition =>
  value === "up" || value === "left" || value === "right" ? value : "none";

const objectFitParam = (value: string | null): "contain" | "cover" =>
  value === "cover" ? "cover" : "contain";

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

const TeamHeader = ({ panel, fallback, nameMode, side }: { panel: TeamPanel; fallback: string; nameMode: OverlayOptions["nameMode"]; side: "left" | "right" }) => (
  <div
    className={[
      "absolute top-[58px] h-[126px] w-[620px] overflow-hidden px-[56px] py-[20px]",
      side === "left" ? "left-[78px] text-left" : "right-[78px] text-right",
    ].join(" ")}
    style={{ backgroundColor: panel.color, color: panel.textColor }}
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
  if (length > 16) return 18;
  if (length > 13) return 20;
  if (length > 10) return 22;
  return 25;
};

const PlayerRow = ({ player, panel, side }: { player: PlayerCardData | null; panel: TeamPanel; side: "left" | "right" }) => {
  return (
    <div
      className={[
        "grid h-[78px] items-center overflow-hidden border-y border-black/60 font-black uppercase",
        side === "left" ? "grid-cols-[72px_minmax(0,1fr)_96px]" : "grid-cols-[96px_minmax(0,1fr)_72px]",
      ].join(" ")}
      style={{ backgroundColor: panel.color, color: panel.textColor }}
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
    <div className={["absolute top-[206px] w-[540px]", side === "left" ? "left-[78px] text-left" : "right-[78px] text-right"].join(" ")}>
      {showBadge ? (
        <div className="mb-[16px] inline-grid h-[70px] min-w-[168px] place-items-center px-8 text-[31px] font-black uppercase text-black" style={{ backgroundColor: accentColor }}>
          {label}
        </div>
      ) : null}
      <div className="relative h-[176px]">
        <div className={["absolute bottom-[8px] max-w-[300px]", side === "left" ? "left-0" : "right-0"].join(" ")}>
          <div className="text-[20px] font-black uppercase text-white/78">{player?.agent?.displayName || "Agent"}</div>
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
  <div className="absolute left-[640px] top-[238px] w-[320px] text-center">
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
  <div className="absolute left-[78px] top-[510px] h-[340px] w-[250px] overflow-hidden bg-[#4b1a84]">
    {mapAsset?.splash ? <img src={mapAsset.splash} className="h-full w-full object-cover" alt="" /> : null}
    <div className="absolute inset-0 bg-black/8" />
    <div className="absolute bottom-[18px] left-0 right-0 text-center text-[34px] font-black uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
      {mapName}
    </div>
  </div>
);

const LogoPanel = ({ panel, side }: { panel: TeamPanel; side: "left" | "right" }) => (
  <div className={["absolute top-[510px] grid h-[340px] w-[250px] place-items-center overflow-hidden", side === "left" ? "left-[78px]" : "right-[78px]"].join(" ")} style={{ backgroundColor: panel.color, color: panel.textColor }}>
    {panel.logo ? <img src={panel.logo} className="max-h-[215px] max-w-[215px] object-contain" alt="" /> : <div className="max-w-[190px] truncate text-center text-[28px] font-black uppercase opacity-58">{panel.alias}</div>}
  </div>
);

const SponsorPanel = ({ image, label, panel, options }: { image: string; label: string; panel: TeamPanel; options: OverlayOptions }) => {
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
        image ? "bg-transparent" : "",
      ].join(" ")}
      style={image ? undefined : { backgroundColor: panel.color, color: panel.textColor }}
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
        {image ? (
          <img
            src={image}
            className="h-full w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.62)]"
            style={{ objectFit: options.sponsorFit }}
            loading="eager"
            alt=""
          />
        ) : (
          <div className="max-w-full text-center font-black uppercase leading-tight opacity-62" style={{ fontSize: 26 * options.sponsorSize }}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
};

const Rows = ({ panel, side }: { panel: TeamPanel; side: "left" | "right" }) => {
  const rows = panel.players.slice(1, 5);
  return (
    <div className={["absolute top-[510px] w-[392px]", side === "left" ? "left-[340px]" : "right-[340px]"].join(" ")}>
      {Array.from({ length: 4 }).map((_, index) => (
        <PlayerRow key={rows[index]?.puuid || `${panel.id}-${index}`} player={rows[index] ?? null} panel={panel} side={side} />
      ))}
    </div>
  );
};

const CenterRowLabels = () => (
  <div className="absolute left-[744px] top-[510px] w-[112px]">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="grid h-[78px] grid-cols-2 place-items-center border-y border-white/10 bg-black/28 px-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white/72">
        <span>K/D</span>
        <span>ACS</span>
        <span>HS</span>
        <span>FK</span>
      </div>
    ))}
  </div>
);

const StatTile = ({ label, value, tone = "dark" }: { label: string; value: string; tone?: "dark" | "light" | "accent" }) => (
  <div className={["min-h-[94px] border px-5 py-4 backdrop-blur-[1px]", tone === "light" ? "border-white/16 bg-white/8 text-white" : tone === "accent" ? "border-white/32 bg-white/14 text-white" : "border-white/12 bg-black/22 text-white"].join(" ")}>
    <div className="text-[13px] font-black uppercase tracking-[0.18em] opacity-65">{label}</div>
    <div className="mt-2 truncate text-[40px] font-black uppercase leading-none" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.34)" }}>{value}</div>
  </div>
);

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
}) => (
  <>
    <TeamHeader panel={leftPanel} fallback="TMA" nameMode="full" side="left" />
    <TeamHeader panel={rightPanel} fallback="TMB" nameMode="full" side="right" />
    <MvpPanel accentColor={options.accentColor} panel={leftPanel} side="left" showBadge={options.showMvpBadges} showPortrait={options.showPortraits} label={options.mvpLabel} />
    <MvpPanel accentColor={options.accentColor} panel={rightPanel} side="right" showBadge={options.showMvpBadges} showPortrait={options.showPortraits} label={options.mvpLabel} />
    <CenterStats left={getMvp(leftPanel.players)} right={getMvp(rightPanel.players)} />
    {options.showMap ? <MapCard mapAsset={mapAsset} mapName={mapName} /> : options.showLogos ? <LogoPanel panel={leftPanel} side="left" /> : null}
    {options.showLogos ? <SponsorPanel image={options.sponsorImage} label={options.sponsorLabel} panel={rightPanel} options={options} /> : null}
    {options.showRows ? (
      <>
        <Rows panel={leftPanel} side="left" />
        <CenterRowLabels />
        <Rows panel={rightPanel} side="right" />
      </>
    ) : null}
  </>
);

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
  return (
    <>
      <div className="absolute left-[78px] right-[78px] top-[54px] flex items-start justify-between">
        <div>
          <div className="text-[18px] font-black uppercase tracking-[0.2em] text-white/70">{options.playerSubtitle}</div>
          <div className="mt-1 text-[66px] font-black uppercase leading-none text-white">{options.playerTitle}</div>
        </div>
        <div className="text-right text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)]">
          <div className="text-[19px] font-black uppercase tracking-[0.18em] text-white/68">{options.showTeam ? getTeamAlias(player, leftPanel, rightPanel) : "Match"}</div>
          <div className="mt-1 text-[58px] font-black leading-none" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.28)" }}>{playerTeam.score}</div>
        </div>
      </div>
      <div className="absolute left-[92px] top-[230px] h-[560px] w-[430px] overflow-hidden bg-black/35">
        {options.showMap && mapAsset?.splash ? <img src={mapAsset.splash} className="absolute inset-0 h-full w-full object-cover opacity-28" alt="" /> : null}
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent, ${playerTeam.color} 105%)` }} />
        {options.showAgent && portrait ? <img src={portrait} className="absolute bottom-[-10px] left-[-35px] h-[590px] w-[510px] object-contain drop-shadow-[0_24px_28px_rgba(0,0,0,0.75)]" alt="" /> : null}
        <div className="absolute bottom-8 left-8 right-8">
          <div className="text-[22px] font-black uppercase text-white/70">{player?.agent?.displayName || "Agent"}</div>
          <div className="truncate text-[52px] font-black uppercase leading-none text-white">{player?.gameName || "Unknown"}</div>
        </div>
      </div>
      <div className="absolute left-[560px] top-[230px] w-[520px]">
        <div className="grid grid-cols-2 gap-4">
          {tiles.map((tile, index) => <StatTile key={tile.label} label={tile.label} value={tile.value} tone={index === 1 ? "accent" : "dark"} />)}
        </div>
      </div>
      <div className="absolute right-[92px] top-[230px] h-[560px] w-[360px] bg-black/38 p-8">
        <div className="text-[14px] font-black uppercase tracking-[0.18em] text-white/55">Match Context</div>
        <div className="mt-8 space-y-5">
          <StatTile label="Map" value={mapName} tone="light" />
          <StatTile label={leftPanel.alias} value={String(leftPanel.score)} tone="dark" />
          <StatTile label={rightPanel.alias} value={String(rightPanel.score)} tone="dark" />
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
    <div className={`absolute top-[205px] h-[560px] w-[410px] overflow-visible text-white ${side === "left" ? "left-[84px]" : "right-[84px]"}`}>
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
  return (
    <>
      <div className="absolute left-[78px] right-[78px] top-[54px] text-center">
        <div className="text-[18px] font-black uppercase tracking-[0.2em] text-white/65">{mapName}</div>
        <div className="text-[66px] font-black uppercase leading-none text-white">Player Comparison</div>
      </div>
      <ComparePlayerCard player={leftPlayer} panel={leftTeam} side="left" showAgents={options.showAgents} />
      <ComparePlayerCard player={rightPlayer} panel={rightTeam} side="right" showAgents={options.showAgents} />
      <div className="absolute left-[535px] top-[176px] w-[530px] pb-[34px]">
        <div className="mb-3 grid place-items-center">
          <div className="grid h-[68px] w-[126px] place-items-center bg-white text-[38px] font-black text-[#271044]">VS</div>
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
  const agents = agentsQuery.data ?? {};
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
        className="relative origin-center overflow-hidden bg-black text-white"
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

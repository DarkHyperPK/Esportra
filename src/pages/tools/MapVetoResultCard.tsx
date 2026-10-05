import React from "react";
import type { VetoHistoryEntry } from "@/hooks/useVetoHistory";
import type { PublicVetoState } from "./publicMapVetoUtils";

type MapVetoResultCardProps = {
  state: PublicVetoState;
  history: VetoHistoryEntry[];
  team1Logo: string | null;
  team2Logo: string | null;
};

const CARD_WIDTH = 1200;
const CARD_PADDING = 56;
const PICK_HEIGHT = 200;
const BAN_HEIGHT = 90;

export const MapVetoResultCard = React.forwardRef<HTMLDivElement, MapVetoResultCardProps>(
  ({ state, history, team1Logo, team2Logo }, ref) => {
    const picks = history.filter(
      (r) => r.action === "pick" || r.action === "auto_decider",
    );
    const bans = history.filter((r) => r.action === "ban");
    const pickCols = Math.max(1, Math.min(picks.length, 5));
    const innerWidth = CARD_WIDTH - CARD_PADDING * 2;

    return (
      <div
        ref={ref}
        style={{
          width: CARD_WIDTH,
          background: "#09090b",
          padding: CARD_PADDING,
          fontFamily: "Poppins, sans-serif",
          color: "#ffffff",
          boxSizing: "border-box",
        }}
      >
        {/* Teams row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 36,
          }}
        >
          {/* Team 1 */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
            {team1Logo ? (
              <img
                src={team1Logo}
                alt={state.team1Name}
                style={{ width: 52, height: 52, objectFit: "contain", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  background: "#27272a",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#f43f5e",
                }}
              >
                {state.team1Name.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              style={{
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: -0.5,
                lineHeight: 1.15,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {state.team1Name}
            </span>
          </div>

          {/* vs */}
          <div style={{ padding: "0 24px", flexShrink: 0, textAlign: "center" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.3em",
                color: "#52525b",
                textTransform: "uppercase",
              }}
            >
              BO{state.bestOf || 1}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "#3f3f46",
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              vs
            </div>
          </div>

          {/* Team 2 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 14,
              flex: 1,
              minWidth: 0,
              flexDirection: "row-reverse",
            }}
          >
            {team2Logo ? (
              <img
                src={team2Logo}
                alt={state.team2Name}
                style={{ width: 52, height: 52, objectFit: "contain", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  background: "#27272a",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#60a5fa",
                }}
              >
                {state.team2Name.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              style={{
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: -0.5,
                lineHeight: 1.15,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "right",
              }}
            >
              {state.team2Name}
            </span>
          </div>
        </div>

        {/* Rose divider */}
        <div style={{ height: 2, background: "#f43f5e", marginBottom: 36 }} />

        {/* Picks grid */}
        {picks.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${pickCols}, 1fr)`,
              gap: 10,
              marginBottom: bans.length > 0 ? 28 : 0,
            }}
          >
            {picks.map((pick, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  height: PICK_HEIGHT,
                  overflow: "hidden",
                  background: "#18181b",
                }}
              >
                {pick.mapImageUrl && (
                  <img
                    src={pick.mapImageUrl}
                    alt={pick.mapName}
                    crossOrigin="anonymous"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 55%, transparent 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 14,
                    right: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: pick.action === "auto_decider" ? "#a1a1aa" : pick.teamSide === "team1" ? "#f43f5e" : "#60a5fa",
                      marginBottom: 4,
                    }}
                  >
                    {pick.action === "auto_decider" ? "Decider" : pick.teamName}
                  </div>
                  <div
                    style={{
                      fontSize: pickCols >= 5 ? 14 : 18,
                      fontWeight: 900,
                      letterSpacing: -0.5,
                      lineHeight: 1.1,
                    }}
                  >
                    {pick.mapName}
                  </div>
                  {pick.side && (
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "#a1a1aa",
                        marginTop: 4,
                      }}
                    >
                      {pick.teamName} starts {pick.side}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bans row */}
        {bans.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.28em",
                color: "#3f3f46",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Banned
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {bans.map((ban, i) => {
                const banWidth = Math.min(
                  160,
                  Math.floor((innerWidth - (bans.length - 1) * 8) / bans.length),
                );
                return (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      width: banWidth,
                      height: BAN_HEIGHT,
                      overflow: "hidden",
                      background: "#18181b",
                    }}
                  >
                    {ban.mapImageUrl && (
                      <img
                        src={ban.mapImageUrl}
                        alt={ban.mapName}
                        crossOrigin="anonymous"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                          filter: "grayscale(0.8) brightness(0.45)",
                        }}
                      />
                    )}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.35)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 8,
                        left: 10,
                        right: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "#52525b",
                          marginBottom: 2,
                        }}
                      >
                        {ban.teamName}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          color: "#71717a",
                          letterSpacing: -0.2,
                          lineHeight: 1.1,
                        }}
                      >
                        {ban.mapName}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#f43f5e",
            }}
          >
            ESPORTRA
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#27272a",
            }}
          >
            Map Veto Result
          </span>
        </div>
      </div>
    );
  },
);

MapVetoResultCard.displayName = "MapVetoResultCard";

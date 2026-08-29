import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Map as MapIcon, Swords, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  PUBLIC_VETO_GAMES,
  PublicVetoGameMap,
  buildPublicVetoMapsUrl,
  filterCompetitiveVetoMaps,
  getPublicVetoMapImage,
  publicVetoMapName,
} from "./publicMapVetoUtils";

const STEPS = [
  { id: 1, title: "Format", icon: Swords, blurb: "Pick the game and series length." },
  { id: 2, title: "Teams", icon: Users, blurb: "Name both sides before veto starts." },
  { id: 3, title: "Map pool", icon: MapIcon, blurb: "Choose the competitive maps in play." },
] as const;

type MapPoolCardProps = {
  map: PublicVetoGameMap;
  game: string;
  isSelected: boolean;
  onToggle: (mapId: string) => void;
};

const MapPoolCard = ({ map, game, isSelected, onToggle }: MapPoolCardProps) => {
  const name = publicVetoMapName(map);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={`${isSelected ? "Deselect" : "Select"} ${name}`}
      onClick={() => onToggle(map.id)}
      className={cn(
        "group relative aspect-[16/7] overflow-hidden border-2 text-left transition-all duration-200",
        isSelected
          ? "border-rose-500 shadow-lg shadow-rose-500/25 ring-1 ring-rose-500/40"
          : "border-white/10 hover:border-white/30 hover:shadow-md hover:shadow-black/30",
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-zinc-900 bg-cover bg-center transition-transform duration-300",
          isSelected ? "scale-105" : "group-hover:scale-[1.03]",
        )}
        style={{
          backgroundImage: `linear-gradient(to top, rgba(0,0,0,.82), rgba(0,0,0,.18)), url(${getPublicVetoMapImage(map, game)})`,
        }}
      />
      <div
        className={cn(
          "absolute inset-0 transition-colors duration-200",
          isSelected ? "bg-rose-500/10" : "bg-black/20 group-hover:bg-black/10",
        )}
      />
      <div className="absolute inset-x-0 bottom-0 p-2">
        <span
          className={cn(
            "block truncate text-xs font-bold tracking-tight sm:text-[13px]",
            isSelected ? "text-rose-200" : "text-white",
          )}
        >
          {name}
        </span>
      </div>
    </button>
  );
};

const PublicMapVetoCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const [game, setGame] = useState("valorant");
  const [bestOf, setBestOf] = useState("3");
  const [team1Name, setTeam1Name] = useState("Team A");
  const [team2Name, setTeam2Name] = useState("Team B");
  const [selectedMapIds, setSelectedMapIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const gameConfig = PUBLIC_VETO_GAMES.find((item) => item.value === game) ?? PUBLIC_VETO_GAMES[0];

  const { data: rawMaps = [], isLoading } = useQuery({
    queryKey: ["public-tool-map-pool", game],
    queryFn: () => apiClient.get<PublicVetoGameMap[]>(buildPublicVetoMapsUrl(gameConfig.apiName)),
  });

  const maps = useMemo(() => filterCompetitiveVetoMaps(rawMaps), [rawMaps]);

  useEffect(() => {
    maps.forEach((map) => {
      const img = new Image();
      img.decoding = "async";
      img.src = getPublicVetoMapImage(map, game);
    });
  }, [game, maps]);

  useEffect(() => {
    setSelectedMapIds((current) => {
      const available = maps.map((map) => map.id);
      return current.filter((id) => available.includes(id)).slice(0, gameConfig.poolSize);
    });
  }, [gameConfig.poolSize, maps]);

  const selectedCount = selectedMapIds.length;
  const hasValidPool = selectedCount === gameConfig.poolSize;
  const teamsValid = team1Name.trim().length > 0 && team2Name.trim().length > 0;

  const toggleMap = (mapId: string) => {
    setSelectedMapIds((current) => {
      if (current.includes(mapId)) return current.filter((id) => id !== mapId);
      if (current.length >= gameConfig.poolSize) {
        toast({
          title: "Map pool full",
          description: `${gameConfig.label} veto uses ${gameConfig.poolSize} maps. Deselect one to swap.`,
        });
        return current;
      }
      return [...current, mapId];
    });
  };

  const goNext = () => {
    if (step === 2 && !teamsValid) {
      toast({ title: "Team names required", description: "Enter a name for both teams.", variant: "destructive" });
      return;
    }
    if (step === 3 && !hasValidPool) {
      toast({
        title: "Select the veto pool",
        description: `Select exactly ${gameConfig.poolSize} maps for ${gameConfig.label}.`,
        variant: "destructive",
      });
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length));
  };

  const createSession = async () => {
    if (!hasValidPool) {
      toast({
        title: "Select the veto pool",
        description: `Select exactly ${gameConfig.poolSize} maps for ${gameConfig.label}.`,
        variant: "destructive",
      });
      return;
    }
    setCreating(true);
    try {
      const response = await apiClient.post<{ hostToken: string }>("/api/tools/map-veto", {
        game,
        bestOf: Number(bestOf),
        team1Name: team1Name.trim(),
        team2Name: team2Name.trim(),
        mapIds: selectedMapIds,
      });
      navigate(`/tools/map-veto/host/${response.hostToken}`);
    } catch (err) {
      toast({ title: "Could not create veto room", description: getApiErrorMessage(err), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const stepMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
      };

  return (
    <main className="w-full px-4 py-5 text-white lg:px-6 xl:px-8">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-rose-400">Public tools</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-[1.65rem]">Map Veto Room</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-zinc-400">
          Set up a premium three-step veto room, then share host and team links for the next 24 hours.
        </p>
      </div>

      <div className="mb-4 border border-white/10 bg-black/40 px-3 py-3 backdrop-blur-sm sm:px-4">
        <div className="relative grid grid-cols-3 gap-2">
          <div
            className="absolute left-[16.666%] right-[16.666%] top-4 hidden h-px bg-white/10 sm:block"
            aria-hidden="true"
          />
          <div
            className="absolute left-[16.666%] top-4 hidden h-px bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500 sm:block"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 66.666}%` }}
            aria-hidden="true"
          />
          {STEPS.map((item) => {
            const Icon = item.icon;
            const isActive = step === item.id;
            const isComplete = step > item.id;
            return (
              <div key={item.id} className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-[#050505] transition-all duration-300",
                    isActive && "scale-105 border-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.3)]",
                    isComplete && "border-rose-500/80 text-rose-300",
                    !isActive && !isComplete && "border-white/10 text-zinc-500",
                  )}
                >
                  {isComplete ? <CheckCircle2 className="h-[17px] w-[17px]" /> : <Icon className={cn("h-3.5 w-3.5", isActive && "text-rose-400")} />}
                </div>
                <div className="hidden sm:block">
                  <p className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", isActive ? "text-rose-300" : isComplete ? "text-zinc-300" : "text-zinc-600")}>
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[9px] text-zinc-500">{item.blurb}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="border border-white/10 bg-[#0a0a0c]/90 p-4 backdrop-blur-md sm:p-5">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="format" {...stepMotion} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-xl space-y-5">
              <div>
                <h2 className="text-lg font-bold sm:text-[1.15rem]">Match format</h2>
                <p className="mt-1 text-[13px] text-zinc-400 sm:text-sm">Choose the title and how many maps can be played.</p>
              </div>
              <div className="space-y-2">
                <Label>Game</Label>
                <Select
                  value={game}
                  onValueChange={(next) => {
                    setGame(next);
                    setSelectedMapIds([]);
                    setStep(1);
                  }}
                >
                  <SelectTrigger className="h-10 border-white/10 bg-black/40 text-sm text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PUBLIC_VETO_GAMES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Best of</Label>
                <Select value={bestOf} onValueChange={setBestOf}>
                  <SelectTrigger className="h-10 border-white/10 bg-black/40 text-sm text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">BO1</SelectItem>
                    <SelectItem value="3">BO3</SelectItem>
                    <SelectItem value="5">BO5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="teams" {...stepMotion} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-xl space-y-5">
              <div>
                <h2 className="text-lg font-bold sm:text-[1.15rem]">Team names</h2>
                <p className="mt-1 text-[13px] text-zinc-400 sm:text-sm">These labels appear on the veto board and share links.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-a">Team A</Label>
                <Input
                  id="team-a"
                  value={team1Name}
                  onChange={(e) => setTeam1Name(e.target.value)}
                  className="h-10 border-white/10 bg-black/40 text-sm text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-b">Team B</Label>
                <Input
                  id="team-b"
                  value={team2Name}
                  onChange={(e) => setTeam2Name(e.target.value)}
                  className="h-10 border-white/10 bg-black/40 text-sm text-white"
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="maps" {...stepMotion} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="space-y-3">
              <div>
                <h2 className="text-lg font-bold sm:text-[1.15rem]">Map pool</h2>
                <p className="mt-1 text-[13px] text-zinc-400">
                  {isLoading
                    ? "Loading competitive maps..."
                    : `${selectedCount}/${gameConfig.poolSize} selected · ${maps.length} competitive maps`}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {maps.map((map) => (
                  <MapPoolCard
                    key={map.id}
                    map={map}
                    game={game}
                    isSelected={selectedMapIds.includes(map.id)}
                    onToggle={toggleMap}
                  />
                ))}
                {!isLoading && maps.length === 0 && (
                  <div className="col-span-full border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
                    No competitive maps were returned for {gameConfig.label}.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex flex-col-reverse gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-10 border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10"
            disabled={step === 1 || creating}
            onClick={() => setStep((current) => Math.max(current - 1, 1))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {step < STEPS.length ? (
            <Button
              type="button"
              className="bg-rose-600 text-white hover:bg-rose-500"
              onClick={goNext}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={creating || !hasValidPool}
              onClick={createSession}
              className="h-10 bg-rose-600 px-4 text-sm text-white hover:bg-rose-500"
            >
              <Swords className="mr-2 h-4 w-4" />
              {creating ? "Creating room..." : "Create veto links"}
            </Button>
          )}
        </div>
      </section>
    </main>
  );
};

export default PublicMapVetoCreate;

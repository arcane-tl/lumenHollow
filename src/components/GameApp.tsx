import { useEffect, useRef, useState, type ReactNode } from "react";
import { Flag, Flame, House, LogOut, Map, Pause, Play, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuButtons } from "@/components/MenuButtons";
import { mountGame, type GameHandle } from "@/game/loop";
import { LEVELS } from "@/game/levels";
import { useGameStore } from "@/game/store";
import { formatTime, loadSave, scoresFor, SCORE_LIMIT } from "@/game/save";
import { previewRankList } from "@/game/scores";
import { fetchLevelScores, isCloudOn } from "@/game/cloud";
import { onHudTime } from "@/game/hudTime";
import { cn } from "@/lib/utils";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const overlay = useGameStore((s) => s.overlay);
  const ready = useGameStore((s) => s.ready);

  useEffect(() => {
    useGameStore.getState().applySave(loadSave());
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = mountGame(canvas);
    gameRef.current = handle;
    return () => {
      handle.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.code !== "KeyM") return;
      if (overlay === "score") return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      e.preventDefault();
      gameRef.current?.toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay]);

  const playing = overlay === "none" || overlay === "paused" || overlay === "dead" || overlay === "won" || overlay === "score";

  const begin = (id: number) => {
    gameRef.current?.startLevel(id);
    canvasRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="absolute inset-0 h-full w-full touch-none outline-none"
        style={{ touchAction: "none" }}
      />

      <div className="pointer-events-none absolute right-3 top-3 z-30 flex items-start gap-2">
        {playing && overlay === "none" && (
          <Button
            variant="outline"
            size="icon"
            className="pointer-events-auto size-11 border-border bg-bg/90"
            onClick={() => gameRef.current?.pause()}
            aria-label="Pause"
          >
            <Pause className="size-4" />
          </Button>
        )}
        <MuteButton onToggle={() => gameRef.current?.toggleMute()} />
      </div>

      {playing && <PlayHud />}

      {overlay === "none" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden items-end justify-center p-3 pb-3 md:flex">
          <ControlLegend />
        </div>
      )}

      {overlay === "title" && (
        <div className="absolute inset-0 z-20 flex flex-col bg-gradient-to-b from-transparent via-bg/25 to-bg/70 px-6 pb-10 pt-6">
          <div className="mx-auto mt-auto mb-auto w-full max-w-md">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">A dusk-wood platformer</p>
            <h1 className="mt-2 font-display text-5xl font-medium leading-none tracking-tight sm:text-6xl">
              Lumen Hollow
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Run, jump, and double-jump through mossy ruins. Light the lanterns. Reach the flag.
            </p>
            <MenuButtons
              items={[
                {
                  id: "play",
                  label: (
                    <>
                      <Play className="size-4" />
                      Play
                    </>
                  ),
                  onPick: () => begin(0),
                },
                { id: "levels", label: <MenuLabel icon={Map}>Levels</MenuLabel>, onPick: () => gameRef.current?.toSelect(), variant: "outline" },
                {
                  id: "scores",
                  label: (
                    <>
                      <Trophy className="size-4" />
                      High scores
                    </>
                  ),
                  onPick: () => gameRef.current?.toBoard(),
                  variant: "outline",
                },
              ]}
            />
            <div className="mt-6 flex justify-center">
              <ControlLegend />
            </div>
          </div>
        </div>
      )}

      {overlay === "select" && (
        <LevelSelect
          onPlay={begin}
          onBoard={() => gameRef.current?.toBoard()}
          onBack={() => gameRef.current?.toTitle()}
        />
      )}

      {overlay === "board" && <ScoreBoard onBack={() => gameRef.current?.toTitle()} />}

      {overlay === "paused" && (
        <PauseScreen
          onResume={() => gameRef.current?.resume()}
          onRestart={() => gameRef.current?.restart()}
          onMute={() => gameRef.current?.toggleMute()}
          onQuit={() => gameRef.current?.toTitle()}
        />
      )}

      {overlay === "dead" && (
        <DeadScreen
          onRespawn={() => gameRef.current?.respawn()}
          onRestart={() => gameRef.current?.restart()}
          onLevels={() => gameRef.current?.toSelect()}
          onQuit={() => gameRef.current?.toTitle()}
        />
      )}

      {overlay === "score" && <ArcadeEntry onSubmit={(name) => gameRef.current?.submitScore(name)} />}

      {overlay === "won" && (
        <WonScreen
          onNext={() => {
            const id = useGameStore.getState().levelId;
            gameRef.current?.startLevel(id + 1);
          }}
          onReplay={() => gameRef.current?.restart()}
          onBoard={() => gameRef.current?.toBoard()}
          onLevels={() => gameRef.current?.toSelect()}
          onTitle={() => gameRef.current?.toTitle()}
        />
      )}
    </div>
  );
}

function ArcadeEntry({ onSubmit }: { onSubmit: (name: string) => void }) {
  const save = useGameStore((s) => s.save);
  const levelId = useGameStore((s) => s.levelId);
  const coins = useGameStore((s) => s.coins);
  const total = useGameStore((s) => s.totalCoins);
  const time = useGameStore((s) => s.runTime);
  const [name, setName] = useState("");
  const [blink, setBlink] = useState(true);
  const nameRef = useRef(name);
  nameRef.current = name;
  const cloud = useGameStore((s) => s.cloudByLevel[levelId]);
  const boardSource = cloud ?? scoresFor(save, levelId);
  const rank = previewRankList(boardSource, coins, time);
  const trail = LEVELS[levelId]?.name ?? "Trail";

  useEffect(() => {
    const id = window.setInterval(() => setBlink((v) => !v), 420);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat && e.code !== "Backspace") return;
      if (e.code === "Enter") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onSubmit(nameRef.current);
        return;
      }
      if (e.code === "Backspace") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setName((s) => s.slice(0, -1));
        return;
      }
      if (e.key.length === 1 && /[a-zA-Z0-9 ._\-]/.test(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setName((s) => (s + e.key.toUpperCase()).slice(0, 12));
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onSubmit]);

  const board = [...boardSource];
  board.splice(rank - 1, 0, { name, coins, time, at: 0 });
  const rows = board.slice(0, SCORE_LIMIT);

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-bg/70 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">New high score</p>
        <h2 className="mt-1 font-display text-2xl leading-tight">{trail}</h2>
        <p className="mt-1 text-sm text-muted">
          Rank #{rank} · {coins}/{total} · {formatTime(time)}
        </p>
        <ol className="mt-4 font-sans text-sm">
          <li className="grid grid-cols-[2rem_1fr_4.5rem_5rem] gap-2 px-2 pb-1 text-[11px] uppercase tracking-wider text-muted">
            <span>#</span>
            <span>Name</span>
            <span className="text-right">Coins</span>
            <span className="text-right">Time</span>
          </li>
          {Array.from({ length: SCORE_LIMIT }, (_, i) => {
            const row = rows[i];
            const mine = i === rank - 1;
            return (
              <li
                key={row ? `${row.at}-${i}` : `empty-${i}`}
                className={cn(
                  "grid grid-cols-[2rem_1fr_4.5rem_5rem] items-baseline gap-2 rounded-md px-2 py-1.5 tabular-nums",
                  mine && "bg-accent/15 text-fg",
                  !mine && "text-muted",
                )}
              >
                <span>{i + 1}</span>
                <span className={cn("truncate tracking-wide", mine && "font-medium text-fg")}>
                  {mine ? (
                    <>
                      {name || ""}
                      <span className={cn("inline-block w-2", blink ? "opacity-100" : "opacity-0")}>_</span>
                    </>
                  ) : (
                    row?.name ?? "—"
                  )}
                </span>
                <span className="text-right">{row ? row.coins : "—"}</span>
                <span className="text-right">{row ? formatTime(row.time) : "—"}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-center text-xs tracking-wide text-muted">Type your name · Enter to save</p>
      </div>
    </div>
  );
}

function LevelSelect({
  onPlay,
  onBoard,
  onBack,
}: {
  onPlay: (id: number) => void;
  onBoard: () => void;
  onBack: () => void;
}) {
  const save = useGameStore((s) => s.save);
  const best = useGameStore((s) => s.best);
  const open = LEVELS;
  return (
    <div className="absolute inset-0 z-20 overflow-auto bg-bg/75 px-5 py-8 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-lg">
        <h2 className="font-display text-3xl">Levels</h2>
        <MenuButtons
          onCancel={onBack}
          items={[
            ...open.map((lvl) => {
              const lead = scoresFor(save, lvl.id)[0];
              return {
                id: `lvl-${lvl.id}`,
                label: (
                  <span className="flex w-full items-baseline justify-between gap-3">
                    <span className="font-display text-lg">{lvl.name}</span>
                    <span className="text-xs tabular-nums text-muted">
                      {lead
                        ? `${lead.coins}/${lvl.coins.length} · ${formatTime(lead.time)}`
                        : `Best ${best[lvl.id] ?? 0}/${lvl.coins.length}`}
                    </span>
                  </span>
                ),
                onPick: () => onPlay(lvl.id),
                variant: "outline" as const,
              };
            }),
            { id: "scores", label: "High scores", onPick: onBoard, variant: "outline" as const },
            { id: "back", label: "Back", onPick: onBack, variant: "outline" as const },
          ]}
        />
      </div>
    </div>
  );
}

function ScoreBoard({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save);
  const cloudByLevel = useGameStore((s) => s.cloudByLevel);
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState(isCloudOn() ? "Loading global board…" : "This device");
  const cloud = cloudByLevel[tab];
  const rows = cloud ?? scoresFor(save, tab);
  const trail = LEVELS[tab];

  useEffect(() => {
    if (!isCloudOn()) return;
    let live = true;
    setStatus("Loading global board…");
    void fetchLevelScores(tab).then((remote) => {
      if (!live) return;
      if (remote) {
        useGameStore.getState().patch({
          cloudByLevel: { ...useGameStore.getState().cloudByLevel, [tab]: remote },
        });
        setStatus("Global");
      } else {
        setStatus("Offline · this device");
      }
    });
    return () => {
      live = false;
    };
  }, [tab]);
  return (
    <div className="absolute inset-0 z-20 overflow-auto bg-bg/80 px-5 py-8 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-4xl">
        <h2 className="font-display text-3xl">High scores</h2>
        <p className="mt-2 text-sm text-muted">Coins first. Time breaks the tie. · {status}</p>
        <div className="mt-5 grid items-start gap-4 md:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)]">
          <MenuButtons
            align="start"
            className="mt-0"
            onCancel={onBack}
            onActive={(id) => {
              if (id.startsWith("tab-")) setTab(Number(id.slice(4)));
            }}
            items={[
              ...LEVELS.map((lvl) => ({
                id: `tab-${lvl.id}`,
                label: lvl.name,
                onPick: () => setTab(lvl.id),
                variant: (tab === lvl.id ? "default" : "outline") as "default" | "outline",
              })),
              { id: "back", label: "Back", onPick: onBack, variant: "outline" as const },
            ]}
          />
          <div>
            <p className="mb-2 font-display text-xl">{trail?.name ?? "Trail"}</p>
            <ol className="overflow-hidden rounded-xl border border-border bg-surface">
              {Array.from({ length: SCORE_LIMIT }, (_, i) => {
                const row = rows[i];
                return (
                  <li
                    key={row ? `${row.at}-${i}` : `empty-${i}`}
                    className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <span className="flex min-w-0 items-baseline gap-3">
                      <span className="w-6 tabular-nums text-sm text-muted">{i + 1}</span>
                      <span className="truncate font-display text-lg">{row?.name ?? "—"}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-sm text-muted">
                      {row ? `${row.coins} · ${formatTime(row.time)}` : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayHud() {
  const levelName = useGameStore((s) => s.levelName);
  const coins = useGameStore((s) => s.coins);
  const totalCoins = useGameStore((s) => s.totalCoins);
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start p-3 pr-28">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-bg/90 px-3 py-2">
        <span className="font-display text-sm text-muted">{levelName}</span>
        <span className="h-4 w-px bg-border" />
        <span className="font-medium tabular-nums">
          {coins}
          <span className="text-muted"> / {totalCoins}</span>
        </span>
        <span className="h-4 w-px bg-border" />
        <HudClock />
      </div>
    </header>
  );
}

function PauseScreen({
  onResume,
  onRestart,
  onMute,
  onQuit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onMute: () => void;
  onQuit: () => void;
}) {
  const levelName = useGameStore((s) => s.levelName);
  const runTime = useGameStore((s) => s.runTime);
  const muted = useGameStore((s) => s.muted);
  return (
    <Modal title="Paused" subtitle={`${levelName} · ${formatTime(runTime)}`}>
      <MenuButtons
        items={[
          { id: "resume", label: <MenuLabel icon={Play}>Resume</MenuLabel>, onPick: onResume },
          { id: "restart", label: <MenuLabel icon={RotateCcw}>Restart</MenuLabel>, onPick: onRestart },
          {
            id: "mute",
            label: muted ? <MenuLabel icon={Volume2}>Sound on</MenuLabel> : <MenuLabel icon={VolumeX}>Sound off</MenuLabel>,
            onPick: onMute,
          },
          { id: "quit", label: <MenuLabel icon={LogOut}>Quit</MenuLabel>, onPick: onQuit },
        ]}
      />
    </Modal>
  );
}

function DeadScreen({
  onRespawn,
  onRestart,
  onLevels,
  onQuit,
}: {
  onRespawn: () => void;
  onRestart: () => void;
  onLevels: () => void;
  onQuit: () => void;
}) {
  const deathReason = useGameStore((s) => s.deathReason);
  return (
    <Modal
      title={
        deathReason === "spike"
          ? "The spikes caught you"
          : deathReason === "arrow"
            ? "An arrow found you"
            : "The hollow took you"
      }
      subtitle="Respawn at your last lantern, or start the trail over."
    >
      <MenuButtons
        items={[
          { id: "respawn", label: <MenuLabel icon={Flame}>Respawn</MenuLabel>, onPick: onRespawn },
          { id: "restart", label: <MenuLabel icon={RotateCcw}>Restart level</MenuLabel>, onPick: onRestart },
          { id: "levels", label: <MenuLabel icon={Map}>Levels</MenuLabel>, onPick: onLevels },
          { id: "quit", label: <MenuLabel icon={LogOut}>Quit</MenuLabel>, onPick: onQuit },
        ]}
      />
    </Modal>
  );
}

function WonScreen({
  onNext,
  onReplay,
  onBoard,
  onLevels,
  onTitle,
}: {
  onNext: () => void;
  onReplay: () => void;
  onBoard: () => void;
  onLevels: () => void;
  onTitle: () => void;
}) {
  const levelName = useGameStore((s) => s.levelName);
  const coins = useGameStore((s) => s.coins);
  const totalCoins = useGameStore((s) => s.totalCoins);
  const runTime = useGameStore((s) => s.runTime);
  const lastRank = useGameStore((s) => s.lastRank);
  const levelId = useGameStore((s) => s.levelId);
  const hasNext = levelId < 9;
  return (
    <Modal
      title="The flag is yours"
      subtitle={
        lastRank
          ? `${levelName} · ${coins} / ${totalCoins} · ${formatTime(runTime)} · #${lastRank}`
          : `${levelName} · ${coins} / ${totalCoins} · ${formatTime(runTime)}`
      }
    >
      <MenuButtons
        items={[
          ...(hasNext
            ? [
                {
                  id: "next",
                  label: (
                    <MenuLabel icon={Flag}>Next trail</MenuLabel>
                  ),
                  onPick: onNext,
                },
              ]
            : []),
          {
            id: "replay",
            label: <MenuLabel icon={RotateCcw}>Replay</MenuLabel>,
            onPick: onReplay,
          },
          {
            id: "scores",
            label: <MenuLabel icon={Trophy}>High scores</MenuLabel>,
            onPick: onBoard,
          },
          { id: "levels", label: <MenuLabel icon={Map}>Levels</MenuLabel>, onPick: onLevels },
          { id: "title", label: <MenuLabel icon={House}>Title</MenuLabel>, onPick: onTitle },
        ]}
      />
    </Modal>
  );
}

function MenuLabel({ icon: Icon, children }: { icon: typeof Flag; children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Icon className="size-4 shrink-0" />
      <span>{children}</span>
    </span>
  );
}

function HudClock() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      onHudTime((_t, text) => {
        if (ref.current && ref.current.textContent !== text) ref.current.textContent = text;
      }),
    [],
  );
  return <span ref={ref} className="font-medium tabular-nums tracking-wide">0:00.00</span>;
}

function MuteButton({ onToggle }: { onToggle: () => void }) {
  const muted = useGameStore((s) => s.muted);
  return (
    <Button
      variant="outline"
      size="icon"
      className="pointer-events-auto size-11 border-border bg-bg/90"
      onClick={onToggle}
      aria-label={muted ? "Unmute" : "Mute"}
    >
      {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </Button>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-sm border border-border bg-surface px-1.5 text-[11px] font-medium tracking-wide text-fg">
      {children}
    </span>
  );
}

function ControlLegend() {
  return (
    <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-lg border border-border bg-bg/90 px-3 py-2 font-sans text-sm font-medium tracking-wide text-fg">
      <Kbd>←</Kbd>
      <Kbd>→</Kbd>
      <span>move</span>
      <span className="h-3 w-px shrink-0 bg-border" />
      <Kbd>Space</Kbd>
      <span>jump</span>
      <span className="font-normal text-muted">· A D W optional</span>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-bg/55 px-5 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        <h2 className="font-display text-2xl leading-tight">{title}</h2>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

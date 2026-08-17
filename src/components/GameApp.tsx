import { useEffect, useRef, useState, type ReactNode } from "react";
import { Flag, Flame, LogOut, Map, Pause, Play, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuButtons } from "@/components/MenuButtons";
import { TouchControls, useTouchPrimary } from "@/components/TouchControls";
import { mountGame, type GameHandle } from "@/game/loop";
import { LEVELS } from "@/game/levels";
import { useGameStore } from "@/game/store";
import { formatTime, loadSave, scoresFor, NAME_MAX, SCORE_LIMIT, type ScoreEntry } from "@/game/save";
import { previewRankList } from "@/game/scores";
import { fetchLevelScores, isCloudOn } from "@/game/cloud";
import { onHudTime } from "@/game/hudTime";
import { cn } from "@/lib/utils";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const overlay = useGameStore((s) => s.overlay);
  const ready = useGameStore((s) => s.ready);
  const touchPrimary = useTouchPrimary();

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
    if (overlay !== "score") return;
    const canvas = canvasRef.current;
    if (canvas && document.activeElement === canvas) canvas.blur();
  }, [overlay]);

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
        tabIndex={overlay === "score" ? -1 : 0}
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

      <TouchControls active={overlay === "none"} input={() => gameRef.current?.input} />

      {overlay === "none" && !touchPrimary && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden items-end justify-center p-3 pb-3 md:flex">
          <ControlLegend />
        </div>
      )}

      {overlay === "title" && (
        <div
          className={cn(
            "absolute inset-0 z-20 flex flex-col bg-gradient-to-b from-transparent via-bg/25 to-bg/70 pt-6",
            touchPrimary ? "px-4 pb-8" : "px-6 pb-10",
          )}
        >
          <div className="mx-auto mt-auto mb-auto w-full max-w-md">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">A dusk-wood platformer</p>
            <h1
              className={cn(
                "mt-2 font-display font-medium leading-none tracking-tight",
                touchPrimary ? "text-4xl" : "text-5xl sm:text-6xl",
              )}
            >
              Lumen Hollow
            </h1>
            <p className={cn("max-w-sm text-sm leading-relaxed text-muted", touchPrimary ? "mt-3" : "mt-4")}>
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
            <div className={cn("flex justify-center", touchPrimary ? "mt-4" : "mt-6")}>
              <ControlLegend touch={touchPrimary} />
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
          onQuit={() => gameRef.current?.toTitle()}
        />
      )}
    </div>
  );
}

function sanitizeName(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9 ._\-]/g, "").slice(0, NAME_MAX);
}

function ArcadeEntry({ onSubmit }: { onSubmit: (name: string) => void }) {
  const save = useGameStore((s) => s.save);
  const levelId = useGameStore((s) => s.levelId);
  const coins = useGameStore((s) => s.coins);
  const total = useGameStore((s) => s.totalCoins);
  const time = useGameStore((s) => s.runTime);
  const touch = useTouchPrimary();
  const [name, setName] = useState("");
  const nameRef = useRef(name);
  const fieldRef = useRef<HTMLInputElement>(null);
  const snapRef = useRef<{ source: ScoreEntry[]; rank: number } | null>(null);
  nameRef.current = name;
  const cloud = useGameStore((s) => s.cloudByLevel[levelId]);
  const liveSource = cloud ?? scoresFor(save, levelId);
  if (!snapRef.current) {
    snapRef.current = { source: liveSource, rank: previewRankList(liveSource, coins, time) };
  }
  const boardSource = snapRef.current.source;
  const rank = snapRef.current.rank;
  const trail = LEVELS[levelId]?.name ?? "Trail";

  useEffect(() => {
    if (touch) return;
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
        setName((s) => sanitizeName(s + e.key));
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onSubmit, touch]);

  const board = [...boardSource];
  board.splice(rank - 1, 0, { name, coins, time, at: 0 });
  const rows = board.slice(0, SCORE_LIMIT);

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 grid bg-bg/70 backdrop-blur-[2px]",
        touch ? "items-start overflow-y-auto px-3 pb-6 pt-16" : "place-items-center px-4",
      )}
    >
      <div
        className={cn(
          "w-full max-w-lg rounded-xl border border-border bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.4)]",
          touch ? "p-4" : "p-5",
        )}
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">New high score</p>
        <h2 className={cn("mt-1 font-display leading-tight", touch ? "text-xl" : "text-2xl")}>{trail}</h2>
        <p className="mt-1 text-sm text-muted">
          Rank #{rank} · {coins}/{total} · {formatTime(time)}
        </p>
        <ol className={cn("mt-4 font-sans", touch ? "text-[13px]" : "text-sm")}>
          <li
            className={cn(
              "grid grid-cols-[2rem_1fr_4.5rem_5rem] gap-2 px-2 pb-1 text-[11px] uppercase tracking-wider text-muted",
              touch && "grid-cols-[1.5rem_1fr_3.25rem_4.25rem] gap-1.5 px-1",
            )}
          >
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
                  touch && "grid-cols-[1.5rem_1fr_3.25rem_4.25rem] gap-1.5 px-1 py-1",
                  touch && mine && "relative min-h-11 items-center",
                  mine && "bg-accent/15 text-fg",
                  !mine && "text-muted",
                )}
              >
                {touch && mine && (
                  <input
                    ref={fieldRef}
                    name="arcade-name"
                    aria-label="High score name"
                    value={name}
                    maxLength={NAME_MAX}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    enterKeyHint="done"
                    inputMode="text"
                    className="absolute inset-0 z-10 m-0 h-full w-full border-0 p-0 outline-none"
                    style={{
                      fontSize: 16,
                      color: "transparent",
                      caretColor: "transparent",
                      WebkitAppearance: "none",
                      background: "transparent",
                    }}
                    onChange={(e) => setName(sanitizeName(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      onSubmit(nameRef.current);
                    }}
                  />
                )}
                <span>{i + 1}</span>
                <span
                  className={cn(
                    "tracking-wide",
                    !mine && "truncate",
                    mine && "font-medium text-fg",
                  )}
                >
                  {mine ? (
                    touch ? (
                      <span className="pointer-events-none">
                        {name}
                        <span className="arcade-blink inline-block w-2">_</span>
                      </span>
                    ) : (
                      <>
                        {name || ""}
                        <span className="arcade-blink inline-block w-2">_</span>
                      </>
                    )
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
  const touch = useTouchPrimary();
  const open = LEVELS;
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 overflow-auto bg-bg/75 backdrop-blur-sm",
        touch ? "px-4 py-14" : "px-5 py-8",
      )}
    >
      <div className="mx-auto w-full max-w-lg">
        <h2 className={cn("font-display", touch ? "text-2xl" : "text-3xl")}>Levels</h2>
        <MenuButtons
          onCancel={onBack}
          items={[
            ...open.map((lvl) => {
              const lead = scoresFor(save, lvl.id)[0];
              return {
                id: `lvl-${lvl.id}`,
                label: (
                  <span className="flex w-full items-baseline justify-between gap-3">
                    <span className={cn("font-display", touch ? "text-base" : "text-lg")}>{lvl.name}</span>
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
  const touch = useTouchPrimary();

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
    <div
      className={cn(
        "absolute inset-0 z-20 overflow-auto bg-bg/80 backdrop-blur-sm",
        touch ? "px-4 py-14" : "px-5 py-8",
      )}
    >
      <div className="mx-auto w-full max-w-4xl">
        <h2 className={cn("font-display", touch ? "text-2xl" : "text-3xl")}>High scores</h2>
        <p className="mt-2 text-sm text-muted">Coins first. Time breaks the tie. · {status}</p>
        <div className={cn("mt-5 grid items-start gap-4 md:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)]", touch && "mt-3 gap-3")}>
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
            <p className={cn("mb-2 font-display", touch ? "text-lg" : "text-xl")}>{trail?.name ?? "Trail"}</p>
            <ol className="overflow-hidden rounded-xl border border-border bg-surface">
              {Array.from({ length: SCORE_LIMIT }, (_, i) => {
                const row = rows[i];
                return (
                  <li
                    key={row ? `${row.at}-${i}` : `empty-${i}`}
                    className={cn(
                      "flex items-baseline justify-between gap-3 border-b border-border last:border-b-0",
                      touch ? "px-3 py-1.5" : "px-4 py-3",
                    )}
                  >
                    <span className="flex min-w-0 items-baseline gap-3">
                      <span className="w-6 tabular-nums text-sm text-muted">{i + 1}</span>
                      <span className={cn("truncate font-display", touch ? "text-base" : "text-lg")}>{row?.name ?? "—"}</span>
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
  onQuit,
}: {
  onNext: () => void;
  onReplay: () => void;
  onBoard: () => void;
  onLevels: () => void;
  onQuit: () => void;
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
          { id: "quit", label: <MenuLabel icon={LogOut}>Quit</MenuLabel>, onPick: onQuit },
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

function ControlLegend({ touch = false }: { touch?: boolean }) {
  if (touch) {
    return (
      <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-lg border border-border bg-bg/90 px-3 py-2 font-sans text-sm font-medium tracking-wide text-fg">
        On-screen arrows move · Jump on the right
      </div>
    );
  }
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
  const touch = useTouchPrimary();
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 grid place-items-center bg-bg/55 backdrop-blur-[2px]",
        touch ? "overflow-auto px-3 py-16" : "px-5",
      )}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-xl border border-border bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.4)]",
          touch ? "p-4" : "p-6",
        )}
      >
        <h2 className={cn("font-display leading-tight", touch ? "text-xl" : "text-2xl")}>{title}</h2>
        {subtitle && <p className={cn("text-sm leading-relaxed text-muted", touch ? "mt-1.5" : "mt-2")}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

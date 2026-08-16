export interface GameImages {
  sky: HTMLImageElement;
  far: HTMLImageElement;
  mid: HTMLImageElement;
  near: HTMLImageElement;
  idle: HTMLImageElement;
  run: HTMLImageElement;
  jump: HTMLImageElement;
  coin: HTMLImageElement;
  moss: HTMLImageElement;
  raft: HTMLImageElement;
  ground: HTMLImageElement;
  spikes: HTMLImageElement;
  checkpoint: HTMLImageElement;
  checkpointLit: HTMLImageElement;
  flag: HTMLImageElement;
  turret: HTMLImageElement;
  turretDown: HTMLImageElement;
  bolt: HTMLImageElement;
  stone: HTMLImageElement;
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export async function loadImages(): Promise<GameImages> {
  const [
    sky,
    far,
    mid,
    near,
    idle,
    run,
    jump,
    coin,
    moss,
    raft,
    ground,
    spikes,
    checkpoint,
    checkpointLit,
    flag,
    turret,
    turretDown,
    bolt,
    stone,
  ] = await Promise.all([
    load("/game/map/sky.png"),
    load("/game/map/far.png"),
    load("/game/map/mid.png"),
    load("/game/map/near.png"),
    load("/game/sprites/player-idle.png"),
    load("/game/sprites/player-run.png"),
    load("/game/sprites/player-jump.png"),
    load("/game/sprites/coin.png"),
    load("/game/sprites/platform-moss.png"),
    load("/game/sprites/platform-raft.png"),
    load("/game/sprites/platform-ground.png"),
    load("/game/sprites/spikes.png"),
    load("/game/sprites/checkpoint.png"),
    load("/game/sprites/checkpoint-lit.png"),
    load("/game/sprites/flag.png"),
    load("/game/sprites/turret.png"),
    load("/game/sprites/turret-down.png"),
    load("/game/sprites/bolt.png"),
    load("/game/sprites/platform-stone.png"),
  ]);
  return {
    sky,
    far,
    mid,
    near,
    idle,
    run,
    jump,
    coin,
    moss,
    raft,
    ground,
    spikes,
    checkpoint,
    checkpointLit,
    flag,
    turret,
    turretDown,
    bolt,
    stone,
  };
}

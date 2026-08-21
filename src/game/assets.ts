export interface GameImages {
  sky: HTMLImageElement;
  far: HTMLImageElement;
  mid: HTMLImageElement;
  near: HTMLImageElement;
  thornSky: HTMLImageElement;
  thornFar: HTMLImageElement;
  thornMid: HTMLImageElement;
  thornNear: HTMLImageElement;
  cinderSky: HTMLImageElement;
  cinderFar: HTMLImageElement;
  cinderMid: HTMLImageElement;
  cinderNear: HTMLImageElement;
  idle: HTMLImageElement;
  run: HTMLImageElement;
  jump: HTMLImageElement;
  coin: HTMLImageElement;
  moss: HTMLImageElement;
  raft: HTMLImageElement;
  ground: HTMLImageElement;
  wood: HTMLImageElement;
  woodGround: HTMLImageElement;
  iron: HTMLImageElement;
  ironGround: HTMLImageElement;
  spikes: HTMLImageElement;
  bramble: HTMLImageElement;
  checkpoint: HTMLImageElement;
  checkpointLit: HTMLImageElement;
  censer: HTMLImageElement;
  censerLit: HTMLImageElement;
  brazier: HTMLImageElement;
  brazierLit: HTMLImageElement;
  flag: HTMLImageElement;
  flagPole: HTMLImageElement;
  flagCloth: HTMLImageElement;
  turret: HTMLImageElement;
  turretDown: HTMLImageElement;
  cinderTurret: HTMLImageElement;
  bolt: HTMLImageElement;
  cinderBolt: HTMLImageElement;
  stone: HTMLImageElement;
  saw: HTMLImageElement;
  drip: HTMLImageElement;
  spout: HTMLImageElement;
  pipeRiser: HTMLImageElement;
  cap: HTMLImageElement;
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
    thornSky,
    thornFar,
    thornMid,
    thornNear,
    cinderSky,
    cinderFar,
    cinderMid,
    cinderNear,
    idle,
    run,
    jump,
    coin,
    moss,
    raft,
    ground,
    wood,
    woodGround,
    iron,
    ironGround,
    spikes,
    bramble,
    checkpoint,
    checkpointLit,
    censer,
    censerLit,
    brazier,
    brazierLit,
    flag,
    flagPole,
    flagCloth,
    turret,
    turretDown,
    cinderTurret,
    bolt,
    cinderBolt,
    stone,
    saw,
    drip,
    spout,
    pipeRiser,
    cap,
  ] = await Promise.all([
    load("/game/map/sky.png?v=hd3"),
    load("/game/map/far.png?v=hd3"),
    load("/game/map/mid.png?v=hd3"),
    load("/game/map/near.png?v=hd3"),
    load("/game/map/thorn-sky.png"),
    load("/game/map/thorn-far.png"),
    load("/game/map/thorn-mid.png"),
    load("/game/map/thorn-near.png"),
    load("/game/map/cinder-sky.png"),
    load("/game/map/cinder-far.png"),
    load("/game/map/cinder-mid.png"),
    load("/game/map/cinder-near.png"),
    load("/game/sprites/player-idle.png"),
    load("/game/sprites/player-run.png"),
    load("/game/sprites/player-jump.png"),
    load("/game/sprites/coin.png"),
    load("/game/sprites/platform-moss.png?v=hd2"),
    load("/game/sprites/platform-raft.png?v=hd2"),
    load("/game/sprites/platform-ground.png?v=hd2"),
    load("/game/sprites/platform-wood.png"),
    load("/game/sprites/platform-wood-ground.png"),
    load("/game/sprites/platform-iron.png"),
    load("/game/sprites/platform-iron-ground.png"),
    load("/game/sprites/spikes.png"),
    load("/game/sprites/bramble.png"),
    load("/game/sprites/checkpoint.png"),
    load("/game/sprites/checkpoint-lit.png"),
    load("/game/sprites/censer.png"),
    load("/game/sprites/censer-lit.png"),
    load("/game/sprites/brazier.png"),
    load("/game/sprites/brazier-lit.png"),
    load("/game/sprites/flag.png"),
    load("/game/sprites/flag-pole.png"),
    load("/game/sprites/flag-cloth.png?v=hoist1"),
    load("/game/sprites/turret.png"),
    load("/game/sprites/turret-down.png"),
    load("/game/sprites/turret-cinder.png"),
    load("/game/sprites/bolt.png"),
    load("/game/sprites/bolt-cinder.png"),
    load("/game/sprites/platform-stone.png"),
    load("/game/sprites/saw.png"),
    load("/game/sprites/drip.png"),
    load("/game/sprites/spout.png"),
    load("/game/sprites/pipe-riser.png"),
    load("/game/sprites/platform-cap.png"),
  ]);
  return {
    sky,
    far,
    mid,
    near,
    thornSky,
    thornFar,
    thornMid,
    thornNear,
    cinderSky,
    cinderFar,
    cinderMid,
    cinderNear,
    idle,
    run,
    jump,
    coin,
    moss,
    raft,
    ground,
    wood,
    woodGround,
    iron,
    ironGround,
    spikes,
    bramble,
    checkpoint,
    checkpointLit,
    censer,
    censerLit,
    brazier,
    brazierLit,
    flag,
    flagPole,
    flagCloth,
    turret,
    turretDown,
    cinderTurret,
    bolt,
    cinderBolt,
    stone,
    saw,
    drip,
    spout,
    pipeRiser,
    cap,
  };
}

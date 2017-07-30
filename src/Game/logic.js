//@flow
import SimplexNoise from "simplex-noise";

type GameState = *;

const allDirs = [0, 1, 2, 3];
const invDir = dir => (dir + 2) % 4;
const dirCompatibleWithTrackType = (dir, type) =>
  type === 2 ||
  (type === 0 && (dir === 0 || dir === 2)) ||
  (type === 1 && (dir === 1 || dir === 3));

const directionToTrackType = dir => {
  switch (dir) {
    case 0:
      return 0;
    case 2:
      return 0;
    case 1:
      return 1;
    case 3:
      return 1;
    default:
      return 2;
  }
};

const cellDir = ({ x, y }, dir) => {
  switch (dir) {
    case 0:
      x++;
      break;
    case 1:
      y++;
      break;
    case 2:
      x--;
      break;
    case 3:
      y--;
      break;
  }
  return { x, y };
};
const samePos = (a, b) => a.x === b.x && a.y === b.y;
const pickTrack = tracks => tracks[Math.floor(tracks.length * Math.random())];
const directionBetween = (a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 1 && dy === 0) return 0;
  if (dx === 0 && dy === 1) return 1;
  if (dx === -1 && dy === 0) return 2;
  if (dx === 0 && dy === -1) return 3;
  return -1;
};

const inRect = (base, track) =>
  base.x <= track.x &&
  track.x < base.x + base.w &&
  base.y <= track.y &&
  track.y < base.y + base.h;

function getLevels(game, entity, entityName) {
  const values = {};
  const levels = game.conf[entityName].levels;
  for (let l in levels) {
    values[l] = levels[l][entity.levels[l]];
  }
  return values;
}

function genLevels(nb, initV, aV, bV, initC, aC, bC) {
  const levels = [];
  let value = initV,
    upgrade = initC;
  for (let i = 0; i < nb; i++) {
    const l: any = {
      value:
        value < 1
          ? Math.round(value * 1000) / 1000
          : value < 10 ? Math.round(value * 10) / 10 : Math.round(value)
    };
    if (i < nb - 1) {
      l.upgrade = Math.round(upgrade);
    }
    levels.push(l);
    value = value * aV + bV;
    upgrade = upgrade * aC + bC;
  }
  return levels;
}

function genAttackLevel(startTime, level) {
  const duration = 60;
  const energy = Math.floor(100 * Math.pow(1.1, level));
  return {
    level,
    startTime,
    duration,
    energy
  };
}

function genMines(count, width, height) {
  return [
    {
      x: 1,
      y: 1,
      golds: 10000
    }
  ];
}

function genMarkets(count, width, height) {
  return [
    {
      x: 6,
      y: 0,
      golds: 0,
      energy: 0,
      levels: {
        goldCapacity: 0,
        energyCapacity: 0,
        trading: 0
      }
    }
  ];
}

export function create(
  width: number,
  height: number,
  difficulty: number
): GameState {
  const base = {
    x: Math.floor((width - 1) / 2),
    y: Math.floor((height - 1) / 2),
    w: 2,
    h: 2,
    levels: {
      capacity: 0
    }
  };
  const mines = [];
  const markets = [];
  const energyMap = new Uint8Array(width * height);
  const simplex = new SimplexNoise();

  const safeArea = {
    x: base.x - 2,
    y: base.y - 2,
    w: base.w + 4,
    h: base.h + 4
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = simplex.noise2D(x, y);
      energyMap[y * width + x] = Math.floor(256 * Math.pow((1 + n) / 2, 2));
      if (!inRect(safeArea, { x, y })) {
        if (n < -0.8) {
          markets.push({
            x,
            y,
            golds: 0,
            energy: 0,
            levels: {
              goldCapacity: 0,
              energyCapacity: 0,
              trading: 0
            }
          });
        } else if (n > 0.5) {
          mines.push({
            x,
            y,
            golds: 10000
          });
        }
      }
    }
  }

  const conf = {
    goldsIncrease: 0.2,
    energyDecrease: 0.5,
    train: {
      cost: 100,
      costPow: 1.8,
      levels: {
        consumption: genLevels(10, 1, 0.9, -0.04, 40, 1.25, 20),
        goldCapacity: genLevels(10, 10, 1.2, 5, 20, 1.5, 10),
        energyCapacity: genLevels(5, 10, 2, 10, 20, 2.5, 50)
      }
    },
    accumulator: {
      cost: 50,
      costPow: 1.4,
      levels: {
        capacity: genLevels(5, 20, 2, 10, 20, 3, 40)
      }
    },
    miner: {
      cost: 50,
      costPow: 2,
      levels: {
        speed: genLevels(10, 1, 1.4, 0, 20, 1.6, 5),
        capacity: genLevels(10, 20, 1.5, 10, 20, 1.2, 12),
        consumption: genLevels(10, 1, 0.9, -0.04, 40, 1.25, 20)
      }
    },
    market: {
      levels: {
        trading: genLevels(10, 0.1, 1.1, 0.01, 100, 1.6, 0),
        goldCapacity: genLevels(10, 100, 2, 0, 20, 2, 50),
        energyCapacity: genLevels(5, 100, 2, 0, 20, 2, 50)
      }
    },
    track: {
      cost: 2,
      costPow: 1.2
    },
    base: {
      levels: {
        capacity: genLevels(20, 1000, 1.4, 200, 200, 1.2, 200)
      }
    }
  };
  return {
    energyMap,
    tickRefreshRate: 500,
    tickIndex: 0,
    attackLevel: genAttackLevel(0, 0),
    createMode: null,
    opened: null,
    hoverCell: null,
    downAt: null,
    actionMenuOpened: false,
    state: "running",
    width,
    height,
    energy: 1000,
    golds: 250,
    conf,
    base,
    trains: [],
    tracks: [],
    accumulators: [],
    mines,
    miners: [],
    markets
  };
}

export function tick(previousState: GameState): GameState {
  if (previousState.energy === 0) return previousState;
  const g = { ...previousState };
  const { conf } = g;
  g.tickIndex++;
  const nextAttackTime = g.attackLevel.startTime + g.attackLevel.duration;
  if (nextAttackTime === g.tickIndex) {
    g.energy -= g.attackLevel.energy;
    g.attackLevel = genAttackLevel(g.tickIndex, g.attackLevel.level + 1);
  }
  g.golds += conf.goldsIncrease;
  g.energy -= conf.energyDecrease;
  const getTrackByPosition = pos => g.tracks.find(t => samePos(t, pos));
  g.mines = g.mines.slice(0);
  g.markets = g.markets.slice(0);
  g.miners = g.miners.map((miner, i) => {
    if (miner.paused) return miner;
    let mine = g.mines[miner.mineId];
    if (!mine) return miner;
    mine = { ...mine };
    miner = { ...miner };
    const lvls = getLevels(g, miner, "miner");
    const consumption = lvls.consumption.value;
    const max = lvls.capacity.value - miner.golds;
    const mined = Math.min(lvls.speed.value, max);
    miner.golds += mined;
    mine.golds -= mined;
    g.mines[miner.mineId] = mine;
    g.energy -= mined > 0 ? mined * consumption : 0;
    return miner;
  });
  g.accumulators = g.accumulators.map(accumulator => {
    const elec = 0.05 * g.energyMap[accumulator.x + g.width * accumulator.y];
    const lvls = getLevels(g, accumulator, "accumulator");
    const max = lvls.capacity.value - accumulator.energy;
    const energy = Math.min(elec, max);
    accumulator.energy += energy;
    return accumulator;
  });
  g.trains = g.trains.map((train, i) => {
    if (train.paused) return train;
    const track = g.tracks[train.trackId];
    if (!track) return train;
    train = { ...train };
    const lvls = getLevels(g, train, "train");
    const inBase = inRect(g.base, track);

    if (inBase) {
      const baseLvls = getLevels(g, g.base, "base");
      const energy = Math.min(train.energy, baseLvls.capacity.value - g.energy);
      g.energy += energy;
      train.energy -= energy;
      g.golds += train.golds;
      train.golds = 0;
    }

    const accumulator = g.accumulators.find(acc => samePos(track, acc));
    if (accumulator) {
      const max = lvls.energyCapacity.value - train.energy;
      const energy = Math.min(accumulator.energy, max);
      accumulator.energy -= energy;
      train.energy += energy;
    }

    allDirs.forEach(dir => {
      let market = g.markets.find(m => samePos(cellDir(track, dir), m));
      if (!market) return;
      const golds = Math.min(
        market.golds,
        lvls.goldCapacity.value - train.golds
      );
      const energy = Math.min(
        market.energy,
        lvls.energyCapacity.value - train.energy
      );
      const i = g.markets.indexOf(market);
      market = { ...market };
      market.golds -= golds;
      market.energy -= energy;
      train.golds += golds;
      train.energy += energy;
      g.markets[i] = market;
    });

    allDirs.forEach(dir => {
      let miner = g.miners.find(m =>
        samePos(cellDir(track, dir), g.mines[m.mineId])
      );
      if (!miner) return;
      const i = g.miners.indexOf(miner);
      const max = lvls.goldCapacity.value - train.golds;
      const mined = Math.min(miner.golds, max);
      if (mined <= 0) return;
      miner = { ...miner };
      miner.golds -= mined;
      train.golds += mined;
      g.miners[i] = miner;
    });

    let nextTrack;
    if (track.type === 2) {
      const choices = [];
      allDirs.forEach(dir => {
        if (dir === invDir(train.dir)) return;
        const pos = cellDir(track, dir);
        const t = getTrackByPosition(pos);
        if (!t) return;
        if (!dirCompatibleWithTrackType(dir, t.type)) return;
        choices.push({ track: t, dir });
      });
      const choice = pickTrack(choices);
      if (choice) {
        nextTrack = choice.track;
        train.dir = choice.dir;
      }
    } else {
      const t = getTrackByPosition(cellDir(track, train.dir));
      if (t && dirCompatibleWithTrackType(train.dir, t.type)) {
        nextTrack = t;
      }
    }
    if (!nextTrack) {
      train.dir = invDir(train.dir);
    } else {
      train.trackId = g.tracks.indexOf(nextTrack);
      const energy = lvls.consumption.value;
      g.energy -= energy;
    }
    return train;
  });

  if (g.energy <= 0) {
    g.energy = 0;
    g.state = "gameover";
    return g;
  }
  return g;
}

function upgrade(
  state: GameState,
  id: number,
  entityName: string,
  collectionName: string,
  level: string
): GameState {
  const g = { ...state };
  g[collectionName] = g[collectionName].slice(0);
  const o = { ...g[collectionName][id] };
  const lvls = getLevels(g, o, entityName);
  const cost = lvls[level].upgrade;
  if (cost) {
    if (cost <= g.golds) {
      o.levels = { ...o.levels };
      g.golds -= cost;
      o.levels[level]++;
      g[collectionName][id] = o;
      return g;
    }
  }
  return state;
}

export function upgradeTrain(
  state: GameState,
  id: number,
  level: string
): GameState {
  return upgrade(state, id, "train", "trains", level);
}

export function upgradeMiner(
  state: GameState,
  id: number,
  level: string
): GameState {
  return upgrade(state, id, "miner", "miners", level);
}

export function upgradeAccumulator(
  state: GameState,
  id: number,
  level: string
): GameState {
  return upgrade(state, id, "accumulator", "accumulators", level);
}

export function upgradeMarket(
  state: GameState,
  id: number,
  level: string
): GameState {
  return upgrade(state, id, "market", "markets", level);
}

export function upgradeBase(state: GameState, level: string): GameState {
  const g = { ...state };
  const base = { ...g.base };
  const lvls = getLevels(g, base, "base");
  const cost = lvls[level].upgrade;
  if (cost) {
    if (cost <= g.golds) {
      base.levels = { ...base.levels };
      g.golds -= cost;
      base.levels[level]++;
      g.base = base;
      return g;
    }
  }
  return state;
}

export function tradeMarket(
  state: GameState,
  id: number,
  currency: string,
  amount: number
): GameState {
  const g = { ...state };
  if (g[currency] < amount) return state;
  const market = { ...g.markets[id] };
  g.markets = g.markets.slice(0);
  g.markets[id] = market;
  const lvls = getLevels(g, market, "market");
  const otherCur = currency === "golds" ? "energy" : "golds";
  const value = Math.floor(
    Math.min(
      amount,
      (lvls[currency === "golds" ? "energyCapacity" : "goldCapacity"].value -
        market[otherCur]) /
        lvls.trading.value
    )
  );
  g[currency] -= value;
  market[otherCur] += value * lvls.trading.value;
  return g;
}

export const createMode = (state: GameState, createMode: ?string) => ({
  ...state,
  createMode
});

export function getCost(
  state: GameState,
  entityName: string,
  collectionName: string
): number {
  const cf = state.conf[entityName];
  let cost = cf.cost;
  const nbOfItems = state[collectionName].length;
  cost = Math.round(cost * Math.pow(cf.costPow, nbOfItems));
  return cost;
}

export const affordable = (state: GameState, cost: number) =>
  cost <= state.golds;

export function getCostIfCanBuy(
  state: GameState,
  entityName: string,
  collectionName: string
): ?number {
  const cost = getCost(state, entityName, collectionName);
  if (affordable(state, cost)) return cost;
  return null;
}

function addTrackIfPossible(state: GameState, track: *): ?GameState {
  const g = { ...state };
  if (
    g.mines.find(m => samePos(m, track)) ||
    g.tracks.find(m => samePos(m, track)) ||
    g.markets.find(m => samePos(m, track))
  ) {
    return;
  }
  const cost = getCostIfCanBuy(g, "track", "tracks");
  if (cost && cost <= g.golds) {
    g.tracks = g.tracks.concat(track);
    g.golds -= cost;
    return g;
  }
}

function addTrainIfPossible(state: GameState, trackId: number): ?GameState {
  const g = { ...state };
  const cost = getCostIfCanBuy(g, "train", "trains");
  if (cost && cost <= g.golds) {
    let train = g.trains.find(t => !g.tracks[t.trackId]);
    const track = g.tracks[trackId];
    if (!track) return;
    const dir = track.type === 0 ? 0 : 1;
    if (train) {
      // zombie train available, attach on new track
      const i = g.trains.indexOf(train);
      train = { ...train, trackId, dir };
      g.trains = g.trains.slice(0);
      g.trains[i] = train;
    } else {
      train = {
        trackId,
        dir,
        golds: 0,
        energy: 0,
        levels: {
          consumption: 0,
          goldCapacity: 0,
          energyCapacity: 0
        }
      };
      g.trains = g.trains.concat(train);
      g.golds -= cost;
    }
    return g;
  }
}

function addAccumulatorIfPossible(state, pos) {
  const g = { ...state };
  if (
    g.mines.find(m => samePos(m, pos)) ||
    g.accumulators.find(m => samePos(m, pos)) ||
    g.markets.find(m => samePos(m, pos))
  ) {
    return;
  }
  const cost = getCostIfCanBuy(g, "accumulator", "accumulators");
  if (cost && cost <= g.golds) {
    g.accumulators = g.accumulators.concat({
      ...pos,
      energy: 0,
      levels: {
        capacity: 0
      }
    });
    g.golds -= cost;
    return g;
  }
}
function addMinerIfPossible(state, pos) {
  const g = { ...state };
  const mine = g.mines.find(m => samePos(m, pos));
  if (!mine) {
    return;
  }
  const mineId = g.mines.indexOf(mine);
  if (g.miners.find(m => m.mineId === mineId)) {
    return;
  }
  const cost = getCostIfCanBuy(g, "miner", "miners");
  if (cost && cost <= g.golds) {
    g.miners = g.miners.concat({
      mineId,
      golds: 0,
      levels: {
        speed: 0,
        consumption: 0,
        capacity: 0
      }
    });
    g.golds -= cost;
    return g;
  }
}

export function mouseDown(g: GameState, downAt: *): GameState {
  if (g.createMode === "track" && !g.tracks.find(t => samePos(t, downAt))) {
    const track = { ...downAt, type: 2 };
    const maybeNewGame = addTrackIfPossible(g, track);
    if (maybeNewGame) {
      g = maybeNewGame;
    }
  }
  return {
    ...g,
    downAt,
    actionMenuOpened: false,
    hoverCell: downAt
  };
}

export function mouseMove(g: GameState, hoverCell: *): GameState {
  if (g.hoverCell && hoverCell && samePos(g.hoverCell, hoverCell)) {
    // mouse didn't changed
    return g;
  }
  if (g.downAt) {
    if (g.createMode === "track") {
      const existingTrack = g.tracks.find(t => samePos(t, hoverCell));
      const previousTrack = g.tracks.find(t => samePos(t, g.hoverCell));
      let trackFrom, trackTo;
      if (!existingTrack) {
        const type = directionToTrackType(
          directionBetween(g.hoverCell, hoverCell)
        );
        const track = {
          ...hoverCell,
          type
        };
        const maybeNewGame = addTrackIfPossible(g, track);
        if (maybeNewGame) {
          g = maybeNewGame;
          trackFrom = previousTrack;
          trackTo = track;
        }
      } else {
        trackFrom = existingTrack;
        trackTo = previousTrack;
      }
      if (
        trackFrom &&
        trackTo &&
        trackFrom.type !== trackTo.type &&
        trackFrom.type !== 2
      ) {
        const i = g.tracks.indexOf(trackFrom);
        g.tracks = g.tracks.slice(0);
        g.tracks[i] = { ...trackFrom, type: 2 };
      }
    } else if (g.createMode === "accumulator") {
      const maybeNewGame = addAccumulatorIfPossible(g, g.hoverCell);
      if (maybeNewGame) {
        g = maybeNewGame;
      }
    } else if (g.createMode === "destroyTrack") {
      const existingTrack = g.tracks.find(t => samePos(t, hoverCell));
      if (existingTrack) {
        const i = g.tracks.indexOf(existingTrack);
        g.tracks = g.tracks.slice(0);
        g.tracks.splice(i, 1);
      }
    }
  }
  return {
    ...g,
    hoverCell
  };
}

export function mouseUp(g: GameState): GameState {
  g = { ...g };
  const isCellClick = g.downAt && g.hoverCell && samePos(g.hoverCell, g.downAt);
  if (isCellClick) {
    let track = g.tracks.find(t => samePos(t, g.hoverCell));
    const trackId = track ? g.tracks.indexOf(track) : -1;
    const train = track && g.trains.find(t => t.trackId === trackId);
    const market = g.markets.find(t => samePos(t, g.hoverCell));
    const accumulator = g.accumulators.find(t => samePos(t, g.hoverCell));
    const mine = g.mines.find(t => samePos(t, g.hoverCell));
    const mineId = mine ? g.mines.indexOf(mine) : -1;
    const miner = g.miners.find(t => t.mineId === mineId);
    const inBase = inRect(g.base, g.hoverCell);
    if (g.createMode === "destroyTrack") {
      if (track) {
        g.tracks = g.tracks.slice(0);
        g.tracks.splice(trackId, 1);
      }
    } else if (g.createMode === "accumulator") {
      const maybeNewGame = addAccumulatorIfPossible(g, g.hoverCell);
      if (maybeNewGame) {
        g = maybeNewGame;
        g.createMode = null;
      }
    } else if (g.createMode === "miner") {
      const maybeNewGame = addMinerIfPossible(g, g.hoverCell);
      if (maybeNewGame) {
        g = maybeNewGame;
        g.createMode = null;
      }
    } else if (g.createMode === "train") {
      const maybeNewGame = addTrainIfPossible(g, trackId);
      if (maybeNewGame) {
        g = maybeNewGame;
        g.createMode = null;
      }
    } else if (train) {
      g.createMode = null;
      g.opened = {
        type: "train",
        id: g.trains.indexOf(train)
      };
    } else if (market) {
      g.createMode = null;
      g.opened = {
        type: "market",
        id: g.markets.indexOf(market)
      };
    } else if (accumulator) {
      g.createMode = null;
      g.opened = {
        type: "accumulator",
        id: g.accumulators.indexOf(accumulator)
      };
    } else if (miner) {
      g.createMode = null;
      g.opened = {
        type: "miner",
        id: g.miners.indexOf(miner)
      };
    } else if (mine) {
      g.createMode = null;
      g.opened = {
        type: "mine",
        id: g.mines.indexOf(mine)
      };
    } else if (inBase && (!g.opened || g.opened.type !== "base")) {
      g.opened = {
        type: "base"
      };
    } else if (track) {
      if (!g.createMode || g.createMode === "track") {
        g.tracks = g.tracks.slice(0);
        track = { ...track };
        track.type = (track.type + 1) % 3;
        g.tracks[trackId] = track;
      }
    } else {
      if (!inBase) {
        g.opened = null;
      }
    }
  }
  g.downAt = null;
  return g;
}

export function mouseLeave(state: GameState): GameState {
  return { ...state, downAt: null, hoverCell: null };
}

export const close = (state: GameState): GameState => ({
  ...state,
  opened: null,
  actionMenuOpened: false
});

export const open = (state: GameState, opened: *): GameState => ({
  ...state,
  createMode: null,
  actionMenuOpened: false,
  opened
});

export const closeActionMenu = (state: GameState): GameState => ({
  ...state,
  opened: null,
  createMode: null,
  actionMenuOpened: false
});

export const openActionMenu = (state: GameState): GameState => ({
  ...state,
  opened: null,
  createMode: null,
  actionMenuOpened: true
});

//@flow
import React, { Component, PureComponent } from "react";
import "./UI.css";
import { affordable, getCost } from "./logic";
import KeyHandler from "react-key-handler";

class EnergyIcon extends Component {
  render() {
    return (
      <span role="img" aria-label="energy">
        ⚡️
      </span>
    );
  }
}
class GoldIcon extends Component {
  render() {
    return (
      <span role="img" aria-label="gold">
        💰
      </span>
    );
  }
}

class Bar extends PureComponent {
  static defaultProps = {
    color: "#fc3",
    bg: "#960"
  };
  render() {
    const { value, max, height, color, bg, noText } = this.props;
    const p = value / max;
    const valueStyle: { [_: *]: * } = {
      display: "inline-block",
      position: "absolute",
      fontSize: (height || 16) - 4 + "px",
      padding: "2px",
      whiteSpace: "nowrap"
    };
    if (p < 0.3) {
      valueStyle.left = "100%";
      valueStyle.color = color;
    } else {
      valueStyle.right = "0px";
      valueStyle.color = bg;
    }
    return (
      <div style={{ height: height || "100%", background: bg }}>
        <div
          style={{
            width: (100 * p).toFixed(2) + "%",
            height: height || "100%",
            background: color,
            position: "relative"
          }}
        >
          {noText
            ? null
            : <span style={valueStyle}>
                {(100 * p).toFixed(0) + "%"}
              </span>}
        </div>
      </div>
    );
  }
}

class Upgrade extends Component {
  render() {
    const { level, levelInfo, onClick } = this.props;
    const style = {
      display: "inline-block",
      fontWeight: "bold",
      fontSize: "10px",
      width: "30px",
      textAlign: "right",
      whiteSpace: "nowrap"
    };
    return (
      <div style={{ padding: "0 0.2em" }}>
        <span style={{ fontSize: "12px" }}>
          L{level + 1}
        </span>
        {levelInfo.upgrade
          ? <Button onClick={onClick}>
              <span style={style}>
                <GoldIcon /> {levelInfo.upgrade}
              </span>
            </Button>
          : <div style={style}>MAX</div>}
      </div>
    );
  }
}

class Field extends Component {
  render() {
    const {
      label,
      description,
      level,
      value,
      format,
      levelInfo,
      onUpgrade
    } = this.props;
    return (
      <div
        title={description}
        style={{
          padding: "2px 10px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center"
        }}
      >
        <div style={{ whiteSpace: "nowrap", width: "35%" }}>
          {label}:
        </div>
        <div style={{ flex: 1, marginRight: 10 }}>
          {levelInfo && value !== undefined
            ? <Bar value={value} max={levelInfo.value} height={16} />
            : <div style={{ textAlign: "center" }}>
                {levelInfo
                  ? format === "percent"
                    ? (levelInfo.value * 100).toFixed(0) + "%"
                    : levelInfo.value
                  : value}
              </div>}
        </div>
        <div>
          {levelInfo
            ? <Upgrade
                onClick={onUpgrade}
                level={level}
                levelInfo={levelInfo}
              />
            : null}
        </div>
      </div>
    );
  }
}

function getLevels(game, entity, entityName) {
  const values = {};
  const levels = game.conf[entityName].levels;
  for (let l in levels) {
    values[l] = levels[l][entity.levels[l]];
  }
  return values;
}

class OpenedTrain extends Component {
  render() {
    const { game, opened: { id }, action } = this.props;
    const train = game.trains[id];
    const lvls = getLevels(game, train, "train");
    return (
      <div>
        <h2>
          Train {id + 1}
        </h2>
        <p className="description">
          A Train follow the Tracks to convey <GoldIcon /> and <EnergyIcon /> to
          Base. It loads <EnergyIcon />
          when under an Accumulator, <GoldIcon /> when nearby a Mine. It unloads
          when on the Base.
        </p>
        <div className="improvments">
          <Field
            label={
              <span>
                <EnergyIcon /> consumption
              </span>
            }
            levelInfo={lvls.consumption}
            onUpgrade={() => action("upgradeTrain", id, "consumption")}
            level={train.levels.consumption}
          />
          <Field
            label={
              <span>
                <EnergyIcon /> capacity
              </span>
            }
            value={train.energy}
            levelInfo={lvls.energyCapacity}
            onUpgrade={() => action("upgradeTrain", id, "energyCapacity")}
            level={train.levels.energyCapacity}
          />
          <Field
            label={
              <span>
                <GoldIcon /> capacity
              </span>
            }
            value={train.golds}
            levelInfo={lvls.goldCapacity}
            onUpgrade={() => action("upgradeTrain", id, "goldCapacity")}
            level={train.levels.goldCapacity}
          />
        </div>
      </div>
    );
  }
}

class OpenedMiner extends Component {
  render() {
    const { game, opened: { id }, action } = this.props;
    const miner = game.miners[id];
    const mine = game.mines[miner.mineId];
    const lvls = getLevels(game, miner, "miner");
    return (
      <div>
        <h2>
          Miner {id + 1}
        </h2>
        {mine
          ? <p>
              <GoldIcon /> {mine.golds.toFixed(0)} to mine.
            </p>
          : null}
        <div className="improvments">
          <Field
            label="🍕 speed"
            levelInfo={lvls.speed}
            onUpgrade={() => action("upgradeMiner", id, "speed")}
            level={miner.levels.speed}
          />
          <Field
            label={
              <span>
                <EnergyIcon /> consumption
              </span>
            }
            levelInfo={lvls.consumption}
            onUpgrade={() => action("upgradeMiner", id, "consumption")}
            level={miner.levels.consumption}
          />
          <Field
            label={
              <span>
                <GoldIcon /> capacity
              </span>
            }
            value={miner.golds}
            levelInfo={lvls.capacity}
            onUpgrade={() => action("upgradeMiner", id, "capacity")}
            level={miner.levels.capacity}
          />
        </div>
      </div>
    );
  }
}

class OpenedMine extends Component {
  render() {
    const { game, opened: { id } } = this.props;
    const mine = game.mines[id];
    return (
      <div>
        <h2>
          Mine {id + 1}
        </h2>
        <div className="description">
          This is a Gold Mine, add a <strong>M</strong>iner to mine it.
        </div>
        <p>
          <GoldIcon /> {mine.golds.toFixed(0)} to mine.
        </p>
      </div>
    );
  }
}

class OpenedBase extends Component {
  render() {
    const { game, action } = this.props;
    const lvls = getLevels(game, game.base, "base");
    return (
      <div>
        <h2>Base</h2>
        <div className="description">
          This is your Base. Trains unload the conveyed <GoldIcon /> and{" "}
          <EnergyIcon /> when they pass on it.
        </div>
        <div className="improvments">
          <Field
            label={
              <span>
                <EnergyIcon /> Power
              </span>
            }
            description="Do Not Run Out Of POWER !!!"
            value={game.energy}
            levelInfo={lvls.capacity}
            onUpgrade={() => action("upgradeBase", "capacity")}
            level={game.base.levels.capacity}
          />
        </div>
      </div>
    );
  }
}

class OpenedAccumulator extends Component {
  render() {
    const { game, opened: { id }, action } = this.props;
    const accumulator = game.accumulators[id];
    const lvls = getLevels(game, accumulator, "accumulator");
    return (
      <div>
        <h2>
          Accumulator {id + 1}
        </h2>
        <div className="improvments">
          <Field
            label={
              <span>
                <EnergyIcon /> capacity
              </span>
            }
            value={accumulator.energy}
            levelInfo={lvls.capacity}
            onUpgrade={() => action("upgradeAccumulator", id, "capacity")}
            level={accumulator.levels.capacity}
          />
        </div>
      </div>
    );
  }
}

class OpenedMarket extends Component {
  render() {
    const { game, opened: { id }, action } = this.props;
    const market = game.markets[id];
    const lvls = getLevels(game, market, "market");
    const currencyLabels = { energy: <EnergyIcon />, golds: <GoldIcon /> };
    return (
      <div>
        <h2>
          Market {id + 1}
        </h2>
        <div className="description">
          Trade <EnergyIcon /> and <GoldIcon />. Train must collect them.
        </div>
        <div className="improvments">
          <Field
            label="trading rate"
            description="Improve your negotiation skills to get better offers"
            levelInfo={lvls.trading}
            onUpgrade={() => action("upgradeMarket", id, "trading")}
            level={market.levels.trading}
          />
          <Field
            label={
              <span>
                <EnergyIcon /> capacity
              </span>
            }
            value={market.energy}
            levelInfo={lvls.energyCapacity}
            onUpgrade={() => action("upgradeTrain", id, "energyCapacity")}
            level={market.levels.energyCapacity}
          />
          <Field
            label={
              <span>
                <GoldIcon /> capacity
              </span>
            }
            value={market.golds}
            levelInfo={lvls.goldCapacity}
            onUpgrade={() => action("upgradeTrain", id, "goldCapacity")}
            level={market.levels.goldCapacity}
          />
        </div>
        <br />
        {["energy", "golds"].map(currency =>
          <div key={currency}>
            <strong>
              BUY {
                currencyLabels[currency === "energy" ? "golds" : "energy"]
              }{" "}
              for{" "}
            </strong>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-around"
              }}
            >
              {[10, 50, 100, 500, 1000].map(amount =>
                <Button
                  key={amount}
                  onClick={() => action("tradeMarket", id, currency, amount)}
                  disabled={!affordable(game, amount)}
                >
                  {currencyLabels[currency]} {amount}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
}

class GeneralHelp extends PureComponent {
  render() {
    return (
      <div>
        <p>
          Goal: survive ENERGY ATTACKs by collecting energy to your base; never{" "}
          <strong>run out of power</strong>.
        </p>
        <h3>Getting Started</h3>
        <ul>
          <li>
            Place <strong>A</strong>ccumulator to capture falling energy.
          </li>
          <li>
            Add <strong>R</strong>ail to connect it to a train. Train conveys
            the energy to the Base.
          </li>
          <li>
            Add <strong>M</strong>iner to a Mine (dark sphere) and make the
            train passing nearby. Train conveys mined golds to the Base.
          </li>
        </ul>

        <p>
          Improve train/miner/accumulator capabilities by clicking on them and
          buying extensions... Add more trains and rails...{" "}
          <strong>click the objects to get more info.</strong>
        </p>
      </div>
    );
  }
}

class Start extends Component {
  render() {
    return (
      <div>
        <h2>
          <strong>The Cube</strong>
          <em>
            {" "}by <a href="https://twitter.com/greweb">@greweb</a>
          </em>
        </h2>
        <GeneralHelp />
      </div>
    );
  }
}

class Help extends Component {
  render() {
    return (
      <div>
        <h2>Help</h2>
        <GeneralHelp />
      </div>
    );
  }
}

class GameOver extends Component {
  restart = () => this.props.action("restart");
  render() {
    return (
      <div>
        <h2>Game Over</h2>
        <p>
          <strong>Running out of power...</strong>
        </p>
        <Button onClick={this.restart}>RESTART</Button>
      </div>
    );
  }
}

const OpenedComps = {
  train: OpenedTrain,
  miner: OpenedMiner,
  mine: OpenedMine,
  base: OpenedBase,
  accumulator: OpenedAccumulator,
  market: OpenedMarket,
  start: Start,
  help: Help,
  gameOver: GameOver
};
const OpenedCompsNonClosable = {
  gameOver: true
};

class Opened extends Component {
  close = () => this.props.action("close");
  render() {
    const { game: { opened } } = this.props;
    const Comp = OpenedComps[opened.type];
    return Comp
      ? <div className="layer">
          <div className="clickout" onClick={this.close} />
          <div className="popup">
            {OpenedCompsNonClosable[opened.type]
              ? null
              : <div className="close" onClick={this.close}>
                  X
                </div>}
            <div className="body">
              <Comp opened={opened} {...this.props} />
            </div>
          </div>
        </div>
      : null;
  }
}

class Button extends Component {
  render() {
    const { active, disabled, onClick, children, triggerKey } = this.props;
    return (
      <span
        className={[
          "btn",
          disabled ? "disabled" : "",
          active ? "active" : ""
        ].join(" ")}
        onClick={onClick}
      >
        {triggerKey
          ? <KeyHandler
              keyEventName="keyup"
              keyValue={triggerKey.toLowerCase()}
              onKeyHandle={onClick}
            />
          : null}
        {children}
      </span>
    );
  }
}

class CreateModeButton extends Component {
  render() {
    const { game, action, id, ...rest } = this.props;
    return game.createMode === id
      ? <Button
          triggerKey={modeLetters[id]}
          active
          onClick={() => action("createMode", null)}
          {...rest}
        />
      : <Button
          triggerKey={modeLetters[id]}
          onClick={() => action("createMode", id)}
          {...rest}
        />;
  }
}

const modeLetters = {
  help: "H",
  train: "T",
  track: "R",
  destroyTrack: "D",
  miner: "M",
  accumulator: "A"
};

class ActionMenuGeneral extends Component {
  render() {
    const { game, action } = this.props;
    const Buyable = ({ label, id }) => {
      const cost = getCost(game, id, id + "s");
      return (
        <CreateModeButton
          game={game}
          action={action}
          id={id}
          disabled={!affordable(game, cost)}
        >
          <strong>{label[0]}</strong>
          {label.slice(1)} (<GoldIcon /> {cost})
        </CreateModeButton>
      );
    };
    return (
      <div className="action-menu-general">
        <Button onClick={() => action("open", { type: "help" })}>Help</Button>
        <div className="sep" />
        <CreateModeButton game={game} action={action} id="destroyTrack">
          <strong>D</strong>estroy Rail
        </CreateModeButton>
        <div className="sep" />
        <Buyable label="Rail" id="track" />
        <Buyable label="Train" id="train" />
        <Buyable label="Miner" id="miner" />
        <Buyable label="Accu." id="accumulator" />
      </div>
    );
  }
}

class ActionMenu extends Component {
  state = {
    opened: false
  };
  open = () => {
    this.props.action("openActionMenu");
  };
  close = () => {
    this.props.action("closeActionMenu");
  };
  render() {
    const { game, action } = this.props;
    const { actionMenuOpened, createMode } = game;
    return (
      <div className={"action-menu " + (actionMenuOpened ? "opened" : "")}>
        <div className="body">
          <ActionMenuGeneral game={game} action={action} />
        </div>
        <div
          className="opener"
          onClick={actionMenuOpened ? this.close : this.open}
        >
          {modeLetters[createMode] || "+"}
        </div>
      </div>
    );
  }
}

class MainBar extends Component {
  render() {
    const { game } = this.props;
    return (
      <div className="main-bar">
        <div className="resources">
          <span className="energy">
            <EnergyIcon />
            {" " + game.energy.toFixed(0)}
          </span>
          <span className="golds">
            <GoldIcon />
            {" " + game.golds.toFixed(0)}
          </span>
        </div>
        <div className="energy-attack-bar">
          <Bar
            value={game.tickIndex - game.attackLevel.startTime}
            max={game.attackLevel.duration}
            noText
            bg="#a00"
            color="#f33"
          />
          <span className="energy-attack-text">
            NEXT ENERGY ATTACK (level {game.attackLevel.level})
          </span>
        </div>
      </div>
    );
  }
}

export default class UI extends PureComponent {
  render() {
    const { game, action } = this.props;
    return (
      <div className="ui">
        <ActionMenu game={game} action={action} />
        {game.opened ? <Opened game={game} action={action} /> : null}
        <MainBar game={game} />
      </div>
    );
  }
}

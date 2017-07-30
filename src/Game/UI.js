//@flow
import React, { Component, PureComponent } from "react";
import "./UI.css";
import { affordable, getCost } from "./logic";

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
          ? <div style={{ ...style, cursor: "pointer" }} onClick={onClick}>
              💰{levelInfo.upgrade}
            </div>
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
        <div style={{ width: "30%" }}>
          {label}
        </div>
        <div style={{ flex: 1 }}>
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
        <Field
          label="⚡️ consumption"
          levelInfo={lvls.consumption}
          onUpgrade={() => action("upgradeTrain", id, "consumption")}
          level={train.levels.consumption}
        />
        <Field
          label="⚡️ capacity"
          value={train.energy}
          levelInfo={lvls.energyCapacity}
          onUpgrade={() => action("upgradeTrain", id, "energyCapacity")}
          level={train.levels.energyCapacity}
        />
        <Field
          label="💰 capacity"
          value={train.golds}
          levelInfo={lvls.goldCapacity}
          onUpgrade={() => action("upgradeTrain", id, "goldCapacity")}
          level={train.levels.goldCapacity}
        />
      </div>
    );
  }
}

class OpenedMiner extends Component {
  render() {
    const { game, opened: { id }, action } = this.props;
    const miner = game.miners[id];
    const lvls = getLevels(game, miner, "miner");
    return (
      <div>
        <h2>
          Miner {id + 1}
        </h2>
        <Field
          label="🍕 speed"
          levelInfo={lvls.speed}
          onUpgrade={() => action("upgradeMiner", id, "speed")}
          level={miner.levels.speed}
        />
        <Field
          label="⚡️ consumption"
          levelInfo={lvls.consumption}
          onUpgrade={() => action("upgradeMiner", id, "consumption")}
          level={miner.levels.consumption}
        />
        <Field
          label="💰 capacity"
          value={miner.golds}
          levelInfo={lvls.capacity}
          onUpgrade={() => action("upgradeMiner", id, "capacity")}
          level={miner.levels.capacity}
        />
      </div>
    );
  }
}

class OpenedMine extends Component {
  render() {
    const { game, opened: { id }, action } = this.props;
    const mine = game.mines[id];
    return (
      <div>
        <h2>
          Mine {id + 1}
        </h2>
        <div>This is a gold mine, add a miner here to start mining it.</div>
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
        <Field
          label="⚡️ Power"
          description="Do Not Run Out Of POWER !!!"
          value={game.energy}
          levelInfo={lvls.capacity}
          onUpgrade={() => action("upgradeBase", "capacity")}
          level={game.base.levels.capacity}
        />
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
        <Field
          label="⚡️ capacity"
          value={accumulator.energy}
          levelInfo={lvls.capacity}
          onUpgrade={() => action("upgradeAccumulator", id, "capacity")}
          level={accumulator.levels.capacity}
        />
      </div>
    );
  }
}

class OpenedMarket extends Component {
  render() {
    const { game, opened: { id }, action } = this.props;
    const market = game.markets[id];
    const lvls = getLevels(game, market, "market");
    const currencyLabels = { energy: "⚡️", golds: "💰" };
    return (
      <div>
        <h2>
          Market {id + 1}
        </h2>
        <Field
          label="trading rate"
          description="Improve your negotiation skills to get better offers"
          levelInfo={lvls.trading}
          onUpgrade={() => action("upgradeMarket", id, "trading")}
          level={market.levels.trading}
        />
        <Field
          label="⚡️ capacity"
          value={market.energy}
          levelInfo={lvls.energyCapacity}
          onUpgrade={() => action("upgradeTrain", id, "energyCapacity")}
          level={market.levels.energyCapacity}
        />
        <Field
          label="💰 capacity"
          value={market.golds}
          levelInfo={lvls.goldCapacity}
          onUpgrade={() => action("upgradeTrain", id, "goldCapacity")}
          level={market.levels.goldCapacity}
        />
        <br />
        {["energy", "golds"].map(currency =>
          <div
            key={currency}
            style={{
              margin: "5px",
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-around"
            }}
          >
            <span style={{ whiteSpace: "nowrap" }}>
              buy {
                currencyLabels[currency === "energy" ? "golds" : "energy"]
              }{" "}
              for{" "}
            </span>
            {[10, 50, 100, 500, 1000].map(amount =>
              <Button
                key={amount}
                onClick={() => action("tradeMarket", id, currency, amount)}
                disabled={!affordable(game, amount)}
              >
                {currencyLabels[currency]}
                {amount}
              </Button>
            )}
          </div>
        )}
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
  market: OpenedMarket
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
            <div className="close" onClick={this.close}>
              X
            </div>
            <Comp opened={opened} {...this.props} />
          </div>
        </div>
      : null;
  }
}

class Button extends Component {
  render() {
    const { active, disabled, onClick, children } = this.props;
    return (
      <span
        className={[
          "btn",
          disabled ? "disabled" : "",
          active ? "active" : ""
        ].join(" ")}
        onClick={onClick}
      >
        {children}
      </span>
    );
  }
}

class CreateModeButton extends Component {
  render() {
    const { game, action, id, ...rest } = this.props;
    return game.createMode === id
      ? <Button active onClick={() => action("createMode", null)} {...rest} />
      : <Button onClick={() => action("createMode", id)} {...rest} />;
  }
}

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
          {label} (💰{cost})
        </CreateModeButton>
      );
    };
    return (
      <div className="action-menu-general">
        <CreateModeButton game={game} action={action} id="destroyTrack">
          Destroy Rail
        </CreateModeButton>
        <div className="sep" />
        <Buyable label="Rail" id="track" />
        <Buyable label="Train" id="train" />
        <Buyable label="Miner" id="miner" />
        <Buyable label="Acc." id="accumulator" />
      </div>
    );
  }
}

// TODO
class SpeedControl extends Component {
  render() {
    return null;
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
    const opened = game.actionMenuOpened;
    return (
      <div className={"action-menu " + (opened ? "opened" : "")}>
        <div className="body">
          {opened ? <ActionMenuGeneral game={game} action={action} /> : null}
        </div>
        <div className="opener" onClick={opened ? this.close : this.open}>
          +
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
            {"⚡️ " + game.energy.toFixed(0)}
          </span>
          <span className="golds">
            {"💰 " + game.golds.toFixed(0)}
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
    const { game, action, width, height } = this.props;
    return (
      <div className="ui">
        <ActionMenu game={game} action={action} />
        {game.opened ? <Opened game={game} action={action} /> : null}
        <MainBar game={game} />
      </div>
    );
  }
}

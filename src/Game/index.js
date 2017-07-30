import React, { Component } from "react";
import raf from "raf";
import * as GameLogic from "./logic";
import "./index.css";

let { default: RenderDebug } = require("./RenderDebug");
let { default: Render } = require("./Render");
let { default: UI } = require("./UI");

if (module.hot) {
  module.hot.accept("./RenderDebug", () => {
    RenderDebug = require("./RenderDebug").default;
  });
  module.hot.accept("./Render", () => {
    Render = require("./Render").default;
  });
  module.hot.accept("./UI", () => {
    UI = require("./UI").default;
  });
}

class GameComponent extends Component {
  state = {
    game: GameLogic.create(12, 12, 0)
  };

  componentDidMount() {
    let lastT;
    let tickD = 0;
    const loop = t => {
      this._raf = raf(loop);
      if (!lastT) lastT = t;
      const dt = Math.min(t - lastT, 100);
      lastT = t;
      tickD += dt;
      const { game } = this.state;
      const overflow = tickD - game.tickRefreshRate;
      if (overflow >= 0) {
        tickD = overflow;
        this.setState({
          game: GameLogic.tick(game)
        });
      }
    };
    this._raf = raf(loop);
  }

  action = (name, ...value) => {
    const { game } = this.state;
    const newGameState = GameLogic[name](game, ...value);
    if (newGameState !== game) {
      this.setState({ game: newGameState });
    }
  };

  render() {
    const { game } = this.state;
    const { debug } = this.props;
    const width = 500;
    const height = 500;
    const GameRender = debug ? RenderDebug : Render;
    return (
      <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
        {debug
          ? <div style={{ width, height }} className="game">
              <GameRender
                game={game}
                action={this.action}
                width={width}
                height={height}
              />
              <UI
                game={game}
                action={this.action}
                width={width}
                height={height}
              />
            </div>
          : null}
        <div style={{ width, height }} className="game">
          <Render
            game={game}
            action={this.action}
            width={width}
            height={height}
          />
          <UI game={game} action={this.action} width={width} height={height} />
        </div>
      </div>
    );
  }
}

export default GameComponent;

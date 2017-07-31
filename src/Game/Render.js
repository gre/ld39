//@flow
import React, { Component } from "react";
import createREGL from "regl";
import renderShader from "./shaders/render";
import mat3 from "gl-mat3";
import vec3 from "gl-vec3";

function threshold(value, limit) {
  if (Math.abs(value) < limit) return 0;
  return value;
}

const ObjectFlag = {
  NOTHING: 0,
  MINE: 1,
  ACCUMULATOR: 2,
  MARKET: 3
};

class Game extends Component {
  onRef = (canvas: *) => {
    this.canvas = canvas;
  };

  rot = mat3.create();
  origin = null;
  mouseDown = null;
  keys = {};

  _pos = e => {
    const rect = this.canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  pos = e => {
    const { canvas, origin } = this;
    const rect = canvas.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    const uv = [
      2 * aspect * (e.clientX - rect.left) / rect.width - 1,
      1 - 2 * (e.clientY - rect.top) / rect.height,
      2.5
    ];
    const direction = vec3.create();
    vec3.transformMat3(direction, uv, this.rot);
    if (direction[1] >= 0) return null;
    const k = -origin[1] / direction[1];
    const x = origin[0] + k * direction[0];
    const z = origin[2] + k * direction[2];
    const { game } = this.props;

    const pos = {
      x: Math.floor(x * game.width / 8),
      y: Math.floor((8 - z) * game.height / 8)
    };
    return pos.x < 0 || pos.y < 0 || pos.x >= game.width || pos.y >= game.height
      ? null
      : pos;
  };

  onMouseDown = (e: *) => {
    e.preventDefault();
    //this.mouseAt = this.mouseDown = this._pos(e);
    this.props.action("mouseDown", this.pos(e));
  };
  onMouseMove = (e: *) => {
    //this.mouseAt = this._pos(e);
    this.props.action("mouseMove", this.pos(e));
  };
  onMouseUp = () => {
    //this.mouseDown = null;
    this.props.action("mouseUp");
  };
  onMouseLeave = () => {
    //this.mouseDown = null;
    this.props.action("mouseLeave");
  };

  onKeyUp = e => {
    this.keys[e.which] = 0;
  };
  onKeyDown = e => {
    this.keys[e.which] = 1;
  };
  componentDidMount() {
    const { canvas, rot } = this;
    const { game, width, height } = this.props;
    for (let k = 0; k < 500; k++) {
      this.keys[k] = 0;
    }
    document.body.addEventListener("keyup", this.onKeyUp);
    document.body.addEventListener("keydown", this.onKeyDown);
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    const regl = createREGL(gl);
    let render = renderShader(regl);
    const mapSize = 12;
    const energyMap = regl.texture();
    const dataMap = regl.texture();
    const dataMapData = new Uint8Array(game.width * game.height * 4);

    const origin = [4, 12, 1];
    this.origin = origin;
    let rotX = -1.4;
    let rotY = 0;
    let debugPlaneOn = false;
    let debugPlaneY = 0;
    let debugStepping = 0.1;

    if (module.hot) {
      module.hot.accept("./shaders/render", () => {
        render = require("./shaders/render")(regl);
      });
    }

    let stateAtMouseDown;
    let previousButtons3Pressed = false;

    regl.frame(({ time }) => {
      const { mouseDown, mouseAt, keys } = this;
      const { game } = this.props;

      // filling the game data
      // data format:
      // r: the track infos
      // g: the object type on this cell
      // b: miner object (g is already the mine)
      // a: train object type
      if (dataMapData.fill) {
        dataMapData.fill(0);
      } else {
        for (let i = 0; i < dataMapData.length; i++) {
          dataMapData[i] = 0;
        }
      }
      const arrayIndex = (x, y) => 4 * (x + game.width * y);
      game.tracks.forEach(({ x, y, type }) => {
        let drawLeft = 0,
          drawDown = 0,
          drawUp = 0,
          drawRight = 0;
        if (type === 2) {
          const left = game.tracks.find(t => t.x === x - 1 && t.y === y);
          const right = game.tracks.find(t => t.x === x + 1 && t.y === y);
          const up = game.tracks.find(t => t.x === x && t.y + 1 === y);
          const down = game.tracks.find(t => t.x === x && t.y - 1 === y);
          if (up && up.type !== 0) drawUp = 1;
          if (down && down.type !== 0) drawDown = 1;
          if (left && left.type !== 1) drawLeft = 1;
          if (right && right.type !== 1) drawRight = 1;
        }
        dataMapData[arrayIndex(x, y)] =
          (1 << 7) |
          (type << 5) |
          (drawUp << 4) |
          (drawRight << 3) |
          (drawDown << 2) |
          (drawLeft << 1);
      });
      game.trains.forEach(t => {
        const track = game.tracks[t.trackId];
        if (!track) return;
        dataMapData[arrayIndex(track.x, track.y) + 3] = (t.dir << 6) | 1;
      });
      game.mines.forEach(mine => {
        dataMapData[arrayIndex(mine.x, mine.y) + 1] = ObjectFlag.MINE << 5;
      });
      // miners override mines because we know there is a mine anyway
      game.miners.forEach(miner => {
        const mine = game.mines[miner.mineId];
        if (!mine) return;
        dataMapData[arrayIndex(mine.x, mine.y) + 2] = 1 << 7;
      });
      game.accumulators.forEach(a => {
        dataMapData[arrayIndex(a.x, a.y) + 1] = ObjectFlag.ACCUMULATOR << 5;
      });
      game.markets.forEach(m => {
        dataMapData[arrayIndex(m.x, m.y) + 1] = ObjectFlag.MARKET << 5;
      });

      if (mouseDown && !stateAtMouseDown) {
        stateAtMouseDown = { rotX, rotY };
      } else if (!mouseDown && stateAtMouseDown) {
        stateAtMouseDown = null;
      }

      let move = [0, 0, 0];

      // keyboard
      /*
      const keyUpDelta =
        (keys[38] || keys[87] || keys[90]) - (keys[40] || keys[83]);
      const keyRightDelta =
        (keys[39] || keys[68]) - (keys[37] || keys[65] || keys[81]);
      if (keys[18]) {
        rotY += 0.03 * keyRightDelta;
        rotX += 0.02 * keyUpDelta;
      } else {
        if (keys[16]) {
          move[1] += 0.1 * keyUpDelta;
          move[0] += 0.1 * keyRightDelta;
        } else {
          rotY += 0.03 * keyRightDelta;
          move[2] += 0.1 * keyUpDelta;
        }
      }
      */

      // mouse
      if (mouseDown) {
        rotY = stateAtMouseDown.rotY - 0.005 * (mouseAt[0] - mouseDown[0]);
        rotX = stateAtMouseDown.rotX + 0.005 * (mouseAt[1] - mouseDown[1]);
      }

      // gamepads
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      if (gamepads[0]) {
        const { axes, buttons } = gamepads[0];
        if (axes.length >= 2) {
          move[0] += 0.06 * threshold(axes[0], 0.2);
          move[2] -= 0.06 * threshold(axes[1], 0.2);
        }
        if (axes.length >= 4) {
          rotY += 0.02 * threshold(axes[2], 0.2);
          rotX += 0.02 * threshold(axes[3], 0.2);
        }
        if (buttons.length > 7) {
          debugPlaneY += 0.02 * (buttons[12].value - buttons[13].value);
          move[1] += 0.05 * (buttons[7].value - buttons[6].value);
          const steppingDelta = buttons[15].value - buttons[14].value;
          if (steppingDelta !== 0) {
            const steppingSpeed = 1 - 0.01;
            if (steppingDelta > 0) {
              debugStepping *= steppingSpeed;
            } else {
              debugStepping /= steppingSpeed;
            }
          }
          if (buttons[3].pressed !== previousButtons3Pressed) {
            previousButtons3Pressed = buttons[3].pressed;
            if (previousButtons3Pressed) {
              debugPlaneOn = !debugPlaneOn;
            }
          }
        }
      }

      // prettier-ignore
      mat3.multiply(rot, [
        1, 0, 0,
        0, Math.cos(rotX), Math.sin(rotX),
        0, -Math.sin(rotX), Math.cos(rotX)
      ], [
        Math.cos(rotY), 0, Math.sin(rotY),
        0, 1, 0,
        -Math.sin(rotY), 0, Math.cos(rotY)
      ]);
      mat3.transpose(rot, rot);
      const vector = vec3.create();
      vec3.transformMat3(vector, move, rot);
      vec3.add(origin, origin, vector);

      /*
      origin[0] = Math.min(Math.max(0.6, origin[0]), mapSize);
      origin[1] = Math.min(Math.max(0.6, origin[1]), mapSize);
      origin[2] = Math.min(Math.max(0.6, origin[2]), mapSize);
      */

      energyMap({
        width: game.width,
        height: game.height,
        data: game.energyMap,
        format: "luminance"
      });

      dataMap({
        data: dataMapData,
        width: game.width,
        height: game.height
      });

      regl.clear({
        color: [0, 0, 0, 0],
        depth: 1
      });
      render({
        time,
        energyMap,
        dataMap,
        rot,
        debugPlaneY,
        debugPlaneOn,
        debugStepping,
        size: [game.width, game.height],
        aspect: width / height,
        origin,
        base: [game.base.x, game.base.y, game.base.w, game.base.h],
        mouse: (!game.hoverCell
          ? [250, 250]
          : [game.hoverCell.x, game.hoverCell.y]).concat(
          !game.mouseAt ? [250, 250] : [game.mouseAt.x, game.mouseAt.y]
        ),
        color: [
          Math.cos(time * 0.1),
          Math.sin(time * 0.8),
          Math.cos(time * 0.3),
          1
        ]
      });
    });
  }
  render() {
    const { width, height } = this.props;
    const dpr = window.devicePixelRatio || 1;
    return (
      <canvas
        ref={this.onRef}
        width={dpr * width}
        height={dpr * height}
        style={{ width, height }}
        onMouseDown={this.onMouseDown}
        onMouseUp={this.onMouseUp}
        onMouseMove={this.onMouseMove}
        onMouseLeave={this.onMouseLeave}
      />
    );
  }
}

export default Game;

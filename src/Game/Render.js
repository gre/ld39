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

class Game extends Component {
  onRef = (canvas: *) => {
    this.canvas = canvas;
  };

  mouseDown = null;
  keys = {};

  pos = e => {
    const rect = this.canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  onMouseDown = e => {
    this.mouseAt = this.mouseDown = this.pos(e);
  };
  onMouseMove = e => {
    this.mouseAt = this.pos(e);
  };
  onMouseUp = () => {
    this.mouseDown = null;
  };
  onMouseLeave = () => {
    this.mouseDown = null;
  };
  onKeyUp = e => {
    this.keys[e.which] = 0;
  };
  onKeyDown = e => {
    this.keys[e.which] = 1;
  };
  componentDidMount() {
    const { width, height } = this.props;
    for (let k = 0; k < 500; k++) {
      this.keys[k] = 0;
    }
    document.body.addEventListener("keyup", this.onKeyUp);
    document.body.addEventListener("keydown", this.onKeyDown);
    const { canvas } = this;
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    const regl = createREGL(gl);
    const rot = mat3.create();
    let render = renderShader(regl);
    const mapSize = 12;
    let energyMap = regl.texture();

    const origin = [1, 1, 1];
    let rotX = 0;
    let rotY = Math.PI / 4;
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

      energyMap({
        width: game.width,
        height: game.height,
        data: game.energyMap,
        format: "luminance"
      });

      if (mouseDown && !stateAtMouseDown) {
        stateAtMouseDown = { rotX, rotY };
      } else if (!mouseDown && stateAtMouseDown) {
        stateAtMouseDown = null;
      }

      /*
      // some test
      const x = Math.floor(origin[0]);
      const y = Math.floor(origin[2]);
      if (x >= 0 && y >= 0 && x < 32 && y < 32) {
        map.subimage(
          {
            width: 1,
            height: 1,
            data: [0, 0, 0, 0]
          },
          x,
          y
        );
      }
      */

      let move = [0, 0, 0];

      // keyboard
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
      origin[0] = Math.min(Math.max(0.6, origin[0]), mapSize);
      origin[1] = Math.min(Math.max(0.6, origin[1]), mapSize);
      origin[2] = Math.min(Math.max(0.6, origin[2]), mapSize);

      regl.clear({
        color: [0, 0, 0, 0],
        depth: 1
      });
      render({
        time,
        energyMap,
        rot,
        debugPlaneY,
        debugPlaneOn,
        debugStepping,
        size: [game.width, game.height],
        aspect: width / height,
        origin,
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
    const dpr = 1; //window.devicePixelRatio || 1;
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

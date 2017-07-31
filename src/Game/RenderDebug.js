//@flow
import React, { Component, PureComponent } from "react";

class Market extends PureComponent {
  render() {
    return (
      <g transform={`translate(0,0)`}>
        <rect width={1} height={1} fill="#93c" />
      </g>
    );
  }
}
class Accumulator extends PureComponent {
  render() {
    const { accumulator } = this.props;
    return (
      <g>
        <circle cx={0.5} cy={0.5} r={0.4} fill="#abc" opacity={0.8} />
        <text
          x={0.5}
          y={0.5}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize={0.3}
          fill="#000"
        >
          {accumulator.energy.toFixed(0)}
        </text>
      </g>
    );
  }
}
class Mine extends PureComponent {
  render() {
    const { mine } = this.props;
    return (
      <g transform={`translate(0,0)`}>
        <rect width={1} height={1} fill="#333" />
        <text
          x={0.5}
          y={0.5}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize={0.2}
          opacity={0.6}
          fill="#fc3"
        >
          {mine.golds.toFixed(0)}
        </text>
      </g>
    );
  }
}
class Miner extends PureComponent {
  render() {
    const { miner } = this.props;
    return (
      <g transform={`translate(0.05,0.05)`}>
        <rect
          width={0.9}
          height={0.9}
          fill="transparent"
          strokeWidth={0.1}
          stroke="#fc3"
        />
        <text
          x={0.5}
          y={0.7}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize={0.2}
          fill="#fc3"
        >
          {miner.golds.toFixed(0)}
        </text>
      </g>
    );
  }
}

class Track extends Component {
  render() {
    const { tracks, track: { x, y, type } } = this.props;

    switch (type) {
      case 0:
        return (
          <g transform={`translate(0,0.45)`}>
            <rect width={1} height={0.1} fill="#553322" />
          </g>
        );
      case 1:
        return (
          <g transform={`translate(0.45,0)`}>
            <rect width={0.1} height={1} fill="#553322" />
          </g>
        );
      default:
        const left = tracks.find(t => t.x === x - 1 && t.y === y);
        const right = tracks.find(t => t.x === x + 1 && t.y === y);
        const up = tracks.find(t => t.x === x && t.y + 1 === y);
        const down = tracks.find(t => t.x === x && t.y - 1 === y);
        return (
          <g>
            <circle cx={0.5} cy={0.5} r={0.12} fill="#553322" />
            {up && up.type !== 0
              ? <rect x={0.45} y={0} width={0.1} height={0.5} fill="#553322" />
              : null}
            {down && down.type !== 0
              ? <rect
                  x={0.45}
                  y={0.5}
                  width={0.1}
                  height={0.5}
                  fill="#553322"
                />
              : null}
            {left && left.type !== 1
              ? <rect y={0.45} x={0} width={0.5} height={0.1} fill="#553322" />
              : null}
            {right && right.type !== 1
              ? <rect
                  y={0.45}
                  x={0.5}
                  width={0.5}
                  height={0.1}
                  fill="#553322"
                />
              : null}
          </g>
        );
    }
  }
}

class Train extends PureComponent {
  render() {
    const { train } = this.props;
    const rot = train.dir * 90;
    return (
      <g transform={`translate(0.5, 0.5) rotate(${rot}) translate(-0.5, -0.5)`}>
        <rect x={0.05} y={0.25} width={0.6} height={0.5} fill="red" />
        <circle cx={0.65} cy={0.5} r={0.25} fill="red" />
      </g>
    );
  }
}

class Base extends PureComponent {
  render() {
    const { base } = this.props;
    return <rect width={base.w} height={base.h} fill="rgba(50,200,250,0.4)" />;
  }
}

class RenderDebug extends Component {
  pos = (e: *) => {
    const { game, width, height } = this.props;
    const rect = this.refs.root.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {
      x: Math.floor(game.width * x / width),
      y: Math.floor(game.height * y / height)
    };
  };
  onMouseDown = (e: *) => {
    this.props.action("mouseDown", this.pos(e));
  };
  onMouseMove = (e: *) => {
    this.props.action("mouseMove", this.pos(e));
  };
  onMouseUp = () => {
    this.props.action("mouseUp");
  };
  onMouseLeave = () => {
    this.props.action("mouseLeave");
  };
  render() {
    const { game, width, height } = this.props;
    const cellW = width / game.width;
    const cellH = height / game.height;
    const Cell = ({ x, y, children }) =>
      <g
        transform={`scale(${cellW.toFixed(3)},${cellH.toFixed(
          3
        )}) translate(${x},${y})`}
      >
        {children}
      </g>;
    return (
      <svg
        width={width}
        height={height}
        ref="root"
        onMouseMove={this.onMouseMove}
        onMouseDown={this.onMouseDown}
        onMouseUp={this.onMouseUp}
        onMouseLeave={this.onMouseLeave}
      >
        <rect fill="#eee" width={width} height={height} />
        {/*[...game.energyMap].map((v, i) => {
          const x = i % game.width;
          const y = (i - x) / game.width;
          return (
            <Cell key={i} x={x} y={y}>
              <circle cx={0.5} cy={0.5} r={v/20} fill="#fff" opacity={1} />
            </Cell>
          );
        })*/}
        {game.tracks.map((track, i) =>
          <Cell key={i} x={track.x} y={track.y}>
            <Track id={i} tracks={game.tracks} track={track} />
          </Cell>
        )}
        {game.trains.map((train, i) => {
          const track = game.tracks[train.trackId];
          if (!track) return null;
          return (
            <Cell key={i} x={track.x} y={track.y}>
              <Train id={i} train={train} />
            </Cell>
          );
        })}
        {game.mines.map((mine, i) =>
          <Cell key={i} x={mine.x} y={mine.y}>
            <Mine id={i} mine={mine} />
          </Cell>
        )}
        {game.miners.map((miner, i) => {
          const mine = game.mines[miner.mineId];
          if (!mine) return null;
          return (
            <Cell key={i} x={mine.x} y={mine.y}>
              <Miner id={i} miner={miner} />
            </Cell>
          );
        })}
        {game.markets.map((market, i) =>
          <Cell key={i} x={market.x} y={market.y}>
            <Market id={i} market={market} />
          </Cell>
        )}
        {game.accumulators.map((accumulator, i) =>
          <Cell key={i} x={accumulator.x} y={accumulator.y}>
            <Accumulator id={i} accumulator={accumulator} />
          </Cell>
        )}
        <Cell x={game.base.x} y={game.base.y}>
          <Base base={game.base} />
        </Cell>
        {game.hoverCell
          ? <Cell {...game.hoverCell}>
              <rect width={1} height={1} fill="#000" opacity={0.1} />
            </Cell>
          : null}
      </svg>
    );
  }
}

export default RenderDebug;

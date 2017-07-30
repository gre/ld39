const GLSL = require("./GLSL");

module.exports = regl =>
  regl({
    frag: GLSL`
precision highp float;
uniform vec4 color;
uniform float time;
uniform float aspect;
uniform bool debugPlaneOn;
uniform float debugPlaneY;
uniform float debugStepping;
uniform mat3 rot;
varying vec2 uv;
uniform vec4 mouse;
uniform vec4 base;
uniform sampler2D energyMap;
uniform sampler2D dataMap;
uniform vec2 size;
uniform vec3 origin;

#define NEAR_CLIPPING_PLANE 0.1
#define FAR_CLIPPING_PLANE 120.0
#define NUMBER_OF_MARCH_STEPS 100
#define EPSILON 0.02
#define DISTANCE_BIAS 0.6

float fmod(float a, float b) {
  return (a<0.0) ? b - mod(abs(a), b) : mod(a, b);
}
float smin(float a, float b, float k) {
  float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
  return mix( b, a, h ) - k*h*(1.0-h);
}

float sdCappedCylinder(vec3 p, vec2 h) {
  vec2 d = abs(vec2(length(p.xz),p.y)) - h;
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float sdSphere(vec3 p, float s) {
  return length(p) - s;
}
float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}
float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}
float udRoundBox(vec3 p, vec3 b, float r) {
  return length(max(abs(p)-b,0.0))-r;
}

float opU(float d1, float d2) {
  return min(d1,d2);
}
vec2 opU(vec2 d1, vec2 d2) {
  if (d1.x < d2.x) {
    return d1;
  }
  return d2;
}
vec2 opUs(float k, vec2 d1, vec2 d2) {
  float v = smin(d1.x, d2.x, k);
  if (d1.x < d2.x) {
    return vec2(v, d1.y);
  }
    return vec2(v, d2.y);
}
float opS(float d1, float d2) {
  return max(-d1,d2);
}
float opI(float d1, float d2) {
  return max(d1,d2);
}
vec3 opRep(inout vec3 p, vec3 c) {
  vec3 m = mod(p, c);
  vec3 id = (p - m) / c;
  p = m - 0.5 * c;
  return id;
}
vec4 texture2DOrBlack(in sampler2D s, vec2 uv) {
  return step(0.0, uv.x) *
    step(0.0, uv.y) *
    step(uv.x, 1.0) *
    step(uv.y, 1.0) *
    texture2D(s, uv);
}

vec2 sdTrack (vec3 p, float t) {
  t *= 2.0;
  t -= 1.0;
  t *= 4.0;
  float type = floor(t);
  t -= type;
  t *= 2.0;
  float drawUp = floor(t);
  t -= drawUp;
  t *= 2.0;
  float drawRight = floor(t);
  t -= drawRight;
  t *= 2.0;
  float drawDown = floor(t);
  t -= drawDown;
  t *= 2.0;
  float drawLeft = floor(t);
  t -= drawLeft;
  float right = sdCappedCylinder((p - vec3(0.25, 0., 0.0)) * mat3(
    0.0, 1.0, 0.0,
    1.0, 0.0, 0.0,
    0.0, 0.0, 1.0
  ), vec2(0.1, 0.25));
  float left = sdCappedCylinder((p + vec3(0.25, 0., 0.0)) * mat3(
    0.0, 1.0, 0.0,
    1.0, 0.0, 0.0,
    0.0, 0.0, 1.0
  ), vec2(0.1, 0.25));
  float up = sdCappedCylinder((p - vec3(0.0, 0., -0.25)) * mat3(
    1.0, 0.0, 0.0,
    0.0, 0.0, 1.0,
    0.0, 1.0, 0.0
  ), vec2(0.1, 0.25));
  float down = sdCappedCylinder((p - vec3(0.0, 0., 0.25)) * mat3(
    1.0, 0.0, 0.0,
    0.0, 0.0, 1.0,
    0.0, 1.0, 0.0
  ), vec2(0.1, 0.25));
  float d;
  if (type == 2.0) {
    d = sdSphere(p, 0.1);
    if (drawRight > 0.0) d = smin(d, right, 0.1);
    if (drawLeft > 0.0) d = smin(d, left, 0.1);
    if (drawUp > 0.0) d = smin(d, up, 0.1);
    if (drawDown > 0.0) d = smin(d, down, 0.1);
  }
  else if (type == 1.0) {
    d = min(up, down);
  }
  else if (type == 0.0) {
    d = min(left, right);
  }
  return vec2(d, 10.0);
}
vec2 sdTrain (vec3 p, float t) {
  t *= 4.0;
  float dir = floor(t);
  t -= dir;
  if (dir == 1. || dir == 3.) {
    p.zx = p.xz;
  }
  if (dir == 2. || dir == 3.) {
    p.x *= -1.;
  }
  p.y -= 0.3;
  p.x += 0.1;
  float d = sdCappedCylinder(p.yxz, vec2(0.2, 0.3));
  p.x -= 0.3;
  d = min(d, sdSphere(p, 0.2));
  return vec2(d, 1.0);
}
vec2 sdMine (vec3 p) {
  p.y -= 0.5;
  float d = sdSphere(p, 0.2);
  return vec2(d, 2.0);
}
vec2 sdAccumulator (vec3 p) {
  p.y -= 0.5;
  float d = sdSphere(p, 0.2);
  return vec2(d, 3.0);
}
vec2 sdMarket (vec3 p) {
  p.y -= 0.5;
  float d = sdSphere(p, 0.2);
  return vec2(d, 4.0);
}
vec2 sdMiner (vec3 p) {
  p.y -= 0.5;
  float d = sdSphere(p, 0.2);
  return vec2(d, 5.0);
}
vec2 sdBase (vec3 p, vec2 sz) {
  p.y -= 0.04;
  p.xz -= sz / 2.0;
  float d = sdBox(p, 0.5*vec3(sz.x, 0.05, sz.y));
  return vec2(d, 6.0);
}

vec2 board (vec3 position) {
  position.z = size.y - position.z;
  float distance, distance2, materialID;
  vec3 id, p = position;
  p.y += 0.2;
  vec2 res = vec2(max(0.0, p.y), 0.2);
  p = position;

  p.xz -= base.xy;
  res = opU(res, sdBase(p, base.zw));

  p = position;

  // terrain
  id = opRep(p, vec3(1.0, 0.0, 1.0));

  if (all(lessThanEqual(vec2(0.0), id.xz)) && all(lessThan(id.xz, size))) {
    vec2 gameP = id.xz;
    vec2 gamePNormalized = gameP / size;
    float cur = mouse.xy == gameP ? 1.0 : 0.0;
    res = opUs(0.1, res, vec2(sdBox(p-vec3(-0.5, -0.1*(1.0+cur), -0.5), vec3(1.0, 0.1, 1.0)), 0.3 + 0.02 * mod(id.x+id.z, 2.0) - 0.05 * cur ));

/*
    res = opUs(0.1, res, vec2(sdTorus(
      p - vec3(0.0, 0.1, 0.0),
      vec2(
        0.2 + 0.08 * (sin(time + 10.0 * id.x) + cos(time + 10.0 * id.z)),
        0.1)), 0.1));
*/

    // objs
    p = position;
    id = opRep(p, vec3(1.0, 0.0, 1.0));
    vec4 env = texture2DOrBlack(energyMap, gamePNormalized);
    vec4 obj = texture2DOrBlack(dataMap, gamePNormalized);

    float r = 0.2/(0.01+env.r);
    float energyRain = mod(p.y + time, r);
    float energyRainU = (p.y + time - energyRain) / r;
    res = opU(res, vec2(sdSphere(vec3(p.x+0.3*cos(energyRainU), energyRain, p.z+0.3*sin(energyRainU)), 0.01*smoothstep(10.0, 0.0, position.y)), 7.0));

    if (obj.r > 0.) {
      res = opU(res, sdTrack(p, obj.r));
    }
    if (obj.g > 0.) {
      float d = obj.g * 8.0;
      float objType = floor(d);
      d -= objType;
      if (objType==1.0) {
        res = opU(res, sdMine(p));
        if (obj.b > 0.0) {
          res = opU(res, sdMiner(p));
        }
      }
      else if (objType==2.0) {
        res = opU(res, sdAccumulator(p));
      }
      else if (objType==3.0) {
        res = opU(res, sdMarket(p));
      }
    }
    if (obj.a > 0.) {
      res = opU(res, sdTrain(p, obj.a));
    }
  }

  return res;
}

vec2 scene(vec3 position) {
  vec2 d = board(position);
  return d;
}

vec3 sceneColor (float m) {
  m = abs(m);
  vec3 materialColor = vec3(0.0, 0.0, 0.0);
  if (m < 1.0) {
    // floor
    materialColor = vec3(m);
  }
  else if(m < 2.0) {
    // train
    materialColor = vec3(1.0, 0.0, 0.1);
  }
  else if (m < 3.0) {
    // mine
    materialColor = vec3(0.2, 0.2, 0.2);
  }
  else if (m < 4.0) {
    // accumulator
    materialColor = vec3(0.5, 0.5, 0.5);
  }
  else if (m < 5.0) {
    // market
    materialColor = vec3(0.3, 0.0, 1.0);
  }
  else if (m < 6.0) {
    // miner
    materialColor = vec3(0.0, 1.0, 0.7);
  }
  else if (m < 7.0) {
    // base
    materialColor = vec3(1.0, 0.8, 0.5);
  }
  else if (m < 8.0) {
    // particles
    materialColor = vec3(1.3, 0.9, 0.5);
  }
  else if (m < 10.0) {
    materialColor = vec3(0.1);
  }
  return materialColor;
}

vec3 raymarch(vec3 position, vec3 direction) {
  float total_distance = NEAR_CLIPPING_PLANE;
  for(int i = 0; i < NUMBER_OF_MARCH_STEPS; ++i) {
    vec3 p = position + direction * total_distance;
    vec2 result = scene(p);
    float debugDistance = 0.0;
    if (debugPlaneOn) {
      if (abs(p.y - debugPlaneY) <= EPSILON) {
        debugDistance = result.x;
      }
      result.x = min(result.x, abs(p.y - debugPlaneY));
    }
    if(result.x < EPSILON) {
        return vec3(total_distance, result.y, debugDistance);
    }
    total_distance += result.x * DISTANCE_BIAS;
    if(total_distance > FAR_CLIPPING_PLANE) break;
  }
  return vec3(FAR_CLIPPING_PLANE, 0.0, 0.0);
}

vec3 normal(vec3 ray_hit_position, float smoothness) {
  vec3 n;
  vec2 dn = vec2(smoothness, 0.0);
  n.x  = scene(ray_hit_position + dn.xyy).x - scene(ray_hit_position - dn.xyy).x;
  n.y  = scene(ray_hit_position + dn.yxy).x - scene(ray_hit_position - dn.yxy).x;
  n.z  = scene(ray_hit_position + dn.yyx).x - scene(ray_hit_position - dn.yyx).x;
  return normalize(n);
}

void main() {
  vec3 direction = normalize(rot * vec3(uv * vec2(aspect, 1.0), 2.5));
  vec3 result = raymarch(origin, direction);
  float fog = pow(smoothstep(FAR_CLIPPING_PLANE * 0.8, 1.0, result.x), 6.0);
  //float fog = pow(1.0 / (1.0 + result.x), 0.5);
  vec3 materialColor = sceneColor(result.y);
  if (result.z > 0.0) {
    float d = result.z/debugStepping;
    float edge = step(0.05, mod(d, 1.0));
    d = floor(d);
    materialColor = edge * smoothstep(60.0, 30.0, d) * vec3(
      smoothstep(0.0, 10.0, d) * (1.0-smoothstep(10.0, 30.0, d)),
      smoothstep(10.0, 0.0, d),
      smoothstep(10.0, 30.0, d)
    );
  }
  vec3 intersection = origin + direction * result.x;
  vec3 nrml = normal(intersection, 0.002);
  vec3 light_dir = normalize(vec3(0.2, 1.0, 0.2));
  float diffuse = dot(light_dir, nrml);
  //diffuse = mix(diffuse, floor(pow(max(0.0, diffuse), 3.0)*3.0)/3.0, 0.3);
  diffuse = diffuse * 0.5 + 0.5;
  vec3 diffuseLit;
  /*
  if (result.z == 0.0 && result.y > 0.0 && abs(dot(direction, nrml)) < 0.2) {
    diffuseLit = vec3(0.0);
  }
  else {
  */
    vec3 light_color = vec3(1.4, 1.2, 0.7);
    vec3 ambient_color = vec3(0.2, 0.45, 0.6);
    diffuseLit = materialColor * (diffuse * light_color + ambient_color);
  // }
  gl_FragColor = vec4(diffuseLit, 1.0) * fog;
}
`,

    vert: GLSL`
    precision mediump float;
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      gl_Position = vec4(position, 0, 1);
      uv = position;
    }`,

    attributes: {
      position: regl.buffer([[-1, -1], [-1, 4], [4, -1]])
    },

    uniforms: {
      color: regl.prop("color"),
      time: regl.prop("time"),
      aspect: regl.prop("aspect"),
      rot: regl.prop("rot"),
      origin: regl.prop("origin"),
      energyMap: regl.prop("energyMap"),
      dataMap: regl.prop("dataMap"),
      mouse: regl.prop("mouse"),
      base: regl.prop("base"),
      size: regl.prop("size"),
      debugPlaneOn: regl.prop("debugPlaneOn"),
      debugPlaneY: regl.prop("debugPlaneY"),
      debugStepping: regl.prop("debugStepping")
    },

    count: 3
  });

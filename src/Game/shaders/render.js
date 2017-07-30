const GLSL = require("./GLSL");

module.exports = regl =>
  regl({
    frag: GLSL`
precision mediump float;
uniform vec4 color;
uniform float time;
uniform float aspect;
uniform bool debugPlaneOn;
uniform float debugPlaneY;
uniform float debugStepping;
uniform mat3 rot;
varying vec2 uv;
uniform sampler2D energyMap;
uniform vec2 size;
uniform vec3 origin;

#define NEAR_CLIPPING_PLANE 0.1
#define FAR_CLIPPING_PLANE 120.0
#define NUMBER_OF_MARCH_STEPS 100
#define EPSILON 0.02
#define DISTANCE_BIAS 0.7

float fmod(float a, float b) {
  return (a<0.0) ? b - mod(abs(a), b) : mod(a, b);
}
float smin(float a, float b, float k) {
  float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
  return mix( b, a, h ) - k*h*(1.0-h);
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

const float boardOffset = 0.66;

vec2 board (vec3 position) {
  position -= vec3(boardOffset, 0.0, boardOffset);

  float distance, distance2, materialID;
  vec3 id, p = position;

  // terrain
  materialID = 0.0;
  distance = max(0.0, p.y);
  id = opRep(p, vec3(1.0, 0.0, 1.0));

  if (all(lessThanEqual(vec2(0.0), id.xz)) && all(lessThan(id.xz, size))) {
    distance2 = sdTorus(
      p - vec3(0.0, 0.06, 0.0),
      vec2(
        0.2 + 0.08 * (sin(time + 10.0 * id.x) + cos(time + 10.0 * id.z)),
        0.1));
    if (distance2 < distance) {
      materialID = 0.1;
    }
    distance = smin(distance, distance2, 0.1);

    // objs
    p = position;
    p.y -= 0.5;
    id = opRep(p, vec3(1.0, 0.0, 1.0));
    vec4 v = texture2DOrBlack(energyMap, id.xz / size);
    if (v.x > 0.5) {
      distance2 = sdSphere(p, 0.2);
      if (distance2 < distance) {
        distance = distance2;
        materialID = 1.5 + 0.25*(cos(236. * id.x) + sin(52. * id.z));
      }
    }
  }

  return vec2(distance, materialID);
}

vec2 board3 (vec3 position) {
  return opUs(0.5, opUs(0.5,
    board(position),
    board(mat3(
      0.0, 0.0, 1.0,
      1.0, 0.0, 0.0,
      0.0, 1.0, 0.0
    ) * position)),
    board(mat3(
      0.0, 1.0, 0.0,
      1.0, 0.0, 0.0,
      0.0, 0.0, 1.0
    ) * position)
  );
}

vec2 scene(vec3 position) {
  vec2 d = board3(position);
  d = opUs(0.5, d, board3(((position - vec3(size.x + 2. * boardOffset)) * mat3(
      -1.0, 0.0, 0.0,
      0.0, -1.0, 0.0,
      0.0, 0.0, -1.0
    ))
  ));
  d = opU(d, vec2(
    udRoundBox(position - vec3(6.0), vec3(1.0 + 0.02 * cos(3.0 * time)), 0.2),
    -2.0
  ));
  return d;
}

vec3 sceneColor (float m) {
  m = abs(m);
  vec3 materialColor = vec3(0.0, 0.0, 0.0);
  if (m < 1.0) {
    materialColor = vec3(0.2);
  }
  else if(m < 2.0) {
    materialColor = vec3(0.5 + 0.5 * cos(0.9*(time)+m), 0.5 + 0.5 * sin(0.3 * (time+m)), 0.8);
  }
  else if (m == 2.0) {
    materialColor = vec3(1.1, 0.2, 0.2);
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
  vec3 direction = normalize(rot * normalize(vec3(uv * vec2(aspect, 1.0), 2.5)));
  vec3 result = raymarch(origin, direction);
  float fog = pow(smoothstep(FAR_CLIPPING_PLANE / 2.0, 1.0, result.x), 6.0);
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
  diffuse = mix(diffuse, floor(pow(max(0.0, diffuse), 3.0)*3.0)/3.0, 0.3);
  diffuse = diffuse * 0.5 + 0.5;
  vec3 diffuseLit;
  if (result.z == 0.0 && result.y > 0.0 && abs(dot(direction, nrml)) < 0.2) {
    diffuseLit = vec3(0.0);
  }
  else {
    vec3 light_color = vec3(1.4, 1.2, 0.7);
    vec3 ambient_color = vec3(0.2, 0.45, 0.6);
    diffuseLit = materialColor * (diffuse * light_color + ambient_color);
  }
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
      size: regl.prop("size"),
      debugPlaneOn: regl.prop("debugPlaneOn"),
      debugPlaneY: regl.prop("debugPlaneY"),
      debugStepping: regl.prop("debugStepping")
    },

    count: 3
  });

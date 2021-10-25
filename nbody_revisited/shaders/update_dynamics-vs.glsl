#version 300 es

#if (NUM_TYPES > 4)
#error NUM_TYPES exceeds max value
#endif

#if defined(BORDER)
#define BOUNCE_SOFT 1
#define BOUNCE_HARD 2

//#define BOUNCE_SOFT_FIXED 0.2f
#define BOUNCE_SOFT_FIXED 0.005f
#define BOUNCE_SOFT_DISTANCE 100.0f
#endif

in vec2 a_position;
in vec2 a_velocity;
// in vec2 a_acceleration;

out vec2 v_position;
out vec2 v_velocity;
out vec2 v_acceleration;

uniform int u_ntypes;
uniform float u_strength;
uniform float u_damping;
#if defined(BOUNCE_SOFT_DYNAMIC)
uniform float u_border;
#endif
uniform float u_dt;
uniform float[NUM_TYPES * NUM_TYPES] u_forces;
uniform vec2 u_half_vp;
#if defined(NORMALIZE)
uniform vec2 u_scale;
#endif
#if defined(MAX_VELOCITY)
uniform float u_max_velocity;
#endif

uniform sampler2D u_field01;
#if (NUM_TYPES > 2)
uniform sampler2D u_field23;
#endif

// uniform float u_mass;

const float EPSILON = 0.000000001f;

void main()
{
    int type = gl_VertexID % u_ntypes;
    vec2 uv = ((a_position * u_scale) + vec2(1.0)) * 0.5;
#if defined(TEXTURE_FLIP_S)
    uv.s = 1.0 - uv.s;
#endif
#if defined(TEXTURE_FLIP_T)
    uv.t = 1.0 - uv.t;
#endif

    vec2 acceleration = vec2(0.0);

#if defined(BORDER) && (BORDER == BOUNCE_SOFT)
    // soft bounce, or come back when lower resized
    {
#if defined(BOUNCE_SOFT_DYNAMIC)
    float border = u_border;
#else
    float border = BOUNCE_SOFT_FIXED;
#endif
        vec2 ap = abs(a_position);
        vec2 vp = 1.0 / u_scale;
        vec2 b = step(vp, ap);
        vec2 d = min((ap - vp), vec2(BOUNCE_SOFT_DISTANCE));

        acceleration -= b * normalize(a_position) * u_strength * border * d;
    }
#endif

    int f = type * NUM_TYPES;
    
    {
        vec4 force = texture(u_field01, uv);
        acceleration += force.xy * u_forces[f];
#if (NUM_TYPES > 1)
        acceleration += force.zw * u_forces[f + 1];
#endif
    }
#if (NUM_TYPES > 2)
    {
        vec4 force = texture(u_field23, uv);
        acceleration += force.xy * u_forces[f + 2];
#if (NUM_TYPES > 3)
        acceleration += force.zw * u_forces[f + 3];
#endif
    }
#endif

    acceleration *= u_strength;
    // acceleration /= u_mass;

    v_velocity = (a_velocity * (1.0 - (u_damping * step(EPSILON, u_dt)))) + (acceleration * u_dt);
    v_position = a_position + a_velocity * u_dt;
    v_acceleration = acceleration;

#if defined(MAX_VELOCITY)
    // velocity limit
    {
        float mv = u_max_velocity;
        float v = length(v_velocity);
        v = max(1.0, v / mv);
        v_velocity /= v;
    }
#endif    

#if defined(BORDER) && (BORDER == BOUNCE_HARD)
    // hard bounce, or come back when lower resized
    {
        vec2 b2 = step(1.0 / u_scale, abs(v_position));
        vec2 p2 = sign(v_position);
        vec2 v2 = sign(v_velocity);
        v_velocity *= vec2(1.0) - (2.0 * b2 * step(vec2(0.0), p2 * v2));
    }
#endif

#if defined(DEBUG)
    gl_PointSize = 20.0;
#endif

    vec2 position = a_position;
#if defined(NORMALIZE)
    position *= u_scale;
#endif

    gl_Position = vec4(position, 0.0, 1.0);
}

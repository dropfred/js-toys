#version 300 es

#if (MAX_SPECIES > 4)
#error MAX_SPECIES exceeds max value
#endif

#if defined(BORDER)

#define BORDER_BOUNCE_SOFT 1
#define BORDER_BOUNCE_HARD 2
#define BORDER_WRAP        3

// some black magic here
#define BOUNCE_SOFT_STRENGTH 1.0f
#define BOUNCE_SOFT_DISTANCE 100.0f

#endif

in vec2 a_position;
in vec2 a_velocity;
// in vec2 a_acceleration;

out vec2 v_position;
out vec2 v_velocity;
out vec2 v_acceleration;

out vec4 v_debug;

uniform int u_nspecies;
uniform float u_damping;
#if defined(GRAVITY)
uniform vec2 u_gravity;
#endif
#if defined(GRAVITY)
uniform vec2 u_wind;
#endif
#if defined(BORDER) && ((BORDER == BORDER_BOUNCE_SOFT) || (BORDER == BORDER_BOUNCE_HARD))
uniform float u_bounce_force;
#endif
#if defined(BOUNCE_SOFT_DYNAMIC)
uniform float u_border;
#endif
uniform float u_dt;
uniform float[MAX_SPECIES * MAX_SPECIES] u_force;
#if defined(MASS)
uniform float[MAX_SPECIES] u_mass;
#endif
uniform vec2 u_half_vp;
#if defined(NORMALIZE)
uniform vec2 u_scale;
#endif
#if defined(MAX_VELOCITY)
uniform float u_velocity_max;
#endif

uniform sampler2D u_field01;
#if (MAX_SPECIES > 2)
uniform sampler2D u_field23;
#endif

void main()
{
    int type = gl_VertexID % u_nspecies;
    vec2 uv = ((a_position * u_scale) + vec2(1.0)) * 0.5;
#if defined(TEXTURE_FLIP_S)
    uv.s = 1.0 - uv.s;
#endif
#if defined(TEXTURE_FLIP_T)
    uv.t = 1.0 - uv.t;
#endif

#if defined(MASS)
    float mass = u_mass[type];
#else
    float mass = 1.0;
#endif

    vec2 acceleration = vec2(0.0);

    int f = type * MAX_SPECIES;
    
    {
        vec4 force = texture(u_field01, uv);
        acceleration += force.xy * u_force[f];
#if (MAX_SPECIES > 1)
        acceleration += force.zw * u_force[f + 1];
#endif
    }
#if (MAX_SPECIES > 2)
    {
        vec4 force = texture(u_field23, uv);
        acceleration += force.xy * u_force[f + 2];
#if (MAX_SPECIES > 3)
        acceleration += force.zw * u_force[f + 3];
#endif
    }
#endif

#if defined(GRAVITY)
    acceleration += u_gravity * mass;
#endif

#if defined(WIND)
    acceleration += u_wind;
#endif

    acceleration /= mass;

#if defined(BORDER) && (BORDER == BORDER_BOUNCE_SOFT)
    {
        vec2 ap = abs(a_position);
        vec2 vp = 1.0 / u_scale;
        vec2 b = step(vp, ap);
        if (b != vec2(0.0, 0.0))
        {
            vec2 d = min((ap - vp), vec2(BOUNCE_SOFT_DISTANCE));
            acceleration -= b * normalize(a_position) * u_bounce_force * BOUNCE_SOFT_STRENGTH * d;
        }
    }
#endif

    v_velocity = (a_velocity * (1.0 - (u_damping * u_dt))) + (acceleration * u_dt);
    v_position = a_position + a_velocity * u_dt;
    v_acceleration = acceleration;

#if defined(MAX_VELOCITY)
    {
        float v = length(v_velocity);
        if (v > u_velocity_max)
        {
            v_velocity *= u_velocity_max / v;
        }
    }
#endif    

// TODO : bug : currently, bodies are lost when outside (passing from soft to hard borders, or down resising) with null velocity.
#if defined(BORDER) && (BORDER == BORDER_BOUNCE_HARD)
    // hard bounce, or come back when lower resized
    {
        vec2 b2 = step(1.0 / u_scale, abs(v_position));
        vec2 p2 = sign(v_position);
        vec2 v2 = sign(v_velocity);
        v_velocity *= vec2(1.0) - (2.0 * b2 * step(vec2(0.0), p2 * v2));
    }
#endif

#if defined(BORDER) && (BORDER == BORDER_WRAP)
    {
        vec2 hvp = 1.0 / u_scale;
        vec2 b2 = step(hvp, abs(v_position));
        vec2 p2 = sign(v_position);
        v_position -= b2 * p2 * hvp * 2.0;
    }
#endif

    vec2 position = a_position;

#if defined(NORMALIZE)
    position *= u_scale;
#endif

    gl_Position = vec4(position, 0.0, 1.0);
}

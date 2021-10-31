#version 300 es

precision highp float;
precision highp int;

out vec2 v_position;
out vec2 v_velocity;
out vec2 v_acceleration;

uniform vec2  u_size;
uniform float u_position;
uniform float u_velocity;

#if defined(RAND)

#if defined(SEED)
uniform int u_seed;
#endif

// https://www.shadertoy.com/view/7dSSDw
uint hash(uint s)
{
    s ^= 0xa3c59ac3u;
    s *= 0x9e3779b9u;
    s ^= 0x00010000u;
    s *= 0x9e3779b9u;
    s ^= 0x00010000u;
    s *= 0x9e3779b9u;
	return s;
}

#endif

const float EPSILON = 0.000000001f;

void main()
{
    vec2 position = vec2(0.0);
    vec2 velocity = vec2(0.0);
    vec2 acceleration = vec2(0.0);
#if defined(RAND)
#if defined(SEED)
    int seed  = u_seed;
#else
    int seed = 0;
#endif
    {
        uvec2 r = uvec2(hash(uint(gl_VertexID + seed)), hash(uint(gl_VertexID * 2 + seed)));
        position = vec2(float(r.x) / float(0xffffffffu), float(r.y) / float(0xffffffffu)) * 2.0 - vec2(1.0);
        position *= u_size * u_position;
    }
    {
        uvec2 r = uvec2(hash(uint(gl_VertexID + seed + 1)), hash(uint(gl_VertexID * 2 + seed + 1)));
        velocity = vec2(float(r.x) / float(0xffffffffu), float(r.y) / float(0xffffffffu)) * 2.0 - vec2(1.0);
        velocity *= u_velocity;
    }
#endif

    v_position     = position;
    v_velocity     = velocity;
    v_acceleration = vec2(0.0);

    gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}

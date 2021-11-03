#version 300 es

precision highp float;
precision highp int;

out vec2 v_position;
out vec2 v_velocity;
out vec2 v_acceleration;

uniform vec2  u_size;
uniform float u_position;
uniform float u_velocity;
uniform vec2 u_offset;

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

const float PI = 3.141592653589793238;

void main()
{
    vec2 position     = vec2(0.0);
    vec2 velocity     = vec2(0.0);
    vec2 acceleration = vec2(0.0);
#if defined(RAND)
#if defined(SEED)
    int seed  = u_seed;
#else
    int seed = 0;
#endif
    {
        vec2 r = vec2(hash(uint(gl_VertexID + seed)), hash(uint(gl_VertexID * 2 + seed))) / float(0xffffffffu);
        position = (r * 2.0) - vec2(1.0);
        position *= (u_size * u_position);
        position += u_offset;
    }
    {
        vec2 r = vec2(hash(uint(gl_VertexID + seed + 1)), hash(uint(gl_VertexID * 2 + seed + 1))) / float(0xffffffffu);
        r.x *= 2.0 * PI;
        velocity = vec2(cos(r.x), sin(r.x)) * r.y * u_velocity;
    }
#endif

    v_position     = position;
    v_velocity     = velocity;
    v_acceleration = acceleration;

    gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}

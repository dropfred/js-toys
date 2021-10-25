#version 300 es

precision highp float;
precision highp int;

out vec2 v_position;
out vec2 v_velocity;
out vec2 v_acceleration;

uniform vec2 u_position_range;
uniform vec2 u_velocity_range;

#if defined(RAND)
#if defined(SEED)
uniform int u_seed;
#endif

#define ROUNDS 5

// https://umbcgaim.wordpress.com/2010/07/01/gpu-random-numbers/
uvec2 rand(uvec2 s)
{
    for (int i = 0; i < ROUNDS; ++i)
    {
        s.x += ((s.y << 4u) + 0xa341316cu) ^ (s.y + 0x9e3779b9u) ^ ((s.y >> 5u) + 0xc8013ea4u);
        s.y += ((s.x << 4u) + 0xad90777du) ^ (s.x + 0x9e3779b9u) ^ ((s.x >> 5u) + 0x7e95761eu);
    }
    return s;
}
#endif

void main()
{
    vec2 position = vec2(0.0);
    vec2 velocity = vec2(0.0);
    vec2 acceleration = vec2(0.0);
#if defined(RAND)
#if defined(SEED)
    int seed  = u_seed;
#else
    int seed = gl_VertexID;
#endif
    uvec2 r = rand(uvec2(uint(gl_VertexID), uint(seed)));
    position = vec2(float(r.x & 0xffffu) / float(0xffffu), float((r.x >> 16u) & 0xffffu) / float(0xffffu)) * 2.0 - vec2(1.0);
    velocity = vec2(float(r.y & 0xffffu) / float(0xffffu), float((r.y >> 16u) & 0xffffu) / float(0xffffu)) * 2.0 - vec2(1.0);
    position *= u_position_range;
    velocity *= u_velocity_range;
#endif

    v_position     = position;
    v_velocity     = velocity;
    v_acceleration = vec2(0.0);

    gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}

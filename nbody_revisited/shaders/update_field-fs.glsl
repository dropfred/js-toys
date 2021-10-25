#version 300 es

#if (NUM_TYPES > 4)
#error NUM_TYPES exceeds max value
#endif

precision mediump float;

flat in int v_type;

layout (location = 0) out vec4 o_force01;
#if (NUM_TYPES > 2)
layout (location = 1) out vec4 o_force23;
#endif

uniform float u_decay;
uniform float u_zero;

void main()
{
    // vec2 p = (gl_PointCoord * 2.0) - vec2(1.0);
    // GL_POINT_SPRITE_COORD_ORIGIN not available in WebGL
    vec2 p = gl_PointCoord;
    p.y = 1.0 - p.y;
    p *= 2.0;
    p -= vec2(1.0);

    float d = length(p);
    if ((d > 1.0) || (d < u_zero)) discard;
    float f = pow(1.0 - ((d - u_zero) / (1.0 - u_zero)), u_decay);
    vec2 df = normalize(p) * f;

    vec2 force[NUM_TYPES];
    force[0] = vec2(0.0);
#if (NUM_TYPES > 1)
    force[1] = vec2(0.0);
#endif
#if (NUM_TYPES > 2)
    force[2] = vec2(0.0);
#endif
#if (NUM_TYPES > 3)
    force[3] = vec2(0.0);
#endif

    force[(v_type >> 1) * 2 + (v_type & 1)] = df;

    o_force01 = vec4(0.0);
    o_force01.xy = force[0];
#if (NUM_TYPES > 1)
    o_force01.zw = force[1];
#endif
#if (NUM_TYPES > 2)
    o_force23 = vec4(0.0);
    o_force23.xy = force[2];
#endif
#if (NUM_TYPES > 3)
    o_force23.zw = force[3];
#endif
}

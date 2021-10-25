#version 300 es

precision mediump float;

in vec4 v_color;

#if defined(DECAY)
uniform float u_decay;
#endif

out vec4 o_color;

void main()
{
    vec2 p = (gl_PointCoord * 2.0) - 1.0;
#if !defined(POINT)
    float d = length(p);
#if defined(DECAY)
    float a = pow(1.0 - d, u_decay);
#else
    float a = 1.0;
#endif
#if defined(AA)
    float w = fwidth(d) * AA;
    a *= 1.0 - smoothstep(1.0 - w, 1.0, d);
#else
    a *= 1.0 - step(1.0, d);
#endif
#else
    float a = 1.0;
#endif
    o_color = vec4(v_color.rgb, v_color.a * a);
}

#version 300 es

precision mediump float;
precision mediump int;

out vec4 o_color;

uniform vec2 u_position[NUM_BLOBS];
uniform float u_radius;
uniform float u_color;

// http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
vec3 hsv_rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main()
{
    float a = 0.0;
#if defined(UNROLL_LOOP)
    {
        float d = length(u_position[0] - gl_FragCoord.xy);
        if (d > 0.0) a += 1.0 / d;
    }
#if (NUM_BLOBS > 1)
    {
        float d = length(u_position[1] - gl_FragCoord.xy);
        if (d > 0.0) a += 1.0 / d;
    }
#endif
#if (NUM_BLOBS > 2)
    {
        float d = length(u_position[2] - gl_FragCoord.xy);
        if (d > 0.0) a += 1.0 / d;
    }
#endif
#if (NUM_BLOBS > 3)
    {
        float d = length(u_position[3] - gl_FragCoord.xy);
        if (d > 0.0) a += 1.0 / d;
    }
#endif
#if (NUM_BLOBS > 4)
    {
        float d = length(u_position[4] - gl_FragCoord.xy);
        if (d > 0.0) a += 1.0 / d;
    }
#endif
#else
    for (int b = 0; b < NUM_BLOBS; ++b)
    {
        float d = length(u_position[b] - gl_FragCoord.xy);
        if (d > 0.0) a += 1.0 / d;
    }
#endif
    a = fract(min(a * u_radius, 1.0) + u_color);
    o_color = vec4(hsv_rgb(vec3(a, 1.0, 1.0)), 1.0);
}

#version 300 es

precision mediump float;

in vec2 v_uv;

out vec4 o_color;

uniform vec4 u_color;
uniform vec2 u_fade_x;
uniform vec2 u_fade_y;

void main()
{
    vec4 color = u_color;
    color.a *= 1.0 - mix(u_fade_x.x, u_fade_x.y, v_uv.x);
    color.a *= 1.0 - mix(u_fade_y.x, u_fade_y.y, v_uv.y);
    o_color = vec4(color);
}

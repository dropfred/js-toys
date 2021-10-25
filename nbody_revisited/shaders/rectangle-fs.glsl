#version 300 es

precision mediump float;

#if defined(TEXTURE)
in vec2 v_uv;
#endif

out vec4 o_color;

uniform vec4 u_color;
#if defined(TEXTURE)
uniform sampler2D u_map;
#endif

void main()
{
    vec4 color = u_color;
#if defined(TEXTURE)
    color *= texture(u_map, v_uv);
#endif
    o_color = vec4(color);
}

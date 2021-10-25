#version 300 es

in vec2 a_position;

flat out int v_type;

uniform float u_range;

#if defined(NORMALIZE)
uniform vec2 u_scale;
#endif
uniform int u_ntypes;

void main()
{
    int type = gl_VertexID % u_ntypes;

    v_type = type;

    gl_PointSize = u_range * 2.0;

    vec2 position = a_position;
#if defined(NORMALIZE)
    position *= u_scale;
#endif

    gl_Position = vec4(position, 0.0, 1.0);
}

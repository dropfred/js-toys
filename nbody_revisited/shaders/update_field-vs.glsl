#version 300 es

in vec2 a_position;

flat out int v_type;

uniform float u_range;
uniform float u_resolution;
uniform vec2 u_offset;
uniform int u_nspecies;
#if defined(NORMALIZE)
uniform vec2 u_scale;
#endif

void main()
{
    int type = gl_VertexID % u_nspecies;

    v_type = type;

    gl_PointSize = u_range * 2.0 * u_resolution;

    vec2 position = a_position;
#if defined(NORMALIZE)
    position *= u_scale;
#endif
    position += u_offset;

    gl_Position = vec4(position, 0.0, 1.0);
}

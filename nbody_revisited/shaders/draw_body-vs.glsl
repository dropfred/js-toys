#version 300 es

#if (MAX_SPECIES > 4)
#error MAX_SPECIES exceeds max value
#endif

in vec2 a_position;

out vec4 v_color;

uniform int u_nspecies;
uniform vec4 u_palette[MAX_SPECIES];
uniform float u_size;
#if defined(NORMALIZE)
uniform vec2 u_scale;
#endif

void main()
{
    v_color = u_palette[gl_VertexID % u_nspecies];

    gl_PointSize = u_size;

    vec2 position = a_position;
#if defined(NORMALIZE)
    position *= u_scale;
#endif

    gl_Position = vec4(position, 0.0, 1.0);
}

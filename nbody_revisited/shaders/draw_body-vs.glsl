#version 300 es

#if (NUM_TYPES > 4)
#error NUM_TYPES exceeds max value
#endif

in vec2 a_position;

out vec4 v_color;

uniform int u_ntypes;
uniform vec4 u_palette[NUM_TYPES];
uniform float u_size;
#if defined(NORMALIZE)
uniform vec2 u_scale;
#endif

void main()
{
    v_color = u_palette[gl_VertexID % u_ntypes];

    gl_PointSize = u_size;

    vec2 position = a_position;
#if defined(NORMALIZE)
    position *= u_scale;
#endif

    gl_Position = vec4(position, 0.0, 1.0);
}

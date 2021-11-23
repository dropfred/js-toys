#version 300 es

void main()
{
    gl_Position = vec4(vec2((gl_VertexID & 1) << 1, gl_VertexID & 2) + vec2(-1.0), 0.0, 1.0);
}

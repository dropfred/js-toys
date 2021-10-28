#version 300 es

#if defined(TEXTURE)
out vec2 v_uv;
#endif

uniform vec2 u_size;
uniform vec2 u_offset;

void main()
{
    vec2 p = vec2(float((gl_VertexID & 1) << 1), float(gl_VertexID & 2));
#if defined(TEXTURE)
    v_uv = p * 0.5;
#if defined(TEXTURE_FLIP_S)
    v_uv.s = 1.0 - v_uv.s;
#endif
#if defined(TEXTURE_FLIP_T)
    v_uv.t = 1.0 - v_uv.t;
#endif
#endif
    p -= vec2(1.0);
    p *= u_size;
    p += u_offset;
    gl_Position = vec4(p, 0.0, 1.0);
}

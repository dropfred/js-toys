#version 300 es

#if defined(TEXTURE)
out vec2 v_uv;
#endif

uniform vec2 u_size;
uniform vec2 u_offset;
#if defined(DYNAMIC_FLIP)
uniform bvec2 u_flip;
#endif

void main()
{
    vec2 p = vec2((gl_VertexID & 1) << 1, gl_VertexID & 2);
#if defined(TEXTURE)

    v_uv = p * 0.5;
#if defined(DYNAMIC_FLIP)
    if (u_flip.s) {v_uv.s = 1.0 - v_uv.s;}
    if (u_flip.t) {v_uv.t = 1.0 - v_uv.s;}
    // v_uv = ((vec2(1.0) - v_uv) * vec2(u_flip)) +
    //        (v_uv               * vec2(!u_flip.x, !u_flip.y));
#else
#if defined(TEXTURE_FLIP_S)
    v_uv.s = 1.0 - v_uv.s;
#endif
#if defined(TEXTURE_FLIP_T)
    v_uv.t = 1.0 - v_uv.t;
#endif
#endif

#endif
    p += vec2(-1.0);
    p *= u_size;
    p += u_offset;
    gl_Position = vec4(p, 0.0, 1.0);
}

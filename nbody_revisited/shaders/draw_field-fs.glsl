#version 300 es

#if (MAX_SPECIES > 4)
#error MAX_SPECIES exceeds max value
#endif

precision mediump float;

in vec2 v_uv;

out vec4 o_color;

uniform float u_saturation;
uniform vec4 u_palette[MAX_SPECIES];

uniform sampler2D u_field01;
#if (MAX_SPECIES > 2)
uniform sampler2D u_field23;
#endif

void main()
{
    vec4 color = vec4(0.0);

    {
        vec4 field = texture(u_field01, v_uv) * 0.5;
        {
            float f = length(field.xy);
            color.rgb += u_palette[0].rgb * f;
            color.a += f;
        }
#if (MAX_SPECIES > 1)
        {
            float f = length(field.zw);
            color.rgb += u_palette[1].rgb * f;
            color.a += f;
        }
#endif
    }
#if (MAX_SPECIES > 2)
    {
        vec4 field = texture(u_field23, v_uv) * 0.5;
        {
            float f = length(field.xy);
            color.rgb += u_palette[2].rgb * f;
            color.a += f;
        }
#if (MAX_SPECIES > 3)
        {
            float f = length(field.zw);
            color.rgb += u_palette[3].rgb * f;
            color.a += f;
        }
#endif
    }
#endif

    o_color = vec4(color * u_saturation);
}

#version 300 es

#if (NUM_TYPES > 4)
#error NUM_TYPES exceeds max value
#endif

precision mediump float;

in vec2 v_uv;

out vec4 o_color;

uniform float u_saturation;
uniform vec4 u_palette[NUM_TYPES];

uniform sampler2D u_field01;
#if (NUM_TYPES > 2)
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
#if (NUM_TYPES > 1)
        {
            float f = length(field.zw);
            color.rgb += u_palette[1].rgb * f;
            color.a += f;
        }
#endif
    }
#if (NUM_TYPES > 2)
    {
        vec4 field = texture(u_field23, v_uv) * 0.5;
        {
            float f = length(field.xy);
            color.rgb += u_palette[2].rgb * f;
            color.a += f;
        }
#if (NUM_TYPES > 3)
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

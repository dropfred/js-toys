"use strict";

import {WebGL} from './webgl.js';
import {Tk} from './tk.js';

window.addEventListener('load', () => {
    const settings = {
        pov  : 0,
        // earth year in seconds
        year : {
            duration : 30,
            min : 1,
            max : 60
        },
        // astronomical unit in pixels
        au : 250,
        // earth size in pixels
        size : 20,
        // fade out tail
        fade : 0.1,
        // zoom
        zoom : {
            level : 2.0,
            min : 0.05,
            max : 4.0
        },
        // apply log to size and distance of log enabled bodies
        log  : false,
        background : [0.02, 0.02, 0.1],
        trail : {
            fade     : 1 / 255,
            size     : 0,
            infinite : 10
        },
        // gl extensions (if available)
        extensions : ['OES_standard_derivatives']
    };

    // https://www.enchantedlearning.com/subjects/astronomy/planets/
    const bodies = [
        {name : 'Sun'    , distance : 0.000, year :   0.00, color : [1.00, 0.82, 0.39], size :  2.5, show: true, log: false},
        {name : 'Mercury', distance : 0.390, year :   0.24, color : [0.47, 0.39, 0.39], size :  0.4, show: true, log: false},
        {name : 'Venus'  , distance : 0.723, year :   0.62, color : [0.61, 0.75, 0.76], size :  0.9, show: true, log: false},
        {name : 'Earth'  , distance : 1.000, year :   1.00, color : [0.08, 0.65, 0.88], size :  1.0, show: true, log: false},
        {name : 'Mars'   , distance : 1.524, year :   1.88, color : [0.84, 0.39, 0.16], size :  0.6, show: true, log: false},
        {name : 'Jupiter', distance : 5.203, year :  11.86, color : [0.88, 0.73, 0.53], size : 11.2, show: true, log: true },
        {name : 'Saturn' , distance : 9.539, year :  29.46, color : [0.51, 0.43, 0.29], size :  9.5, show: true, log: true },
        {name : 'Uranus' , distance : 19.18, year :  84.07, color : [0.24, 0.71, 0.73], size :  4.0, show: true, log: true },
        {name : 'Neptune', distance : 30.06, year : 164.81, color : [0.31, 0.16, 0.59], size :  3.8, show: true, log: true }
    ];

    function map(a, min_a, max_a, min_b, max_b) {
        return ((a - min_a) / (max_a - min_a)) * (max_b - min_b) + min_b;
    }

    function hex2rgb(c) {
        return [
            parseInt(c.slice(1, 3), 16) / 255.0,
            parseInt(c.slice(3, 5), 16) / 255.0,
            parseInt(c.slice(5, 7), 16) / 255.0
        ];
    }

    function rgb2hex(c) {
        return '#' + c.map(rgb => ('0' + Math.trunc(rgb * 255.0).toString(16)).slice(-2)).join('');
    }

    //
    // build ui
    //
    {
        const ui = document.getElementById('ui');
        ui.style.display = 'flex';
        ui.style.flexDirection = 'column';

        const panel = document.createElement('div');
        panel.style.display = 'grid';
        panel.style.padding = '10px';
        panel.style.gap = '10px';
        ui.appendChild(panel);

        let row = 0;

        const label = (txt) => {
            const label = document.createElement('span');
            label.appendChild(document.createTextNode(txt));
            label.style.gridRow = row;
            label.style.gridColumn = 1;
            panel.appendChild(label);
        };

        {
            ++row;

            label('PoV');

            const select = document.createElement('select');
            for (const [i, b] of bodies.entries()) {
                const option = document.createElement("option");
                option.text = b.name;
                option.value = i.toString();
                select.appendChild(option);
            }
            select.style.gridRow = row;
            select.style.gridColumn = 2;
            panel.appendChild(select);
            select.addEventListener('input', () => {
                settings.pov = parseInt(select.value);
                clear();
            });
        }

        {
            ++row;

            label('Trail');

            const range = document.createElement('input');
            range.type  = 'range';
            range.min = 0;
            range.max = settings.trail.infinite;
            range.step = 1;
            range.value = settings.trail.size;
            range.style.gridRow = row;
            range.style.gridColumn = 2;
            panel.appendChild(range);
            range.addEventListener('input', () => {
                const s = parseInt(range.value);
                if ((s > 0) && (settings.trail.size === 0)) {
                    clear();
                }
                settings.trail.size = s;
            });
        }
        {
            ++row;

            label('Show');

            const div = document.createElement('div'); 
            div.style.display = 'grid';
            div.style.justifyContent = 'flex-start';
            for (const [i, b] of bodies.entries()) {
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = b.show;
                cb.style.gridRow = i + 1;
                cb.style.gridColumn = 1;
                div.appendChild(cb);
    
                const label = document.createElement('span');
                label.appendChild(document.createTextNode(b.name));
                label.style.gridRow = i + 1;
                label.style.gridColumn = 2;
                div.appendChild(label);
    
                cb.addEventListener('input', () => {
                    b.show = cb.checked;
                    clear();
                });
            }
            div.style.gridRow = row;
            div.style.gridColumn = 2;
            panel.appendChild(div);
        }
        {
            ++row;

            label('Year');
            
            const range = document.createElement('input');
            range.type  = 'range';
            range.min = settings.year.min;
            range.max = settings.year.max;
            range.step = 1;
            range.value = settings.year.duration;
            range.style.gridRow = row;
            range.style.gridColumn = 2;
            panel.appendChild(range);
            range.addEventListener('input', () => {
                const n = Date.now();
                const v = parseInt(range.value);
                run.time = n - (((n - run.time) * v) / settings.year.duration);
                settings.year.duration = v;
            });
        }
        {
            ++row;

            label('Back');
            
            const cs = document.createElement('input');
            cs.type = 'color';
            cs.value = rgb2hex(settings.background);
            cs.style.gridRow = row;
            cs.style.gridColumn = 2;
            panel.appendChild(cs);
            cs.addEventListener('change', () => {
                settings.background = hex2rgb(cs.value);
                clear();
            });
        }
        {
            ++row;

            label('Log');
            
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = settings.log;
            cb.style.gridRow = row;
            cb.style.gridColumn = 2;
            cb.style.justifySelf = 'flex-start';
            panel.appendChild(cb);
            cb.addEventListener('input', () => {
                settings.log = cb.checked;
                clear();
            });
        }
        {
            const s = document.createElement('div');
            s.style.flexGrow = 1;
            ui.appendChild(s);
        }
        {
            const ul = document.createElement('div');
            ul.style.fontSize = 'x-small';
            ul.style.padding = '10px';
            ul.style.display = 'flex';
            ul.style.flexDirection = 'column';
            ui.appendChild(ul);
            for (const i of ['Mouse wheel: zoom', 'A: align bodies', 'Escape: show/hide settings']) {
                const li = document.createElement('div');
                li.style.margin = 0;
                li.appendChild(document.createTextNode(i));
                ul.appendChild(li);
            }
        }
    }

    //
    // GL
    //
    const gl = document.getElementById('render').getContext('webgl', {
        antialias : false,
        depth : false,
        stencil : false,
        alpha : false,
        premultipliedAlpha : true,
        preserveDrawingBuffer : false
    });

    const wgl = WebGL(gl, {extensions : settings.extensions});

    const render = [
        {
            texture : gl.createTexture(),
            fb : gl.createFramebuffer()
        },
        {
            texture : gl.createTexture(),
            fb : gl.createFramebuffer()
        }
    ];

    function resize() {
        for (const r of render) {
            gl.bindTexture(gl.TEXTURE_2D, r.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
    };

    resize();

    for (const r of render) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, r.fb);
        gl.bindTexture(gl.TEXTURE_2D, r.texture);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, r.texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    (new ResizeObserver(() => {resize(); clear();})).observe(gl.canvas);

    // 2d rectangle
    function Rectangle(gl) {
        const buffer = gl.createBuffer();
        {
            const vertices = new Float32Array([
                1.0,  1.0,
               -1.0,  1.0,
                1.0, -1.0,
               -1.0, -1.0
            ]);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        function draw(material, options = {}) {
            options = Object.assign({}, Tk.opt(options, {}));
            options.uniforms = Tk.opt(options.uniforms, {});
            options.attributes = Tk.opt(options.attributes, {});

            gl.useProgram(material.program);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

            if (options.texture !== undefined) {
                gl.bindTexture(gl.TEXTURE_2D, options.texture);
            }

            material.attribute(Tk.opt(options.attributes.position, 'a_position'), {size : 2});
    
            for (const [u, v] of Object.entries(options.uniforms)) {
                material.uniform(u, v);
            }

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            if (options.texture !== undefined) {
                gl.bindTexture(gl.TEXTURE_2D, null);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        return {
            draw : draw
        };
    }

    const rect = Rectangle(gl);

    // materials
    const material = {};

    {
        const src = {
            vertex : `
                attribute vec2 a_position;

                varying vec2 v_uv0;

                void main()
                {
                    v_uv0 = (a_position + 1.0) * 0.5;
                #if defined(FLIP_S)
                    v_uv0.s = 1.0 - v_uv0.s;
                #endif
                #if defined(FLIP_T)
                    v_uv0.t = 1.0 - v_uv0.t;
                #endif
                    vec2 position = a_position;
                    gl_Position = vec4(position, 0.0, 1.0);
                }
            `,
            fragment : `
                precision mediump float;
                precision mediump sampler2D;

                varying vec2 v_uv0;

                uniform sampler2D u_image;
                #if defined(FADE)
                uniform vec3 u_color;
                uniform float u_rate;
                #endif

                void main()
                {
                    vec4 color = texture2D(u_image, v_uv0);
                #if defined(FADE)
                    color.rgb += clamp(u_color - color.rgb, -vec3(u_rate), vec3(u_rate));
                #endif
                    gl_FragColor = vec4(color.rgb, 1.0);
                }
            `
        };
        const v = wgl.shader.vertex(src.vertex);
        material.copy = wgl.material(wgl.program(v, wgl.shader.fragment(src.fragment)));
        material.fade = wgl.material(wgl.program(v, wgl.shader.fragment(src.fragment, ['FADE'])));
    }

    {
        const src =
        {
            vertex : `
                attribute vec2 a_position;

                varying vec2 v_position;

                uniform vec2 u_size;
                uniform vec2 u_offset;

                void main()
                {
                    v_position = a_position;
                    vec2 position = a_position * u_size;
                    position += u_offset;
                    gl_Position = vec4(position, 0.0, 1.0);
                }
            `,
            fragment : `
                #if defined(GL_OES_standard_derivatives)
                #extension GL_OES_standard_derivatives : enable
                #endif

                precision mediump float;

                varying vec2 v_position;

                uniform vec4 u_color;

                void main()
                {
                    float d = length(v_position);
                    #if defined(GL_OES_standard_derivatives) 
                    float w = fwidth(d) * 2.0;
                    #else
                    float w = 0.2;
                    #endif
                    float a = 1.0 - smoothstep(1.0 - w, 1.0, d);
                    gl_FragColor = vec4(u_color.rgb, u_color.a * a);
                }
            `
        };
        material.body = wgl.material(wgl.program(
            wgl.shader.vertex(src.vertex),
            wgl.shader.fragment(src.fragment)
        ));
    }

    //
    // events
    //
    document.onkeydown = (e) => {
        if (!e.repeat) {
            if (e.key === 'Escape') {
                const ui = document.getElementById('ui');
                ui.style.display = (ui.style.display === 'none') ? 'flex' : 'none';
            } else if (e.key === 'a') {
                clear();
                run.time = Date.now();
            }
        }
    };

	gl.canvas.addEventListener("wheel", (e) => {
        let z = settings.zoom.level + (e.deltaY / map(settings.zoom.level, settings.zoom.min, settings.zoom.max, 5000, 500));
		if      (z < settings.zoom.min) z = settings.zoom.min;
		else if (z > settings.zoom.max) z = settings.zoom.max;
        if (settings.zoom.level !== z) {
            clear();
            settings.zoom.level = z;
        }
	});

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            clear();
        }
    });

    //
    // application
    //
    function clear() {
        for (const r of [... render, null]) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, (r !== null) ? r.fb : null);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clearColor(... settings.background, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
    }

    const run = {
        frame : 0,
        time  : Date.now()
    };

    function draw() {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        const [r, w] = ((run.frame++ & 1) === 0) ? [render[0], render[1]] :  [render[1], render[0]];

        gl.bindFramebuffer(gl.FRAMEBUFFER, w.fb);

        gl.disable(gl.BLEND);
        if (settings.trail.size === 0) {            
            gl.clearColor(... settings.background, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        } else {
            const f = ((settings.trail.size !== settings.trail.infinite) && ((run.frame % settings.trail.size) === 0)) ? settings.trail.fade : 0;
            rect.draw(material.fade, {texture : r.texture, uniforms : {u_color : settings.background, u_rate : f}});
        }

        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        {
            const cx = bodies[settings.pov].x;
            const cy = bodies[settings.pov].y;
            for (const b of bodies) {
                if (b.show) {
                    const size = (settings.log && b.log) ? Math.log2(b.size * 2.0) : b.size;
                    rect.draw(material.body, {uniforms : {
                        u_offset : [
                            ((b.x - cx) * settings.zoom.level) / gl.canvas.width,
                            ((b.y - cy) * settings.zoom.level) / gl.canvas.height
                        ],
                        u_size   : [
                            (size * settings.size * settings.zoom.level) / gl.canvas.width,
                            (size * settings.size * settings.zoom.level) / gl.canvas.height
                        ],
                        u_color  : [... b.color, 1.0]
                    }});
                }
            }
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.disable(gl.BLEND);
        rect.draw(material.copy, {texture : w.texture});
    }
    
    function step() {
        const time = (((Date.now() - run.time) / 1000.0) * (2 * Math.PI)) / settings.year.duration;

        for (const b of bodies) {
            if (b.year !== 0) {
                const d = ((settings.log && b.log) ? Math.log2(b.distance * 2.0) : b.distance) * settings.au;
                const t = time / b.year;
                b.x = d * Math.cos(t);
                b.y = d * Math.sin(t);
            } else {
                b.x = 0;
                b.y = 0;
            }
        }

        draw();
    }

    function loop() {
        step();
        window.requestAnimationFrame(loop);
    }

    loop();
});

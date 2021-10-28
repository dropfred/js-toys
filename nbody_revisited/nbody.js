"use strict";

import {WGL} from './utils/wgl.js';
import {Palette} from './utils/palette.js';
import {Fps} from './utils/fps.js';
import * as Tk from './utils/tk.js';

window.addEventListener('load', async () => {
    function Range(value, min, max, step) {
        return {value, min, max, step};
    }
    const settings = {
        background : [0.02, 0.02, 0.1],
        simulation : {
            nbodies    : Range(1000, 1, 10000, 1),
            nspecies   : Range(2, 1, 4),
            crazy      : Range(0, 0, 7, 1),
            damping    : Range(0.002, 0.0, 0.05, 0.0005),
            velocity   : Range(100, 10, 500),
            gravity    : Range(0, 0, 0.5, 0.05),
            resolution : Range(1, 0, 4)
        },
        body : {
            // size in pixels
            size : Range(15, 1, 100)
        },
        display : {
            body       : true,
            field      : true,
            saturation : Range(0.5, 0, 1, 0.01)
        },
        force : {
            // size in pixels
            range    : Range(125, 0, 250),
            strength : Range(75, 0, 100),
            // decay power
            decay    : Range(1, 0, 3, 0.1),
            zero     : Range(0.01, 0, 0.8, 0.01)
        },
        log : {
            debug : false,
            info : false
        },
        run : {
            max_force : 100
        }
    };

    const canvas = document.getElementById('render');

    //
    // GL
    //

    const gl = canvas.getContext('webgl2', {
        antialias : false,
        depth : false,
        stencil : false,
        alpha : false,
        premultipliedAlpha : true,
        preserveDrawingBuffer : false
    });

    const wgl = WGL(gl, {extensions : ['EXT_color_buffer_float', 'EXT_color_buffer_half_float', 'EXT_float_blend']});

    const SOURCE = {
        VIEWPORT_SIZE        : {},
        BODY_SIZE            : {},
        FORCE_RANGE          : {},
        FORCE_DECAY          : {},
        FORCE_ZERO           : {},
        FORCE_STRENGTH       : {},
        SIMULATION_DAMPING   : {},
        SIMULATION_NSPECIES  : {},
        SIMULATION_VELOCITY  : {},
        SIMULATION_GRAVITY   : {},
        SIMULATION_RANDOM    : {},
        SIMULATION_FORCES    : {manual : true},
        SIMULATION_DT        : {manual : true},
        DISPLAY_SATURATION   : {},
        DISPLAY_PALETTE      : {manual : true}
    };

    const source = (() => {
        const sources = new Map();
        const source = (... args) => {
            if (args.length > 2) {
                const [id, material, uniform, update] = [... args];
                if (!sources.has(id)) {sources.set(id, []);}
                sources.get(id).push({material, uniform, update});
            } else if (args.length > 0) {
                const id = args[0];
                const v = id.manual ? args[1]
                        : (id === SOURCE.VIEWPORT_SIZE      ) ? [canvas.width, canvas.height]
                        : (id === SOURCE.BODY_SIZE          ) ? settings.body.size.value
                        : (id === SOURCE.FORCE_RANGE        ) ? settings.force.range.value
                        : (id === SOURCE.FORCE_DECAY        ) ? settings.force.decay.value
                        : (id === SOURCE.FORCE_ZERO         ) ? settings.force.zero.value
                        : (id === SOURCE.FORCE_STRENGTH     ) ? settings.force.strength.value
                        : (id === SOURCE.SIMULATION_VELOCITY) ? settings.simulation.velocity.value
                        : (id === SOURCE.SIMULATION_GRAVITY ) ? settings.simulation.gravity.value
                        : (id === SOURCE.SIMULATION_DAMPING ) ? settings.simulation.damping.value
                        : (id === SOURCE.SIMULATION_NSPECIES) ? settings.simulation.nspecies.value
                        : (id === SOURCE.SIMULATION_RANDOM  ) ? Math.random()
                        : (id === SOURCE.DISPLAY_SATURATION ) ? settings.display.saturation.value
                        : null;
                if (v === null) {
                    throw "invalid source";
                }
                if (sources.has(id)) {
                    for (const s of sources.get(id)) {
                        const u = (s.update !== undefined) ? s.update(v) : v;
                        if (u !== undefined) {
                            s.material.uniform(s.uniform, u);
                        }
                    }
                }
            } else {
                for (const id of Object.values(SOURCE)) {
                    source(id);
                }
            }
        }
        return source;
    })();

    const field = {
        fb : gl.createFramebuffer(),
        textures : []
    };

    gl.bindFramebuffer(gl.FRAMEBUFFER, field.fb);
    for (let i = 0; i < Math.trunc((settings.simulation.nspecies.max + 1) / 2); ++i) {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0);
        field.textures.push(t);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // materials
    const material = {};
    {
        const src = {
            vertex   : await fetch('shaders/draw_body-vs.glsl').then(r => r.text()),
            fragment : await fetch('shaders/draw_body-fs.glsl').then(r => r.text())
        };
        material.draw_body = wgl.material(wgl.program(
            wgl.shader.vertex(src.vertex, [`MAX_SPECIES=${settings.simulation.nspecies.max}`, 'NORMALIZE']),
            wgl.shader.fragment(src.fragment, ['AA=2.0'])
        ));
        source(SOURCE.BODY_SIZE, material.draw_body, 'u_size');
        source(SOURCE.DISPLAY_PALETTE, material.draw_body, 'u_palette');
        material.draw_body_point = wgl.material(wgl.program(
            wgl.shader.vertex(src.vertex, [`MAX_SPECIES=${settings.simulation.nspecies.max}`, 'NORMALIZE']),
            wgl.shader.fragment(src.fragment, ['POINT'])
        ));
        source(SOURCE.BODY_SIZE, material.draw_body_point, 'u_size');
        source(SOURCE.DISPLAY_PALETTE, material.draw_body_point, 'u_palette');
    }
    // TODO : check how significantly perfs increase with 2 shaders (2/4 species) rather than just 1 (4 species)
    {
        const src = {
            vertex   : await fetch('shaders/update_field-vs.glsl').then(r => r.text()),
            fragment : await fetch('shaders/update_field-fs.glsl').then(r => r.text())
        };
        material.update_field = wgl.material(wgl.program(
            wgl.shader.vertex(src.vertex, [`MAX_SPECIES=${settings.simulation.nspecies.max}`, 'NORMALIZE']),
            wgl.shader.fragment(src.fragment, [`MAX_SPECIES=${settings.simulation.nspecies.max}`,])
        ));
        source(
            SOURCE.FORCE_RANGE, material.update_field, 'u_range',
            r => r * (1.0 / (2 ** (settings.simulation.resolution.max - settings.simulation.resolution.value)))
        );
        source(SOURCE.FORCE_DECAY, material.update_field, 'u_decay');
        source(SOURCE.FORCE_ZERO , material.update_field, 'u_zero');
    }
    {
        const src = {
            update_vertex : await fetch('shaders/update_dynamics-vs.glsl').then(r => r.text()),
            reset_vertex  : await fetch('shaders/reset_dynamics-vs.glsl').then(r => r.text()),
            fragment      : await fetch('shaders/update_dynamics-fs.glsl').then(r => r.text())
        };
        material.update_dynamics = wgl.material(
            wgl.program(
                wgl.shader.vertex(src.update_vertex, [
                    `MAX_SPECIES=${settings.simulation.nspecies.max}`,
                    'MAX_VELOCITY',
                    'NORMALIZE',
                    // 'NOISE',
                    'BORDER=BOUNCE_HARD'
                ]),
                wgl.shader.fragment(src.fragment),
                ['v_position', 'v_velocity', 'v_acceleration']
            )
        );
        material.update_dynamics_soft = wgl.material(
            wgl.program(
                wgl.shader.vertex(src.update_vertex, [
                    `MAX_SPECIES=${settings.simulation.nspecies.max}`,
                    'MAX_VELOCITY',
                    'NORMALIZE',
                    // 'NOISE',
                    'BORDER=BOUNCE_SOFT'
                ]),
                wgl.shader.fragment(src.fragment),
                ['v_position', 'v_velocity', 'v_acceleration']
            )
        );
        material.reset_dynamics = wgl.material(
            wgl.program(
                wgl.shader.vertex(src.reset_vertex, ['RAND', 'SEED']),
                wgl.shader.fragment(src.fragment),
                ['v_position', 'v_velocity', 'v_acceleration']
            )
        );
        for (const m of [material.update_dynamics, material.update_dynamics_soft]) {
            gl.useProgram(m.program);
            {
                let a = 0;
                m.uniform('u_field01', a++);
                if (settings.simulation.nspecies.max > 2) {
                    m.uniform('u_field23', a++);
                }
            }
            source(SOURCE.FORCE_STRENGTH, m, 'u_strength');
            source(SOURCE.SIMULATION_DAMPING, m, 'u_damping');
            source(SOURCE.SIMULATION_DT, m, 'u_dt');
            source(SOURCE.SIMULATION_FORCES, m, 'u_forces');
            source(SOURCE.SIMULATION_VELOCITY, m, 'u_max_velocity');
            source(SOURCE.SIMULATION_GRAVITY, m, 'u_gravity', g => [0, -(g * settings.force.range.max)]);
        }
        source(SOURCE.VIEWPORT_SIZE, material.reset_dynamics, 'u_size', (wh) => [(wh[0] / 2), (wh[1] / 2)]);
        source(SOURCE.SIMULATION_VELOCITY, material.reset_dynamics, 'u_velocity');
        source(SOURCE.SIMULATION_RANDOM, material.reset_dynamics, 'u_seed', r => Math.round(r * 0xffffff));
        material.reset_dynamics.uniform('u_position', 1);
    }
    {
        const src = {
            vertex   : await fetch('shaders/rectangle-vs.glsl').then(r => r.text()),
            fragment : await fetch('shaders/draw_field-fs.glsl').then(r => r.text())
        };
        material.draw_field = wgl.material(wgl.program(
            wgl.shader.vertex(src.vertex, ['TEXTURE']),
            wgl.shader.fragment(src.fragment, [`MAX_SPECIES=${settings.simulation.nspecies.max}`])
        ));
        material.draw_field.uniform('u_size', [1.0, 1.0]);
        material.draw_field.uniform('u_offset', [0.0, 0.0]);
        material.draw_field.uniform('u_field01', 0);
        if (settings.simulation.nspecies.max > 2) {
            material.draw_field.uniform('u_field23', 1);
        }
        source(
            SOURCE.DISPLAY_SATURATION, material.draw_field,
            'u_saturation', s => s ** Math.log10(settings.simulation.nbodies.value * (2 ** settings.simulation.crazy.value))
        );
        source(SOURCE.DISPLAY_PALETTE, material.draw_field, 'u_palette');
    }

    for (const m of [
        material.update_field,
        material.update_dynamics,
        material.update_dynamics_soft,
        material.draw_body,
        material.draw_body_point
    ]) {
        source(SOURCE.VIEWPORT_SIZE, m, 'u_scale', (wh) => [2.0 / wh[0], 2.0 / wh[1]]);
        source(SOURCE.SIMULATION_NSPECIES, m, 'u_nspecies');
    }

    const vbo = {
        dynamics : [gl.createBuffer(), gl.createBuffer()]
    };

    function body() {
        const d = new Float32Array(settings.simulation.nbodies.max * (2 ** settings.simulation.crazy.value) * 24);
        for (const v of vbo.dynamics) {
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.bufferData(gl.ARRAY_BUFFER, d, gl.STREAM_DRAW);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        reset_dynamics();
    }

    // TODO : uniform blocks

    const render = [
        {display : gl.createVertexArray(), update : gl.createVertexArray(), feedback : gl.createTransformFeedback()},
        {display : gl.createVertexArray(), update : gl.createVertexArray(), feedback : gl.createTransformFeedback()}
    ];

    for (const [i, r] of render.entries()) {
        gl.bindVertexArray(r.display);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo.dynamics[i]);
        for (const m of [
            material.draw_body,
            material.update_field
        ]) {
            m.attribute('a_position', {stride : 24});
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);

        gl.bindVertexArray(r.update);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo.dynamics[i]);
        for (const m of [material.update_dynamics, material.update_dynamics_soft]) {
            m.attribute('a_position'    , {stride : 24, offset : 0});
            m.attribute('a_velocity'    , {stride : 24, offset : 8});
            // m.attribute('a_acceleration', {stride : 24, offset : 16});
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);

        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, r.feedback);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, vbo.dynamics[(i + 1) % 2]);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    }

    function resize(w, h) {
        if (arguments.length === 0) {
            w = canvas.width;
            h = canvas.height;
        }
        const r = (1.0 / (2 ** (settings.simulation.resolution.max - settings.simulation.resolution.value)));
        if (settings.log.debug) {
            console.debug('### resolution', r);
        }
        for (const t of field.textures) {
            gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w * r, h * r, 0, gl.RGBA, gl.FLOAT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        source(SOURCE.VIEWPORT_SIZE);
    };

    function palette() {
        const cs = run.palette(settings.simulation.nspecies.max).map(c => [... c, 1.0]).flat();
        source(SOURCE.DISPLAY_PALETTE, cs);
    }

    // TODO : ensure more variety
    function force() {
        const fs = [];
        for (let a = 0; a < settings.simulation.nspecies.max; ++a) {
            for (let b = 0; b < settings.simulation.nspecies.max; ++b) {
                fs.push(Math.random() * 0.5 + ((a === b) ? 0 : 0.5));
            }
        }
        source(SOURCE.SIMULATION_FORCES, fs);
        if (settings.log.info) {
            console.info('### forces', JSON.stringify(fs));
        }
    }

    function update_dynamics(render, reset = false) {
        const [bs, p]  = reset ? [settings.simulation.nbodies.max  , material.reset_dynamics.program]
                               : [settings.simulation.nbodies.value, run.update.program];
        gl.useProgram(p);
        {
            let a = 0;
            gl.activeTexture(gl.TEXTURE0 + a++);
            gl.bindTexture(gl.TEXTURE_2D, field.textures[0]);
            if (settings.simulation.nspecies.max > 2) {
                gl.activeTexture(gl.TEXTURE0 + a++);
                gl.bindTexture(gl.TEXTURE_2D, field.textures[1]);
            }
            gl.activeTexture(gl.TEXTURE0 + a);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.bindVertexArray(render.update);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, render.feedback);
        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.disable(gl.BLEND);
        gl.drawArrays(gl.POINTS, 0, bs * (2 ** settings.simulation.crazy.value));
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function reset_dynamics() {
        for (const r of render) {update_dynamics(r, true);}
        reset_field();
    }

    function update_field(render, clear = false) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, field.fb);
        {
            const r = (1.0 / (2 ** (settings.simulation.resolution.max - settings.simulation.resolution.value)));
            gl.viewport(0, 0, gl.canvas.width * r, gl.canvas.height * r);
        }
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, (clear || (settings.simulation.nspecies.value > 2)) ? gl.COLOR_ATTACHMENT1 : gl.NONE]);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!clear) {
            gl.bindVertexArray(render.display);
            gl.useProgram(material.update_field.program);
            gl.enable(gl.BLEND);
            gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
            gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
            gl.drawArrays(gl.POINTS, 0, settings.simulation.nbodies.value * (2 ** settings.simulation.crazy.value));
            gl.bindVertexArray(null);
            if (run.force !== null) {
                gl.vertexAttrib2f(material.update_field.attribute('a_position'), run.force.x, run.force.y);
                gl.useProgram(material.update_field.program);
                gl.drawArrays(gl.POINTS, 0, run.force.n);
            }
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function reset_field() {
        for (const r of render) {update_field(r, true);}
    }

    function draw(render) {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(... settings.background, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (settings.display.field) {
            gl.useProgram(material.draw_field.program);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, field.textures[0]);
            gl.activeTexture(gl.TEXTURE1);
            if (settings.simulation.nspecies.max > 2) {
                gl.bindTexture(gl.TEXTURE_2D, field.textures[1]);
            } else {
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
            gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
            //gl.blendFuncSeparate(gl.ONE_MINUS_DST_ALPHA, gl.ONE, gl.ONE, gl.ONE);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.bindTexture(gl.TEXTURE_2D, null);

            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
            gl.bindVertexArray(null);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.useProgram(null);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }

        if (settings.display.body) {
            gl.bindVertexArray(render.display);
            gl.useProgram(((settings.body.size.value > 4) ? material.draw_body :  material.draw_body_point).program);
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArrays(gl.POINTS, 0, settings.simulation.nbodies.value * (2 ** settings.simulation.crazy.value));
            gl.bindVertexArray(null);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }
    }

    function update(dt) {
        const r = render[run.frame & 1];

        gl.disable(gl.DEPTH_TEST);
        gl.colorMask(true, true, true, true);
        gl.depthMask(false);

        source(SOURCE.SIMULATION_DT, dt);

        if ((run.force !== null) && (run.force.n < settings.run.max_force)) {
            ++run.force.n;
        }

        update_field(r);
        draw(r);
        update_dynamics(r);
    }

    //
    // build ui (boring...)
    //

    function hex_rgb(c) {
        return [
            parseInt(c.slice(1, 3), 16) / 255.0,
            parseInt(c.slice(3, 5), 16) / 255.0,
            parseInt(c.slice(5, 7), 16) / 255.0
        ];
    }

    function rgb_hex(c) {
        return '#' + c.map(rgb => ('0' + Math.trunc(rgb * 255.0).toString(16)).slice(-2)).join('');
    }

    {
        const ui = document.getElementById('ui');
        ui.style.display = 'flex';
        ui.style.flexDirection = 'column';

        const panel = document.createElement('div');
        panel.style.display = 'grid';
        panel.style.padding = '5px';
        panel.style.gap = '5px';
        ui.appendChild(panel);

        const deps = {};
        const update_deps = () => {
            deps.saturation.disabled = !deps.draw_field.checked;
            deps.info();
        };

        const Range = (r, u, cb = 'input', s) => {
            const span = document.createElement('span');
            const range = document.createElement('input');
            range.type  = 'range';
            range.min = r.min;
            range.max = r.max;
            if (r.step !== undefined) {
                range.step = r.step;
            }
            range.value = r.value;
            const info = document.createElement('span');
            info.style.fontSize = 'x-small';
            span.appendChild(range);
            span.appendChild(info);
            const sync = () => {
                let t = range.value.toString();
                if (s !== undefined) {
                    t = s(t);
                }
                info.innerHTML = t;
            };
            if (u !== undefined) {
                range.addEventListener(cb, () => {
                    sync();
                    u(range.value);
                });
            }
            sync();
            return span;
        };
        const row = (() => {
            let nrs = 0;
            return (name, element) => {
                ++nrs;

                const label = document.createElement('span');
                label.appendChild(document.createTextNode(name));
                panel.appendChild(label);
                if (element !== undefined) {
                    label.style.gridRow = nrs;
                    label.style.gridColumn = 1;
                    //label.style.fontSize = 'small';
                    element.style.gridRow = nrs;
                    element.style.gridColumn = 2;
                    panel.appendChild(element);
                } else {
                    label.style.fontSize = 'large';
                    label.style.fontWeight = 'bold';
                    label.style.gridRow = nrs;
                    label.style.gridColumnStart = 1
                    label.style.gridColumnEnd = 'gap 2';
                }
                return element;
            };
        })();

        row('Simulation');
        row('Species', Range(settings.simulation.nspecies, (v) => {
            v = parseInt(v);
            if ((v <= 2) && (settings.simulation.nspecies.value > 2)) {
                reset_field();
            }
            settings.simulation.nspecies.value = parseInt(v);
            source(SOURCE.SIMULATION_NSPECIES);
        }, 'change'));
        {
            const s = Range(settings.simulation.nbodies, (v) => {
                settings.simulation.nbodies.value = parseInt(v);
            }, 'input', v => `${parseInt(v) * (2 ** settings.simulation.crazy.value)}`);
            const i = s.children[1];
            deps.info = () => {
                i.innerHTML = `${settings.simulation.nbodies.value * (2 ** settings.simulation.crazy.value)}`;
            };
            row('Bodies', s);
        }
        row('Velocity', Range(settings.simulation.velocity, (v) => {
            settings.simulation.velocity.value = parseFloat(v);
            source(SOURCE.SIMULATION_VELOCITY);
        }));
        row('Gravity', Range(settings.simulation.gravity, (v) => {
            settings.simulation.gravity.value = parseFloat(v);
            source(SOURCE.SIMULATION_GRAVITY);
        }));
        row('Damping', Range(settings.simulation.damping, (v) => {
            settings.simulation.damping.value = parseFloat(v);
            source(SOURCE.SIMULATION_DAMPING);
        }));
        {
            const select = document.createElement('select');
            for (const m of ['Bounce hard', 'Bounce soft']) {
                const option = document.createElement('option');
                option.appendChild(document.createTextNode(m));
                select.appendChild(option);
            }
            select.addEventListener('change', () => {
                switch (select.selectedIndex) {
                    case 0 : run.update = material.update_dynamics; break;
                    case 1 : run.update = material.update_dynamics_soft; break;
                }
            });
            row('Border', select);
        }
        row('Go crazy', Range(settings.simulation.crazy, (v) => {
            settings.simulation.crazy.value = parseInt(v);
            body();
            update_deps();
        }, 'change'));
        row('Body');
        row('Size', Range(settings.body.size, (v) => {
            settings.body.size.value = parseFloat(v);
            source(SOURCE.BODY_SIZE);
        }));
        row('Force');
        row('Factor', Range(settings.force.strength, (v) => {
            settings.force.strength.value = parseFloat(v);
            source(SOURCE.FORCE_STRENGTH);
        }));
        row('Range', Range(settings.force.range, (v) => {
            settings.force.range.value = parseFloat(v);
            source(SOURCE.FORCE_RANGE);
        }));
        row('Decay', Range(settings.force.decay, (v) => {
            settings.force.decay.value = parseFloat(v);
            source(SOURCE.FORCE_DECAY);
        }));
        row('Zero', Range(settings.force.zero, (v) => {
            settings.force.zero.value = parseFloat(v);
            source(SOURCE.FORCE_ZERO);
        }));
        row('Resolution', Range({value : 1, min : 0, max : 4, step : 1}, (v) => {
            settings.simulation.resolution.value = parseInt(v);
            resize();
            source(SOURCE.FORCE_RANGE);
        }));
        row('Display');
        {
            const cs = document.createElement('input');
            cs.type = 'color';
            cs.value = rgb_hex(settings.background);
            cs.addEventListener('input', () => {
                settings.background = hex_rgb(cs.value);
            });
            row('Back', cs);
        }
        {
            const div = document.createElement('div');
            div.style.display = 'grid';
            div.style.justifyContent = 'flex-start';
            for (const [i, s] of ['body', 'field'].entries()) {
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = settings.display[s];
                cb.style.gridRow = i + 1;
                cb.style.gridColumn = 1;
                div.appendChild(cb);
                const label = document.createElement('span');
                label.appendChild(document.createTextNode(s));
                label.style.gridRow = i + 1;
                label.style.gridColumn = 2;
                div.appendChild(label);
                cb.addEventListener('input', () => {
                    settings.display[s] = cb.checked;
                    update_deps();
                });
                if (s == 'field') {
                    deps.draw_field = cb;
                }
            }
            row('Draw', div);
        }
        deps.saturation = row('Saturation', Range(settings.display.saturation, (v) => {
            settings.display.saturation.value = parseFloat(v);
            source(SOURCE.DISPLAY_SATURATION);
        }));
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
            for (const i of [
                'F : randomize force',
                'C : change palette',
                'R : reset random',
                'B : reset big bang',
                'Click : apply force',
                'Space : freeze time',
                'Escape : show/hide settings'
            ]) {
                const li = document.createElement('div');
                li.style.margin = 0;
                li.appendChild(document.createTextNode(i));
                ul.appendChild(li);
            }
        }
    }

    //
    // events
    //

    document.onkeydown = (e) => {
        if (!e.repeat) {
            if (e.key === 'Escape') {
                const ui = document.getElementById('ui');
                ui.style.display = (ui.style.display === 'none') ? 'flex' : 'none';
            } else if (e.key === ' ') {
                run.freeze = !run.freeze;
            } else if (e.key.toUpperCase() === 'C') {
                palette();
            } else if (e.key.toUpperCase() === 'F') {
                force();
            } else if (e.key.toUpperCase() === 'R') {
                source(SOURCE.SIMULATION_RANDOM);
                material.reset_dynamics.uniform('u_position', 1);
                reset_dynamics();
            } else if (e.key.toUpperCase() === 'B') {
                material.reset_dynamics.uniform('u_position', 0);
                reset_dynamics();
            } else if (e.key.toUpperCase() === 'D') {
                settings.log.debug = !settings.log.debug;
            } else if (e.key.toUpperCase() === 'I') {
                settings.log.info = !settings.log.info;
            }
        }
    };

    canvas.addEventListener('mousedown', e => {
        run.force = {x : e.x - (canvas.width / 2), y : (canvas.height / 2) - e.y, n : 1};
    });
    canvas.addEventListener('mousemove', e => {
        if (run.force !== null) {
            run.force.x = e.x - (canvas.width / 2);
            run.force.y = (canvas.height / 2) - e.y;
        }
    });
    canvas.addEventListener('mouseup', e => {
        run.force = null;
    });

    wgl.addObserver(wgl.EVENT.VISIBILITY, v => {
        run.time = 0;
    });

    wgl.addObserver(wgl.EVENT.RESIZE, (w, h) => {
        resize(w, h);
    });

    //
    // application
    //

    const fps = Fps();

    function step() {
        if (fps.tick() > 1) {
            if (settings.log.debug) {console.info('fps', fps.get());}
            fps.get();
        }
        const t = Date.now();
        const dt = (run.freeze || (run.time === 0)) ? 0 : (t - run.time) / 1000.0;
        update(dt);
        run.time = t;
        ++run.frame;
    }

    function loop() {
        step();
        window.requestAnimationFrame(loop);
    }

    const run = {
        frame   : 0,
        time    : 0,
        freeze  : false,
        palette : Palette(),
        update  : material.update_dynamics,
        force   : null
    };

    force();
    palette();
    source();
    resize();
    body();

    loop();
});

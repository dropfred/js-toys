"use strict";

import {WGL} from './utils/wgl.js';
import {Palette} from './utils/palette.js';
import {Fps} from './utils/fps.js';
import {Source, SourceValue} from './utils/source.js';
import {opt, combine, choice, remap} from './utils/tk.js';
import {Pointer, Touch, Tap, Swipe, Box} from './utils/pointer.js';

window.addEventListener('load', async () => {
    const ENABLE_NEGATIVE_FORCE = false;
    const ENABLE_MASS = false;
    const ENABLE_UI_ZERO = false;

    function Range(value, min, max, step) {
        const r = new SourceValue(value, v => Math.min(Math.max(v, min), max));
        Object.assign(r, {min, max, step});
        return r;
    }

    const settings = {
        simulation : {
            nbodies    : Range(5000, 1, 10000),
            nspecies   : Range(3, 1, 4),
            grow       : Range(0, 0, 7),
            damping    : Range(0.2, 0, 1, 0.1),
            velocity   : Range(100, 10, 500),
            gravity    : Range(0, 0, 0.5, 0.05),
            resolution : Range(0, 0, 4),
            border     : new SourceValue('wrap'),
            random     : Source()
        },
        body : {
            size : Range(10, 1, 50)
        },
        display : {
            background : [0.02, 0.02, 0.1],
            body       : new SourceValue(true),
            field      : new SourceValue(true),
            glow       : new SourceValue(true),
            saturation : Range(0.5, 0, 1, 0.01),
            palette    : Source()
        },
        force : {
            range    : Range(50, 0, 150),
            strength : Range(0.6, 0, 1, 0.05),
            decay    : Range(1, 0, 3, 0.1),
            zero     : Range(0.01, 0.01, 0.8, 0.01),
            max      : 100
        },
        runtime : {
            frame   : 0,
            time    : 0,
            dt      : Source(),
            size    : Source(),
            forces  : Source(),
            masses  : Source(),
            palette : Palette(),
            freeze  : false,
            touch   : {
                n     : 0,
                time  : 0,
                force : new SourceValue(0, v => Math.min(v, 100)),
                delay : 250,
                reset : 0
            }
        },
        log : {
            debug : false,
            info  : false
        }
    };

    const device = {
        pixel_ratio : /*opt(window.devicePixelRatio, 1)*/1
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
    if (gl === null) {
        window.alert('WebGL 2 not supported');
        return;
    }

    const extensions = ['EXT_color_buffer_float', 'EXT_float_blend'];
    const wgl = WGL(gl, {extensions : extensions, scale : device.pixel_ratio});
    if (Object.keys(wgl.extensions).length !== extensions.length) {
        window.alert(`Extension(s) not supported (${extensions.filter(e => !(e in wgl.extensions))}), may not work correctly`);
    }
    
    // materials

    function source_uniform(src, material, uniform, map) {
        src.addListener((... v) => {
            if (map !== undefined) {
                material.uniform(uniform, map(... v));
            } else {
                material.uniform(uniform, ... v);
            }
        });
    }

    const material = {};
    {
        const src = {
            vertex        : await fetch('shaders/rectangle-vs.glsl').then(r => r.text()),
            fragment      : await fetch('shaders/rectangle-fs.glsl').then(r => r.text()),
            fragment_fade : await fetch('shaders/fade-fs.glsl').then(r => r.text())
        };
        material.rectangle = wgl.material(wgl.program(
            wgl.shader.vertex(src.vertex),
            wgl.shader.fragment(src.fragment)
        ));
        material.rectangle_fade = wgl.material(wgl.program(
            wgl.shader.vertex(src.vertex, ['TEXTURE']),
            wgl.shader.fragment(src.fragment_fade)
        ));
    }
    {
        const src = {
            vertex   : await fetch('shaders/draw_body-vs.glsl').then(r => r.text()),
            fragment : await fetch('shaders/draw_body-fs.glsl').then(r => r.text())
        };
        material.draw_body = wgl.material(wgl.program(
            wgl.shader.vertex(src.vertex, [`MAX_SPECIES=${settings.simulation.nspecies.max}`, 'NORMALIZE']),
            wgl.shader.fragment(src.fragment, ['AA=2.0'])
        ));
        material.draw_body_point = wgl.material(wgl.program(
            wgl.shader.vertex(src.vertex, [`MAX_SPECIES=${settings.simulation.nspecies.max}`, 'NORMALIZE']),
            wgl.shader.fragment(src.fragment, ['POINT'])
        ));
        material.draw_body_glow = wgl.material(wgl.program(
            wgl.shader.vertex(src.vertex, [`MAX_SPECIES=${settings.simulation.nspecies.max}`, 'NORMALIZE']),
            wgl.shader.fragment(src.fragment, ['AA=2.0', 'DECAY'])
        ));
        for (const m of [material.draw_body, material.draw_body_point, material.draw_body_glow]) {
            source_uniform(settings.body.size, m, 'u_size', (m === material.draw_body_glow) ? (s => s * 2) : undefined);
            source_uniform(settings.display.palette, m, 'u_palette');
        }
        material.draw_body_glow.uniform('u_decay', 1);
    }
    {
        const src = {
            vertex   : await fetch('shaders/update_field-vs.glsl').then(r => r.text()),
            fragment : await fetch('shaders/update_field-fs.glsl').then(r => r.text())
        };
        material.update_field = wgl.material(wgl.program(
            wgl.shader.vertex(src.vertex, [`MAX_SPECIES=${settings.simulation.nspecies.max}`, 'NORMALIZE']),
            wgl.shader.fragment(src.fragment, [`MAX_SPECIES=${settings.simulation.nspecies.max}`,])
        ));
        source_uniform(settings.force.range, material.update_field, 'u_range');
        source_uniform(settings.force.decay, material.update_field, 'u_decay');
        source_uniform(settings.force.zero, material.update_field, 'u_zero');
        material.update_field.uniform('u_resolution', 1);
    }
    {
        const src = {
            update_vertex : await fetch('shaders/update_dynamics-vs.glsl').then(r => r.text()),
            reset_vertex  : await fetch('shaders/reset_dynamics-vs.glsl').then(r => r.text()),
            fragment      : await fetch('shaders/update_dynamics-fs.glsl').then(r => r.text())
        };
        material.update_dynamics_bounce = wgl.material(
            wgl.program(
                wgl.shader.vertex(src.update_vertex, [
                    `MAX_SPECIES=${settings.simulation.nspecies.max}`,
                    'MAX_VELOCITY',
                    'NORMALIZE',
                    ENABLE_MASS ? 'MASS' : '',
                    // 'NOISE',
                    'BORDER=BORDER_BOUNCE_SOFT'
                ]),
                wgl.shader.fragment(src.fragment),
                ['v_position', 'v_velocity', 'v_acceleration']
            )
        );
        material.update_dynamics_wrap = wgl.material(
            wgl.program(
                wgl.shader.vertex(src.update_vertex, [
                    `MAX_SPECIES=${settings.simulation.nspecies.max}`,
                    'MAX_VELOCITY',
                    'NORMALIZE',
                    ENABLE_MASS ? 'MASS' : '',
                    // 'NOISE',
                    'BORDER=BORDER_WRAP'
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
        for (const m of [material.update_dynamics_bounce, material.update_dynamics_wrap]) {
            let a = 0;
            m.uniform('u_field01', a++);
            if (settings.simulation.nspecies.max > 2) {
                m.uniform('u_field23', a++);
            }
            m.uniform('u_strength', settings.force.max);
            source_uniform(settings.force.strength, m, 'u_factor');
            source_uniform(settings.simulation.damping, m, 'u_damping');
            source_uniform(settings.simulation.velocity, m, 'u_max_velocity');
            source_uniform(settings.simulation.gravity, m, 'u_gravity', g => [0, -(g * settings.force.range.max)]);
            source_uniform(settings.runtime.dt, m, 'u_dt');
            source_uniform(settings.runtime.forces, m, 'u_force');
            if (ENABLE_MASS) {
                source_uniform(settings.runtime.masses, m, 'u_mass');
            }
        }
        material.reset_dynamics.uniform('u_position', 1);
        source_uniform(settings.simulation.velocity, material.reset_dynamics, 'u_velocity');
        source_uniform(settings.simulation.random, material.reset_dynamics, 'u_seed', r => Math.round(r * 0xffffff));
        source_uniform(settings.runtime.size, material.reset_dynamics, 'u_size', (w, h) => [(w / 2), (h / 2)]);
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
        material.draw_field.uniform('u_field01', 0);
        if (settings.simulation.nspecies.max > 2) {
            material.draw_field.uniform('u_field23', 1);
        }
        source_uniform
        (
            settings.display.saturation,
            material.draw_field, 'u_saturation',
            s => s ** Math.log10(settings.simulation.nbodies.value * (2 ** settings.simulation.grow.value))
        );
        source_uniform(settings.display.palette, material.draw_field, 'u_palette');
    }

    for (const m of [
        material.update_field,
        material.update_dynamics_bounce,
        material.update_dynamics_wrap,
        material.draw_body,
        material.draw_body_glow,
        material.draw_body_point
    ]) {
        source_uniform(settings.simulation.nspecies, m, 'u_nspecies');
        source_uniform(settings.runtime.size, m, 'u_scale', (w, h) => [2.0 / w, 2.0 / h]);
    }

    // vertex buffers
    const vbo = {
        dynamics : [gl.createBuffer(), gl.createBuffer()]
    };

    function update_buffer() {
        const d = new Float32Array(settings.simulation.nbodies.max * (2 ** settings.simulation.grow.value) * 24);
        for (const v of vbo.dynamics) {
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.bufferData(gl.ARRAY_BUFFER, d, gl.STREAM_DRAW);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        reset_dynamics();
    }

    const render = [
        {display : gl.createVertexArray(), update : gl.createVertexArray(), feedback : gl.createTransformFeedback()},
        {display : gl.createVertexArray(), update : gl.createVertexArray(), feedback : gl.createTransformFeedback()}
    ];

    for (const [i, r] of render.entries()) {
        gl.bindVertexArray(r.display);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo.dynamics[i]);
        for (const m of [
            material.draw_body,
            material.draw_body_glow,
            material.draw_body_point,
            material.update_field
        ]) {
            m.attribute('a_position', {stride : 24});
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);

        gl.bindVertexArray(r.update);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo.dynamics[i]);
        for (const m of [material.update_dynamics_bounce, material.update_dynamics_wrap]) {
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

    // field frame buffer
    // https://www.khronos.org/opengl/wiki/Framebuffer_Object
    // https://www.khronos.org/webgl/wiki/HandlingHighDPI
    const field = {
        fb : gl.createFramebuffer(),
        textures : [],
        // store size since texture size can't be retrieved thru getTexLevelParameteriv (GL ES 3.1)
        size : {width : 0, height : 0}
    };
    {
        for (let i = 0; i < Math.trunc((settings.simulation.nspecies.max + 1) / 2); ++i) {
            field.textures.push(gl.createTexture());
        }
        resize_field(1, 1);
    }

    function resize_field(w, h, r = 1) {
        w = Math.trunc(w * r);
        h = Math.trunc(h * r);
        if ((w !== field.size.width) || (h !== field.size.height)) {
            for (const t of field.textures) {
                gl.bindTexture(gl.TEXTURE_2D, t);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.FLOAT, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
            material.update_field.uniform('u_resolution', r);
            field.size.width  = w;
            field.size.height = h;
        }
    };

    gl.bindFramebuffer(gl.FRAMEBUFFER, field.fb);
    for (const [i, t] of field.textures.entries()) {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    {
        const s = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (s !== gl.FRAMEBUFFER_COMPLETE) {
            const e = (s === gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT        ) ? 'FRAMEBUFFER_INCOMPLETE_ATTACHMENT'
                    : (s === gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT) ? 'FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT'
                    : (s === gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS        ) ? 'FRAMEBUFFER_INCOMPLETE_DIMENSIONS'
                    : (s === gl.FRAMEBUFFER_UNSUPPORTED                  ) ? 'FRAMEBUFFER_UNSUPPORTED'
                    : (s === gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT        ) ? 'FRAMEBUFFER_INCOMPLETE_ATTACHMENT'
                    : ((wgl.version >= wgl.VERSION.WGL_2) && (s === gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE)) ?'FRAMEBUFFER_INCOMPLETE_MULTISAMPLE'
                    : 'unknown error';
            console.error('### incomplete framebuffer', e);
        }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    function resize(w, h) {
        if (arguments.length === 0) {
            w = canvas.width;
            h = canvas.height;
        }
        resize_field(w, h, 1.0 / (2 ** (settings.simulation.resolution.max - settings.simulation.resolution.value)));
        settings.runtime.size.notify(w, h);
    };

    function update_palette() {
        const cs = settings.runtime.palette(settings.simulation.nspecies.max).map(c => [... c, 1.0]).flat();
        settings.display.palette.notify(cs);
    }

    function update_force() {
        const fs = [];
        for (let a = 0; a < settings.simulation.nspecies.max; ++a) {
            const r = Math.random() * 0.4 + 0.1;
            for (let b = 0; b < settings.simulation.nspecies.max; ++b) {
                fs.push((a === b) ? r : r + Math.random() * (0.9 - r) + 0.1);
            }
        }
        settings.runtime.forces.notify(fs);
        if (settings.log.info) {
            console.info('### forces', JSON.stringify(fs));
        }
        return fs;
    }

    function update_mass() {
        const ms = [];
        for (let i = 0; i < settings.simulation.nspecies.max; ++i) {
            ms.push(2 ** remap(Math.random(), -3, 3));
        }
        settings.runtime.masses.notify(ms);
        if (settings.log.info) {
            console.info('### masses', JSON.stringify(ms));
        }
        return ms;
    }

    function update_dynamics(render, reset = false) {
        const bs = reset ? settings.simulation.nbodies.max : settings.simulation.nbodies.value;
        const m = reset                                           ? material.reset_dynamics
                : (settings.simulation.border.value === 'bounce') ? material.update_dynamics_bounce
                :                                                   material.update_dynamics_wrap;
        gl.useProgram(m.program);
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
        gl.drawArrays(gl.POINTS, 0, bs * (2 ** settings.simulation.grow.value));
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function reset_dynamics(position, offset) {
        position = opt(position, 1);
        offset = opt(offset, [0, 0]);
        material.reset_dynamics.uniform('u_position', position);
        material.reset_dynamics.uniform('u_offset', offset);
        for (const r of render) {update_dynamics(r, true);}
        reset_field();
    }

    function update_field(render, reset = false) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, field.fb);
        gl.viewport(0, 0, field.size.width, field.size.height);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, (reset || (settings.simulation.nspecies.value > 2)) ? gl.COLOR_ATTACHMENT1 : gl.NONE]);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        function draw(x, y) {
            gl.bindVertexArray(render.display);
            gl.useProgram(material.update_field.program);
            gl.enable(gl.BLEND);
            gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
            gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
            material.update_field.uniform('u_offset', [x, y]);
            gl.drawArrays(gl.POINTS, 0, settings.simulation.nbodies.value * (2 ** settings.simulation.grow.value));
            gl.bindVertexArray(null);
            if (settings.runtime.touch.n > 0) {
                const r = settings.force.range.value;
                settings.force.range.value = settings.force.range.max;
                gl.vertexAttrib2f(
                    material.update_field.attribute('a_position'),
                    settings.runtime.touch.x,
                    settings.runtime.touch.y
                );
                gl.drawArrays(gl.POINTS, 0, settings.runtime.touch.force.value);
                settings.force.range.value = r;
            }
        }

        if (!reset) {
            if (settings.simulation.border.value === 'wrap') {
                for (const xy of combine([-2, 0, 2], [-2, 0, 2])) {
                    draw(xy[0], xy[1]);
                }
            } else {
                draw(0, 0);
            }
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function reset_field() {
        for (const r of render) {update_field(r, true);}
    }

    function draw(render) {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(... settings.display.background, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (settings.display.field.value) {
            gl.useProgram(material.draw_field.program);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, field.textures[0]);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, (settings.simulation.nspecies.max > 2) ? field.textures[1] : null);
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
            gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.bindTexture(gl.TEXTURE_2D, null);

            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
            gl.bindVertexArray(null);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.useProgram(null);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }

        if ((settings.display.body.value) || (settings.display.glow.value && (settings.body.size.value > 3))) {
            gl.bindVertexArray(render.display);
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

            const bs = settings.simulation.nbodies.value * (2 ** settings.simulation.grow.value);

            if (settings.display.glow.value && (settings.body.size.value > 3)) {
                gl.useProgram(material.draw_body_glow.program);
                gl.drawArrays(gl.POINTS, 0, bs);
            }

            if (settings.display.body.value) {
                gl.useProgram(((settings.body.size.value > 3) ? material.draw_body :  material.draw_body_point).program);
                gl.drawArrays(gl.POINTS, 0, bs);
            }

            gl.bindVertexArray(null);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        // draw a fadding border so that bodies do not pop in/out
        if (settings.simulation.border.value === 'wrap') {
            const [w, h] = [settings.body.size.value / canvas.width, settings.body.size.value / canvas.height];

            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.useProgram(material.rectangle_fade.program);

            material.rectangle_fade.uniform('u_color', [... settings.display.background, 1]);

            for (const [s, xy, fx, fy] of [
                [[w, 1], [1 - w, 0], [1, 0], [0, 0]],
                [[w, 1], [w - 1, 0], [0, 1], [0, 0]],
                [[1, h], [0, 1 - h], [0, 0], [1, 0]],
                [[1, h], [0, h - 1], [0, 0], [0, 1]]
            ]) {
                material.rectangle_fade.uniform('u_size', s);
                material.rectangle_fade.uniform('u_offset', xy);
                material.rectangle_fade.uniform('u_fade_x', fx);
                material.rectangle_fade.uniform('u_fade_y', fy);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);    
            }
        }
    }

    function update(dt) {
        const r = render[settings.runtime.frame & 1];

        gl.disable(gl.DEPTH_TEST);
        gl.colorMask(true, true, true, true);
        gl.depthMask(false);

        settings.runtime.dt.notify(dt);
        if (settings.runtime.touch.n > 0) {
            ++settings.runtime.touch.force.value;
        }

        update_field(r);
        draw(r);
        update_dynamics(r);
    }

    settings.simulation.nspecies.addListener(() => {
        reset_field();
    });

    settings.simulation.grow.addListener(() => {
        reset_field();
        update_buffer();
    });
    
    settings.simulation.resolution.addListener(() => {
        resize();
        settings.force.range.notify();
    });

    //
    // build ui (ugly code here)
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

    const ui = document.getElementById('ui');
    {
        ui.style.display = (document.body.clientWidth > document.body.clientHeight) ? 'flex' : 'none';
        ui.style.flexDirection = 'column';

        const panel = document.createElement('div');
        panel.style.display = 'grid';
        panel.style.padding = '5px';
        panel.style.gap = '5px';
        ui.appendChild(panel);

        const Range = (r, p = 'float', cb = 'input', s, deps) => {
            const span = document.createElement('span');
            span.style.display = 'flex';
            span.style.flexDirection = 'column';
            const range = document.createElement('input');
            range.type  = 'range';
            range.min = r.min;
            range.max = r.max;
            if (r.step !== undefined) {range.step = r.step;}
            range.value = r.value;
            const info = document.createElement('span');
            info.style.fontSize = 'x-small';
            span.appendChild(range);
            span.appendChild(info);
            const sync = () => {
                const v = r.value;
                range.value = v.toString();
                info.innerHTML = (s !== undefined) ? s(v, range, info) : range.value;
            };
            range.addEventListener(cb, () => {
                const v = range.value;
                r.value = (p === 'float') ? parseFloat(v)
                        : (p === 'int'  ) ? parseInt(v)
                        :                   p(v);
                sync();
            });
            deps = [r].concat(opt(deps, []));
            for (const ds of deps) {
                const [d, s] = (ds instanceof(Array)) ? ds : [ds, sync];
                d.addListener(v => s(v, range, info));
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
                label.style.userSelect = 'none';
                return element;
            };
        })();

        row('Simulation');
        row('Species', Range(settings.simulation.nspecies, 'int', 'change'));
        row('Bodies', Range(
            settings.simulation.nbodies, 'int', 'input',
            v => `${v * (2 ** settings.simulation.grow.value)}`,
            [settings.simulation.grow]
        ));
        row('Velocity', Range(settings.simulation.velocity));
        row('Gravity', Range(settings.simulation.gravity));
        row('Damping', Range(settings.simulation.damping));
        row('Grow', Range(settings.simulation.grow, 'int', 'change'));
        {
            const select = document.createElement('select');
            for (const m of ['Bounce', 'Wrap']) {
                const option = document.createElement('option');
                option.appendChild(document.createTextNode(m));
                select.appendChild(option);
            }
            const sync = () => {
                select.selectedIndex = (settings.simulation.border.value === 'bounce') ? 0 : 1;
            };
            select.addEventListener('change', () => {
                switch (select.selectedIndex) {
                    case 0 : settings.simulation.border.value = 'bounce'; break;
                    case 1 : settings.simulation.border.value = 'wrap'; break;
                }
            });
            settings.simulation.border.addListener(sync);
            row('Border', select);
        }
        row('Body');
        row('Size', Range(settings.body.size));
        row('Force');
        row('Factor', Range(settings.force.strength));
        row('Range', Range(settings.force.range));
        row('Decay', Range(settings.force.decay));
        if (ENABLE_UI_ZERO) {
            row('Zero', Range(settings.force.zero));
        }
        row('Resolution', Range(settings.simulation.resolution, 'int', 'change'));
        row('Display');
        {
            const cs = document.createElement('input');
            cs.type = 'color';
            cs.value = rgb_hex(settings.display.background);
            cs.addEventListener('input', () => {
                settings.display.background = hex_rgb(cs.value);
            });
            row('Back', cs);
        }
        {
            const div = document.createElement('div');
            div.style.display = 'grid';
            div.style.justifyContent = 'flex-start';
            for (const [i, s] of ['body', 'field', 'glow'].entries()) {
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = settings.display[s].value;
                cb.style.gridRow = i + 1;
                cb.style.gridColumn = 1;
                div.appendChild(cb);
                const label = document.createElement('span');
                label.appendChild(document.createTextNode(s));
                label.style.gridRow = i + 1;
                label.style.gridColumn = 2;
                div.appendChild(label);
                cb.addEventListener('change', () => {
                    settings.display[s].value = cb.checked;
                });
                settings.display[s].addListener(v => {cb.checked = v;});

            }
            row('Draw', div);
        }
        row('Saturation', Range(settings.display.saturation, 'float', 'input', v => v, [[
            settings.display.field, (v, r) => {r.disabled = !v;}
        ]]));
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
                'F or tap : randomize force',
                'P : randomize palette',
                'R : reset random',
                'B : reset big bang',
                'T : freeze time',
                'Touch : apply force',
                'Double touch : reset',
                'E : toggle force editor',
                'Escape : toggle settings'
            ]) {
                const li = document.createElement('div');
                li.style.margin = 0;
                li.appendChild(document.createTextNode(i));
                ul.appendChild(li);
            }
        }
    }

    const edit_force = document.createElement('div');
    {
        edit_force.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        edit_force.style.display = 'none';
        edit_force.style.position = 'absolute';
        edit_force.style.zIndex = 1;
        edit_force.style.top = '25px';
        edit_force.style.left = '25px';
        const matrix = document.createElement('div');
        matrix.style.display = 'grid';
        matrix.style.padding = '5px';
        const ranges = [];
        let forces = [];
        let colors = [];
        for (let a = 0; a < settings.simulation.nspecies.max; ++a) {
            const c = document.createElement('span');
            c.style.display = 'inline-block';
            c.style.width  = '15px';
            c.style.height = '100%';
            c.style.marginRight = '5px';
            c.style.gridRow = a + 1;
            c.style.gridColumn = 1;
            matrix.appendChild(c);
            colors.push(c);
        }
        for (let a = 0; a < settings.simulation.nspecies.max; ++a) {
            for (let b = 0; b < settings.simulation.nspecies.max; ++b) {
                const container = document.createElement('span');
                container.style.display = 'flex';
                container.style.flexDirection = 'column';
                container.style.gridRow = a + 1;
                container.style.gridColumn = b + 2;
                const range = document.createElement('input');
                range.type = 'range';
                const f = a * settings.simulation.nspecies.max + b;
                range.min = ENABLE_NEGATIVE_FORCE ? -1 : 0;
                range.max = 1;
                range.step = 0.05;
                range.value = range.min;
                const info = document.createElement('span');
                info.style.fontSize = 'x-small';
                range.addEventListener('input', () => {
                    info.innerHTML = range.value;
                    forces[f] = parseFloat(range.value);
                    settings.runtime.forces.notify(forces);
                });
                container.appendChild(range);
                container.appendChild(info);
                matrix.appendChild(container);
                ranges.push({container, range, info});
            }
        }
        edit_force.appendChild(matrix);

        const show = () => {
            for (let a = 0; a < settings.simulation.nspecies.max; ++a) {
                for (let b = 0; b < settings.simulation.nspecies.max; ++b) {
                    const v = (a < settings.simulation.nspecies.value) && (b < settings.simulation.nspecies.value);
                    const f = a * settings.simulation.nspecies.max + b;
                    ranges[f].container.style.display = v ? 'flex' : 'none';
                }
            }
            for (let a = 0; a < settings.simulation.nspecies.max; ++a) {
                colors[a].style.display = (a < settings.simulation.nspecies.value) ? 'inline-block' : 'none';
            }
        };
        const reset_force = (fs) => {
            forces = [].concat(fs);
            for (let a = 0; a < settings.simulation.nspecies.max; ++a) {
                for (let b = 0; b < settings.simulation.nspecies.max; ++b) {
                    const f = a * settings.simulation.nspecies.max + b;
                    ranges[f].range.value = fs[f];
                    ranges[f].info.innerHTML = ranges[f].range.value;
                }
            }
        };
        const reset_palette = (cs) => {
            for (let a = 0; a < settings.simulation.nspecies.max; ++a) {
                colors[a].style.backgroundColor = rgb_hex([cs[a * 4 + 0], cs[a * 4 + 1], cs[a * 4 + 2]]);
            }
        };
        settings.simulation.nspecies.addListener(show);
        settings.runtime.forces.addListener(reset_force);
        settings.display.palette.addListener(reset_palette);
        show();

        document.body.appendChild(edit_force);
    }

    //
    // events
    //

    document.onkeydown = (e) => {
        if (!e.repeat) {
            if (e.key === 'Escape') {
                ui.style.display = (ui.style.display === 'none') ? 'flex' : 'none';
            } else if (e.key.toUpperCase() === 'T') {
                settings.runtime.freeze = !settings.runtime.freeze;
            } else if (e.key.toUpperCase() === 'P') {
                update_palette();
            } else if (e.key.toUpperCase() === 'F') {
                update_force();
            } else if (e.key.toUpperCase() === 'M') {
                update_mass();
            } else if (e.key.toUpperCase() === 'R') {
                settings.simulation.random.notify(Math.random());
                reset_dynamics();
            } else if (e.key.toUpperCase() === 'B') {
                reset_dynamics(0);
            } else if (e.key.toUpperCase() === 'E') {
                edit_force.style.display = (edit_force.style.display === 'none') ? 'block' : 'none';
            } else if (e.key.toUpperCase() === 'D') {
                settings.log.debug = !settings.log.debug;
            } else if (e.key.toUpperCase() === 'I') {
                settings.log.info = !settings.log.info;
            } else if (e.key === ' ') {
                // TODO : add presets
            }
        }
    };

	gl.canvas.addEventListener("wheel", (e) => {
        settings.simulation.nbodies.value += e.deltaY;
	}, {passive : false});

    const pointer = new Pointer(canvas);

    {
        const tap = new Tap(pointer);
        tap.source.addListener((e) => {
            if (e.repeat == 2) {
                settings.simulation.nspecies.value = choice(1, [2, 2], [3, 2], 4);
                settings.runtime.touch.reset = (settings.runtime.touch.reset + 1) % 2;
                const r = settings.runtime.touch.reset;
                reset_dynamics(r - 1, [
                    Math.trunc(((e.x * device.pixel_ratio) - (canvas.width / 2)) * r),
                    Math.trunc(((canvas.height / 2) - (e.y * device.pixel_ratio)) * r)
                ]);
            } else if (e.repeat > 4) {
                canvas.style.touchAction = (canvas.style.touchAction === '') ? 'none' : '';
            }
        });

        const touch = new Touch(pointer);
        touch.delay = Pointer.TIMEOUT * 2;
        touch.source.addListener((e) => {
            if (e !== null) {
                settings.runtime.touch.x = Math.trunc((e.x * device.pixel_ratio) - (canvas.width  / 2));
                settings.runtime.touch.y = Math.trunc((canvas.height / 2) - (e.y * device.pixel_ratio));
                settings.runtime.touch.n = 1;
            } else {
              settings.runtime.touch.n = 0;
              settings.runtime.touch.force.value = 0;
            }
        });

        const swipe = new Swipe(pointer);
        swipe.ui = (ui.style.display === 'none') ? 0 : 1;
        swipe.source.addListener((e) => {
            if (e === 'right') {
                if (swipe.ui > -1) {--swipe.ui;}
            } else if (e === 'left') {
                if (swipe.ui < 1) {++swipe.ui;}
            } else if (e === 'up') {
                update_force();
            } else if (e === 'down') {
                update_palette();
            }
            ui.style.display = (swipe.ui === 1) ? 'flex' : 'none';
            edit_force.style.display = (swipe.ui === -1) ? 'block' : 'none';
        });

        const box = new Box(pointer);
        box.ref = null;
        box.source.addListener((e) => {
            if (e !== null) {
                if (box.ref === null) {
                    box.ref = {nbodies : settings.simulation.nbodies.value, y : e.p1.y};
                }
                settings.simulation.nbodies.value = box.ref.nbodies + Math.trunc(box.ref.y - e.p1.y) * 2;
            } else {
                box.ref = null;
            }
        });
    }

    wgl.addListener(wgl.EVENT.VISIBILITY, () => {settings.runtime.time = 0;});
    wgl.addListener(wgl.EVENT.RESIZE, (w, h) => {resize(w, h);});

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
        const dt = (settings.runtime.freeze || (settings.runtime.time === 0)) ? 0 : (t - settings.runtime.time) / 1000.0;
        update(dt);
        settings.runtime.time = t;
        ++settings.runtime.frame;
    }

    function loop() {
        step();
        window.requestAnimationFrame(loop);
    }

    update_mass();
    update_force();
    update_palette();
    update_buffer();
    // already resized thru simulation.resolution source

    loop();
});

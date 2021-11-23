"use strict";

import {WGL} from './utils/wgl.js';

window.addEventListener('load', async () => {
    const settings = {
        nblobs   : 5,
        velocity : 75,
        color    : Math.random(),
        period   : 20,
        fill     : 0.05
    };

    const canvas = document.getElementById('render');

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

    const wgl = WGL(gl);

    const blobs = [];
    for (let b = 0; b < settings.nblobs; ++b) {
        const x = Math.random() * gl.canvas.width, y = Math.random() * gl.canvas.height;
        const a = Math.random() * 2 * Math.PI;
        const v = (((Math.random() * 2) - 1) * 0.25) + 1;
        blobs.push({
            position  : {x, y},
            direction : {x : Math.cos(a), y : Math.sin(a)},
            velocity  : v
        });
    }

    const material = {};
    {
        const src = {
            vertex   : await fetch('shaders/blob-vs.glsl').then(r => r.text()),
            fragment : await fetch('shaders/blob-fs.glsl').then(r => r.text())
        };
        material.blob = wgl.material(wgl.program(
            wgl.shader.vertex(src.vertex),
            wgl.shader.fragment(src.fragment, [`NUM_BLOBS=${settings.nblobs}`, 'UNROLL_LOOP'])
        ));
    }

    let time = 0;

    wgl.addListener(wgl.EVENT.VISIBILITY, () => {time = 0;});

    function update() {
        const t = Date.now();
        const dt = (time !== 0) ? (t - time) / 1000.0 : 0;
        time = t;
        for (const b of blobs) {
            b.position.x += b.direction.x * b.velocity * settings.velocity * dt;
            b.position.y += b.direction.y * b.velocity * settings.velocity * dt;
            if ((b.position.x < 0) || (b.position.x > gl.canvas.width)) {
                b.direction.x = -Math.abs(b.direction.x) * Math.sign(b.position.x);
            }
            if ((b.position.y < 0) || (b.position.y > gl.canvas.height)) {
                b.direction.y = -Math.abs(b.direction.y) * Math.sign(b.position.y);
            }
        }
        material.blob.uniform('u_position', blobs.map(b => [b.position.x, b.position.y]).flat());
        material.blob.uniform('u_radius', Math.sqrt((gl.canvas.width * gl.canvas.height * settings.fill) / (settings.nblobs * Math.PI)));
        settings.color = (settings.color + (dt / settings.period)) % 1;
        material.blob.uniform('u_color', settings.color);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(material.blob.program);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function loop() {
        update();
        window.requestAnimationFrame(loop);
    }

    loop();
});

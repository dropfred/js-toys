window.addEventListener('load', () => {
    const settings = {
        bodies : 500,
        species: 3,
        distance : 10,
        radius : 5,
        background : 'black',
        amax : 1000,
        vmax : 230,
        G : 10000000,
        damping : 0.99
    };

    const canvas = document.getElementById('render');
    const ctx = canvas.getContext('2d');
    
    const canvas2 = document.createElement('canvas');
    const ctx2 = canvas2.getContext('2d');
    
    const resize = () => {
        canvas.width  = canvas2.width  = canvas.clientWidth;
        canvas.height = canvas2.height = canvas.clientHeight;
    };
    
    window.addEventListener('resize', resize);
    
    resize();
    
    let current_render = 1;
    
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

            label('Bodies');

            const range = document.createElement('input');
            range.type  = 'range';
            range.min = 50;
            range.max = 2000;
            range.step = 50;
            range.value = settings.bodies;
            range.style.gridRow = row;
            range.style.gridColumn = 2;
            panel.appendChild(range);
            range.addEventListener('input', () => {
                const n = parseInt(range.value);
                if (n < bodies.length) {
                    bodies = bodies.slice(0, n);
                } else {
                    for (let i = bodies.length; i < n; ++i) {
                        body();
                    }
                }
                settings.bodies = n;
            });
        }
        {
            ++row;

            label('Distance');

            const range = document.createElement('input');
            range.type  = 'range';
            range.min = 0;
            range.max = 50;
            range.step = 5;
            range.value = settings.distance.toString();
            range.style.gridRow = row;
            range.style.gridColumn = 2;
            panel.appendChild(range);
            range.addEventListener('input', () => {
                settings.distance = parseInt(range.value);
            });
        }
        {
            ++row;

            label('Species');

            const range = document.createElement('input');
            range.type  = 'range';
            range.min = 1;
            range.max = 10;
            range.step = 1;
            range.value = settings.species.toString();
            range.style.gridRow = row;
            range.style.gridColumn = 2;
            panel.appendChild(range);
            range.addEventListener('change', () => {
                settings.species = parseInt(range.value);
                clear();
                setup();
            });
        }
        // {
        //     ++row;

        //     label('Back');
            
        //     const cs = document.createElement('input');
        //     cs.type = 'color';
        //     cs.value = settings.background;
        //     cs.style.gridRow = row;
        //     cs.style.gridColumn = 2;
        //     panel.appendChild(cs);
        //     cs.addEventListener('change', () => {
        //         settings.background = cs.value;
        //     });
        // }
        {
            ++row;

            label('Mode');

            const select = document.createElement('select');
            for (const [i, b] of ['Simple', 'Trail', 'Path'].entries()) {
                const option = document.createElement("option");
                option.text = b;
                option.value = i.toString();
                if (i == current_render) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
            select.style.gridRow = row;
            select.style.gridColumn = 2;
            panel.appendChild(select);
            select.addEventListener('input', () => {
                current_render = parseInt(select.value);
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
            for (const i of ['Z: reset', 'C: clear', 'Escape: show/hide settings']) {
                const li = document.createElement('div');
                li.style.margin = 0;
                li.appendChild(document.createTextNode(i));
                ul.appendChild(li);
            }
        }
    }

    document.onkeydown = (e) => {
        if (!e.repeat) {
            if (e.key === 'r') {
                clear();
                current_render = (current_render + 1) % render.length;
            } else if (e.key === 'z') {
                clear();
                setup();
            } else if (e.key === 'c') {
                clear();
            } else if (e.key === 'Escape') {
                const ui = document.getElementById('ui');
                ui.style.display = (ui.style.display === 'none') ? 'flex' : 'none';
            }
        }
    };
    
    const size = () => {
        return {
            width   : canvas.width,
            height  : canvas.height,
            hwidth  : canvas.width / 2,
            hheight : canvas.height / 2,
        };
    };
    
    const clear = () => {
        ctx.resetTransform();
        ctx.globalAlpha = 1;
        ctx.fillStyle = settings.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx2.resetTransform();
        ctx2.globalAlpha = 1;
        ctx2.fillStyle = settings.background;
        ctx2.fillRect(0, 0, canvas.width, canvas.height);
    };
    
    const opt = (v, d) => ((v !== undefined) ? v : d);
    
    const norm = (v) => Math.sqrt((v.x * v.x) + (v.y * v.y));
    
    const rand = function () {
        let r = Math.random();
        if      (arguments.length > 1) {r = arguments[0] + ((arguments[1] - arguments[0]) * r);}
        else if (arguments.length > 0) {r *= arguments[0];}
        return r;
    };
    const irand = function () {
        return Math.trunc(rand.apply(rand, arguments))
    };

    const kick = (() => {
        const s = settings.bodies - 1;
        const rs = new Float32Array(s);
        let r = -1;
        for (let i = 0; i < s; ++i) {
            rs[i] = rand(-0.1, 0.1);
        }
        return (() => {
            if (++r === s) r = 0;
            return rs[r];
        });
    })();

    const hsv_to_rgb = (h, s, v) => {
        const h_i = Math.floor(h * 6);
        const f = h * 6 - h_i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        let rgb = {r : 0, g : 0, b : 0};
        if      (h_i === 0) {rgb.r = v; rgb.g = t; rgb.b = p;}
        else if (h_i === 1) {rgb.r = q; rgb.g = v; rgb.b = p;}
        else if (h_i === 2) {rgb.r = p; rgb.g = v; rgb.b = t;}
        else if (h_i === 3) {rgb.r = p; rgb.g = q; rgb.b = v;}
        else if (h_i === 4) {rgb.r = t; rgb.g = p; rgb.b = v;}
        else if (h_i === 5) {rgb.r = v; rgb.g = p; rgb.b = q;}
        return rgb;
    };
    
    const hex_color = (rgb) => {
        return ('#' + Math.round(rgb.r * 255.0).toString(16) + Math.round(rgb.g * 255.0).toString(16) + Math.round(rgb.b * 255.0).toString(16));
    };
    
    // make bright colors palette
    const Palette = (hue, saturation, value) => {
        const grc = 0.618033988749895;
        let h     = opt(hue, rand());
        const s   = opt(saturation, 0.75);
        const v   = opt(value, 0.95);
        
        return 	() => {
            h += grc;
            h %= 1;
            return hsv_to_rgb(h, s, v);
        };
    };
    
    const palette = Palette();
    
    let types;
    let bodies;
    let forces;
    
    const body = () => {
        const v = rand(settings.vmax);
        const d = rand(2 * Math.PI);
        const s = size();
        bodies.push({
            type         : irand(0, settings.species),
            position     : {x : rand(-s.hwidth, s.hwidth), y : rand(-s.hheight, s.hheight)},
            velocity     : {x : v * Math.cos(d), y : v * Math.sin(d)},
            acceleration : {x : 0, y : 0}
        });
    };

    const setup = () => {
        types = [];
        bodies = [];
        forces = new Float32Array(settings.species * settings.species);
        
        for (let i = 0; i < settings.species; ++i) {
            types.push({
                color  : hex_color(palette()),
                // mass   : rand(0.5, 2.0),
                mass   : 1,
                radius : settings.radius
            });
        }

        for (let i = 0; i < settings.species; ++i) {
            for (let j = 0; j < settings.species; ++j) {
                forces[(i * settings.species) + j] = (i < j) ? rand(-0.9, -0.2)
                                         : (i > j) ? rand( 0.1,  0.8)
                                         :           rand(-0.8,  0.4);
            }
        }
        
        // console.log('types', JSON.stringify(types));
        // console.log('forces', JSON.stringify(Array.from(forces)));

        for (let i = 0; i < settings.bodies; ++i) {
            body();
        }
    };
    
    let time = 0;
    
    const step = () => {
        const r2 = (settings.radius * settings.radius) * settings.distance;
        const s = size();
        
        let dt, dt2;
        
        if (time > 0) {
            dt = Date.now() - time;
            if (dt > 50) {
                dt = 0;
            }
        } else {
            dt = 0;
        }
        if (dt > 0) {
            time += dt;
        } else {
            time = Date.now();
        }
        
        dt /= 1000;
        dt2 = dt * dt;
        
        for (let i = bodies.length - 1; i >= 0; --i) {
            const b = bodies[i];
            b.acceleration.x = 0;
            b.acceleration.y = 0;
        }
        
        for (let i = bodies.length - 1; i > 0; --i) {
            const bi = bodies[i];
            for (let j = i - 1; j >= 0; --j) {
                const bj = bodies[j];
                const dp = {
                    x : bj.position.x - bi.position.x,
                    y : bj.position.y - bi.position.y
                };
                // wrap
                if      (dp.x >  s.hwidth ) {dp.x = dp.x - s.width;}
                else if (dp.x < -s.hwidth ) {dp.x = dp.x + s.width;}
                if      (dp.y >  s.hheight) {dp.y = dp.y - s.height;}
                else if (dp.y < -s.hheight) {dp.y = dp.y + s.height;}
                const d2 = (dp.x * dp.x) + (dp.y * dp.y);
                const d3 = d2 * Math.sqrt(d2);

                const fi = settings.G * ((d2 < r2) ? -1 : forces[(bi.type * settings.species) + bj.type] + kick()) / d3;
                bi.acceleration.x += dp.x * fi;
                bi.acceleration.y += dp.y * fi;
                const fj = settings.G * ((d2 < r2) ? -1 : forces[(bj.type * settings.species) + bi.type] + kick()) / d3;
                bj.acceleration.x -= dp.x * fj;
                bj.acceleration.y -= dp.y * fj;
            }
        }
        
        for (let i = bodies.length - 1; i >= 0; --i) {
            const b = bodies[i];
            const na = norm(b.acceleration);
            if (na > settings.amax) {
                b.acceleration.x *= settings.amax / na;
                b.acceleration.y *= settings.amax / na;
            }
            b.position.x += (b.velocity.x * dt) + (b.acceleration.x * dt2 * 0.5);
            b.position.y += (b.velocity.y * dt) + (b.acceleration.y * dt2 * 0.5);
            b.velocity.x *= settings.damping;
            b.velocity.y *= settings.damping;
            b.velocity.x += b.acceleration.x * dt;
            b.velocity.y += b.acceleration.y * dt;
            const v = norm(b.velocity);
            if (v > settings.vmax) {
                b.velocity.x *= settings.vmax / v;
                b.velocity.y *= settings.vmax / v;
            }
            // wrap
            if      (b.position.x < -s.hwidth ) b.position.x += s.width;
            else if (b.position.x >  s.hwidth ) b.position.x -= s.width;
            if      (b.position.y < -s.hheight) b.position.y += s.height;
            else if (b.position.y >  s.hheight) b.position.y -= s.height;
        }
    };
    
    const render = [
        // simple
        () => {
            const s = size();
            
            ctx.resetTransform();
            ctx2.globalAlpha = 1;
            ctx.fillStyle = settings.background;
            ctx.fillRect(0, 0, s.width, s.height);
            
            ctx.setTransform(1, 0.0, 0.0, 1, s.hwidth, s.hheight);
            for (let i = bodies.length - 1; i >= 0; --i) {
                const b = bodies[i];
                const t = types[b.type];
                ctx.beginPath();
                ctx.arc(b.position.x, b.position.y, t.radius, 0, 2 * Math.PI);
                ctx.fillStyle = t.color;
                ctx.fill();
            }
        },
        // trail
        () => {
            const s = size();
            
            ctx2.resetTransform();
            ctx2.globalAlpha = 1;
            ctx2.fillStyle = settings.background;
            ctx2.fillRect(0, 0, s.width, s.height);
            ctx2.globalAlpha = 0.9;
            ctx2.drawImage(canvas, 0, 0);
            
            ctx2.setTransform(1, 0.0, 0.0, 1, s.hwidth, s.hheight);
            ctx2.globalAlpha = 1;
            for (let i = bodies.length - 1; i >= 0; --i) {
                const b = bodies[i];
                const t = types[b.type];
                ctx2.beginPath();
                ctx2.arc(b.position.x, b.position.y, t.radius, 0, 2 * Math.PI);
                ctx2.fillStyle = t.color;
                ctx2.fill();
            }
            
            ctx.resetTransform();
            ctx.globalAlpha = 1;
            ctx.drawImage(canvas2, 0, 0);
        },
        // path
        () => {
            const s = size();
            
            ctx2.resetTransform();
            ctx2.globalAlpha = 1;
            ctx2.drawImage(canvas, 0, 0);
            
            ctx2.setTransform(1, 0.0, 0.0, 1, s.hwidth, s.hheight);
            ctx2.globalAlpha = 0.1;
            for (let i = bodies.length - 1; i >= 0; --i) {
                const b = bodies[i];
                const t = types[b.type];
                ctx2.beginPath();
                ctx2.arc(b.position.x, b.position.y, t.radius, 0, 2 * Math.PI);
                ctx2.fillStyle = t.color;
                ctx2.fill();
            }
            
            ctx.drawImage(canvas2, 0, 0);
        }
    ];
    
    const loop = () => {
        step();
        render[current_render]();
        window.requestAnimationFrame(loop);
    };
    
    setup();
    loop();
});

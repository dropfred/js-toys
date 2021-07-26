console.log('#### nbody 0.1 ####');

(() => {
	const NBODIES = 1000;
	const G = 10000000;
	const AMAX = 500;
	const VMAX = 250;
	const NTYPES = 5;
	const RADIUS = 5;
	const DAMPING = 0.99;
	const DISTANCE = 5;
	const SYMETRIC = false;

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	
	canvas.width  = document.body.offsetWidth;
	canvas.height = document.body.offsetHeight;
	document.body.appendChild(canvas);

	const canvas2 = document.createElement('canvas');
	const ctx2 = canvas2.getContext('2d');
	
	canvas2.width  = document.body.offsetWidth;
	canvas2.height = document.body.offsetHeight;

	var current_render = 1;

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
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx2.resetTransform();
		ctx2.globalAlpha = 1;
		ctx2.fillStyle = 'black';
		ctx2.fillRect(0, 0, canvas.width, canvas.height);
	};

	const opt = (v, d) => ((v !== undefined) ? v : d);

	const norm = (v) => Math.sqrt((v.x * v.x) + (v.y * v.y));
	
	const rand = function () {
		var r = Math.random();
		if      (arguments.length > 1) {r = arguments[0] + ((arguments[1] - arguments[0]) * r);}
		else if (arguments.length > 0) {r *= arguments[0];}
		return r;
	};
	const irand = function () {
		return Math.trunc(rand.apply(rand, arguments))
	};

	const hsv_to_rgb = (h, s, v) => {
		const h_i = Math.floor(h * 6);
		const f = h * 6 - h_i;
		const p = v * (1 - s);
		const q = v * (1 - f * s);
		const t = v * (1 - (1 - f) * s);
		var rgb = {r : 0, g : 0, b : 0};
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

	const Palette = (hue, saturation, value) => {
		const golden_ratio_conjugate = 0.618033988749895;
		var   h = opt(hue, rand());
		const s = opt(saturation, 0.75);
		const v = opt(value, 0.95);

		return 	() => {
			h += golden_ratio_conjugate;
			h %= 1;
			return hsv_to_rgb(h, s, v);
		};
	};

	const palette = Palette();
	
	var types;
	var bodies;
	var forces;

	const setup = () => {
		types = [];
		bodies = [];
		forces = new Float32Array(NTYPES * NTYPES)

		for (let i = 0; i < NTYPES; ++i) {
			types.push({
				color  : hex_color(palette()),
				mass   : /*rand(0.5, 2.0)*/1,
				radius : RADIUS
			});
		}
		let f = () => rand(-1, 1);
		if (SYMETRIC) {
			for (let i = 0; i < NTYPES; ++i) {
				for (let j = i; j < NTYPES; ++j) {
					forces[(i * NTYPES) + j] = forces[(j * NTYPES + i)] = f();
				}
			}
		} else {
			for (let i = 0; i < NTYPES; ++i) {
				for (let j = 0; j < NTYPES; ++j) {
					forces[(i * NTYPES) + j] = f();
				}
			}
		}
	
		var body = (ps) => {
			ps = opt(ps, {});
			const pp = opt(ps.position, {});
			const pv = opt(ps.velocity, {});
			return {
				type         : opt(ps.type, irand(0, NTYPES)),
				position     : {x : opt(pp.x, 0), y : opt(pp.y, 0)},
				velocity     : {x : opt(pv.x, 0), y : opt(pv.y, 0)},
				acceleration : {x : 0           , y : 0           }
			};
		};
		
		for (let i = 0; i < NBODIES; ++i) {
			const v = rand(VMAX);
			const d = rand(2 * Math.PI);
			const s = size();
			bodies.push(body({
				position : {x : rand(-s.hwidth, s.hwidth), y : rand(-s.hheight, s.hheight)},
				velocity : {x : v * Math.cos(d), y : v * Math.sin(d)}
			}));
		}
	};

	var time = 0;
	var frame = 0;

	const step = () => {
		const r2 = (RADIUS * RADIUS) * DISTANCE;
		const s = size();

		var dt, dt2;
		
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
				var dp = {
					x : bj.position.x - bi.position.x,
					y : bj.position.y - bi.position.y
				};
				// wrap
				if      (dp.x >  s.hwidth ) {dp.x = dp.x - s.width;}
				else if (dp.x < -s.hwidth ) {dp.x = dp.x + s.width;}
				if      (dp.y >  s.hheight) {dp.y = dp.y - s.height;}
				else if (dp.y < -s.hheight) {dp.y = dp.y + s.height;}
				const d2 = (dp.x * dp.x) + (dp.y * dp.y);
				if (SYMETRIC) {
					let f = G * ((d2 < r2) ? -1 : forces[(bi.type * NTYPES) + bj.type]) / (d2 * Math.sqrt(d2));
					bi.acceleration.x += dp.x * f;
					bi.acceleration.y += dp.y * f;
					bj.acceleration.x -= dp.x * f;
					bj.acceleration.y -= dp.y * f;
				} else {
					let fi = G * ((d2 < r2) ? -1 : forces[(bi.type * NTYPES) + bj.type]) / (d2 * Math.sqrt(d2));
					bi.acceleration.x += dp.x * fi;
					bi.acceleration.y += dp.y * fi;
					let fj = G * ((d2 < r2) ? -1 : forces[(bj.type * NTYPES) + bi.type]) / (d2 * Math.sqrt(d2));
					bj.acceleration.x -= dp.x * fj;
					bj.acceleration.y -= dp.y * fj;
				}
			}
		}

		for (let i = bodies.length - 1; i >= 0; --i) {
			const b = bodies[i];
			const na = norm(b.acceleration);
			if (na > AMAX) {
				b.acceleration.x *= AMAX / na;
				b.acceleration.y *= AMAX / na;
			}
			b.position.x += (b.velocity.x * dt) + (b.acceleration.x * dt2 / 2);
			b.position.y += (b.velocity.y * dt) + (b.acceleration.y * dt2 / 2);
			b.velocity.x *= DAMPING;
			b.velocity.y *= DAMPING;
			b.velocity.x += b.acceleration.x * dt;
			b.velocity.y += b.acceleration.y * dt;
			const v = norm(b.velocity);
			if (v > VMAX) {
				b.velocity.x *= VMAX / v;
				b.velocity.y *= VMAX / v;
			}
			// wrap
			if      (b.position.x < -s.hwidth ) b.position.x += s.width;
			else if (b.position.x >  s.hwidth ) b.position.x -= s.width;
			if      (b.position.y < -s.hheight) b.position.y += s.height;
			else if (b.position.y >  s.hheight) b.position.y -= s.height;
		}
		++frame;
	};

	const render = [
		() => {
			const s = size();
	
			ctx.resetTransform();
			ctx2.globalAlpha = 1;
			ctx.fillStyle = 'black';
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
		() => {
			const s = size();
	
			ctx2.resetTransform();
			ctx2.globalAlpha = 1;
			ctx2.fillStyle = 'black';
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
})();

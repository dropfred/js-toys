"use strict";

import {Tk} from './tk.js';

function WebGL(gl, options) {
    const VERSION = {
        WGL_1  : 0x10,
        WGL_2  : 0x20/*,
        GL_1   : 0x10,
        GL_2   : 0x20,
        GL_3   : 0x30,
        GLSL_1 : 0x10,
        GLSL_3 : 0x30*/
    };

    // gl.getContextAttributes();

    const version = (v => {
        if (v.startsWith('WebGL 2')) {
            return VERSION.WGL_2;
        } else if (v.startsWith('WebGL')) {
            return VERSION.WGL_1;
        } else {
            throw 'invalid webgl context';
        }
    })(gl.getParameter(gl.VERSION));

    options = Object.assign({
        scale : 1.0,
        extensions : []
    }, Tk.opt(options, {}));

    const extensions = {};

    {
        const ses = gl.getSupportedExtensions();
        for (const e of options.extensions) {
            if (ses.includes(e)) {
                extensions[e] = gl.getExtension(e);
            } else {
                console.warn('extension ' + e + ' is not available');
            }
        }
    }

    function resize(width, height) {
        gl.canvas.width  = Tk.opt(width , gl.canvas.clientWidth ) * options.scale;
        gl.canvas.height = Tk.opt(height, gl.canvas.clientHeight) * options.scale;
    }

    // todo : ensure that the observer isn't garbaged
    (new ResizeObserver(() => resize())).observe(gl.canvas);

    function compile(shader, src, defines) {
        // fix annoying error about first version line
        src = src.trimStart();
        // insert defines
        src = src.split('\n');
        const version = ((src.length > 0) && src[0].startsWith('#version')) ? [src.shift()] : [];
        defines = Tk.opt(defines, []);
        defines = defines.map(d => '#define ' + (d.includes('=') ? d.split('=').join(' ') : d));
        src = [].concat(version, defines, src).join('\n');

        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const e = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw e;
        }
        return {
            shader : shader,
            src    : src
        };
    }

    function vertex(src, defines) {
        return compile(gl.createShader(gl.VERTEX_SHADER), src, defines).shader;
    }

    function fragment(src, defines) {
        return compile(gl.createShader(gl.FRAGMENT_SHADER), src, defines).shader;
    }

    function program (... shaders) {
        const program = gl.createProgram();
        for (const s of shaders) {
            gl.attachShader(program, s);
        }
        gl.linkProgram(program);
        gl.validateProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const e = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw e;
        }

        return program;
    }

    function material(program) {
        function uname(name) {
            return name.replace(/\[\d+\]$/, '');
        }
    
        const uniforms = {};
        {
            const nus = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
            for (let u = 0; u < nus; ++u) {
                const i = gl.getActiveUniform(program, u);
                uniforms[uname(i.name)] = {type : i.type, size : i.size};
            }
        }
    
        function uniform(name, ...value) {
            const u = gl.getUniformLocation(program, name);
            if (u === null) {
                throw 'invalid uniform ' + name;
            }
            if (value.length === 0) {
                return gl.getUniform(program, u);
            }
            const i = uniforms[uname(name)];
            if (i === undefined) {
                throw 'invalid uniform ' + name;
            }
            if ((value.length === 1) && (value[0] instanceof (Array))) {
                value = value[0];
                switch (i.type) {
                    case gl.FLOAT        : gl.uniform1fv(u, value); break;
                    case gl.FLOAT_VEC2   : gl.uniform2fv(u, value); break;
                    case gl.FLOAT_VEC3   : gl.uniform3fv(u, value); break;
                    case gl.FLOAT_VEC4   : gl.uniform4fv(u, value); break;
                    case gl.INT          : gl.uniform1iv(u, value); break;
                    case gl.INT_VEC2     : gl.uniform2iv(u, value); break;
                    case gl.INT_VEC3     : gl.uniform3iv(u, value); break;
                    case gl.INT_VEC4     : gl.uniform4iv(u, value); break;
                    case gl.SAMPLER_2D   : gl.uniform1iv(u, value); break;
                    case gl.SAMPLER_CUBE : gl.uniform1iv(u, value); break;
                    case gl.BOOL         : gl.uniform1iv(u, value); break;
                    case gl.BOOL_VEC2    : gl.uniform2iv(u, value); break;
                    case gl.BOOL_VEC3    : gl.uniform3iv(u, value); break;
                    case gl.BOOL_VEC4    : gl.uniform4iv(u, value); break;
                    default : if (version >= VERSION.WGL_2) {
                        switch (i.type) {
                            case gl.UNSIGNED_INT      : gl.uniform1iv(u, value); break;
                            case gl.UNSIGNED_INT_VEC2 : gl.uniform2iv(u, value); break;
                            case gl.UNSIGNED_INT_VEC3 : gl.uniform3iv(u, value); break;
                            case gl.UNSIGNED_INT_VEC4 : gl.uniform4iv(u, value); break;
                        }
                    }
                }
            } else {
                switch (i.type) {
                    case gl.FLOAT        : gl.uniform1f(u, ... value); break;
                    case gl.FLOAT_VEC2   : gl.uniform2f(u, ... value); break;
                    case gl.FLOAT_VEC3   : gl.uniform3f(u, ... value); break;
                    case gl.FLOAT_VEC4   : gl.uniform4f(u, ... value); break;
                    case gl.INT          : gl.uniform1i(u, ... value); break;
                    case gl.INT_VEC2     : gl.uniform2i(u, ... value); break;
                    case gl.INT_VEC3     : gl.uniform3i(u, ... value); break;
                    case gl.INT_VEC4     : gl.uniform4i(u, ... value); break;
                    case gl.SAMPLER_2D   : gl.uniform1i(u, ... value); break;
                    case gl.SAMPLER_CUBE : gl.uniform1i(u, ... value); break;
                    case gl.BOOL         : gl.uniform1i(u, ... value); break;
                    case gl.BOOL_VEC2    : gl.uniform2i(u, ... value); break;
                    case gl.BOOL_VEC3    : gl.uniform3i(u, ... value); break;
                    case gl.BOOL_VEC4    : gl.uniform4i(u, ... value); break;
                    default : if (version >= VERSION.WGL_2) {
                        switch (i.type) {
                            case gl.UNSIGNED_INT      : gl.uniform1i(u, ... value); break;
                            case gl.UNSIGNED_INT_VEC2 : gl.uniform2i(u, ... value); break;
                            case gl.UNSIGNED_INT_VEC3 : gl.uniform3i(u, ... value); break;
                            case gl.UNSIGNED_INT_VEC4 : gl.uniform4i(u, ... value); break;
                        }
                    }
                }
            }
        }
    
        function attribute(name, layout) {
            const a = gl.getAttribLocation(program, name);
            if (layout !== undefined) {
                layout = Object.assign({size : 4, type : gl.FLOAT, normalize : false, stride : 0, offset : 0}, layout);
                gl.vertexAttribPointer(a, layout.size, layout.type, layout.normalize, layout.stride, layout.offset);
                gl.enableVertexAttribArray(a);    
            } else {
                gl.disableVertexAttribArray(a);    
            }
        }

        return {
            program   : program,
            uniform   : uniform,
            attribute : attribute
        }
    }

    return {
        VERSION : VERSION,
        version : version,
        shader : {
            vertex   : vertex,
            fragment : fragment
        },
        program  : program,
        material : material
    };
}

export {WebGL};

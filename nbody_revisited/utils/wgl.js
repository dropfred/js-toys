"use strict";

import * as Tk from './tk.js';

function WGL(gl, options = {}) {
    const VERSION = {
        // GL_1 : 0x10,
        // GL_2 : 0x20,
        // GL_3 : 0x30,
        // GLSL_1 : 0x10,
        // GLSL_3 : 0x30,
        WGL_1 : 0x10,
        WGL_2 : 0x20
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
    }, options);

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

    const EVENT = {
        RESIZE     : 'resize',
        VISIBILITY : 'visibility'
    };

    const observers = {};
    for (const e in EVENT) {
        observers[EVENT[e]] = new Set();
    }

    function addObserver(event, cb) {
        if (event in observers) {
            observers[event].add(cb);
        }
    }

    function removeObserver(event, cb) {
        if (event in observers) {
            observers[event].delete(cb);
        }
    }

    // todo : specs ensure that the observer isn't garbaged
    (new ResizeObserver(() => {
        resize();
        for (const [cb, _] of observers[EVENT.RESIZE].entries()) {
            cb(gl.canvas.width, gl.canvas.height);
        }
    })).observe(gl.canvas);

    document.addEventListener('visibilitychange', () => {
        const v = document.visibilityState === 'visible';
        for (const [cb, _] of observers[EVENT.VISIBILITY].entries()) {
            cb(v);
        }                
    });

    function compile(shader, src, defines = []) {
        // prevent annoying error about #version
        src = src.trimStart();
        // insert defines
        src = src.split('\n');
        const version = ((src.length > 0) && src[0].startsWith('#version')) ? [src.shift()] : [];
        defines = defines.filter(d => d !== undefined).map(d => d.trim()).filter(d => d.length > 0);
        defines = defines.map(d => '#define ' + (d.includes('=') ? d.split('=').map(d => d.trim()).join(' ') : d));
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

    function program(vertex, fragment, feedback) {
        const program = gl.createProgram();
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        if ((feedback != undefined) && (version >= VERSION.WGL_2)) {
            gl.transformFeedbackVaryings(program, feedback, gl.INTERLEAVED_ATTRIBS);
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

        function uniform(name, ... value) {
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
            gl.useProgram(program);
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
                    case gl.FLOAT_MAT2   : gl.uniformMatrix2fv(u, false, value); break;
                    case gl.FLOAT_MAT3   : gl.uniformMatrix3fv(u, false, value); break;
                    case gl.FLOAT_MAT4   : gl.uniformMatrix4fv(u, false, value); break;
                    default : if (version >= VERSION.WGL_2) {
                        switch (i.type) {
                            case gl.UNSIGNED_INT      : gl.uniform1iv(u, value); break;
                            case gl.UNSIGNED_INT_VEC2 : gl.uniform2iv(u, value); break;
                            case gl.UNSIGNED_INT_VEC3 : gl.uniform3iv(u, value); break;
                            case gl.UNSIGNED_INT_VEC4 : gl.uniform4iv(u, value); break;
                            case gl.SAMPLER_3D        : gl.uniform1iv(u, value); break;
                            case gl.FLOAT_MAT2x3      : gl.uniformMatrix2x3fv(u, false, value); break;
                            case gl.FLOAT_MAT2x4      : gl.uniformMatrix2x4fv(u, false, value); break;
                            case gl.FLOAT_MAT3x2      : gl.uniformMatrix3x2fv(u, false, value); break;
                            case gl.FLOAT_MAT3x4      : gl.uniformMatrix3x4fv(u, false, value); break;
                            case gl.FLOAT_MAT4x2      : gl.uniformMatrix4x2fv(u, false, value); break;
                            case gl.FLOAT_MAT4x3      : gl.uniformMatrix4x3fv(u, false, value); break;
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
                    case gl.FLOAT_MAT2   : gl.uniformMatrix2fv(u, false, [... value]); break;
                    case gl.FLOAT_MAT3   : gl.uniformMatrix3fv(u, false, [... value]); break;
                    case gl.FLOAT_MAT4   : gl.uniformMatrix4fv(u, false, [... value]); break;
                    default : if (version >= VERSION.WGL_2) {
                        switch (i.type) {
                            case gl.UNSIGNED_INT      : gl.uniform1i(u, ... value); break;
                            case gl.UNSIGNED_INT_VEC2 : gl.uniform2i(u, ... value); break;
                            case gl.UNSIGNED_INT_VEC3 : gl.uniform3i(u, ... value); break;
                            case gl.UNSIGNED_INT_VEC4 : gl.uniform4i(u, ... value); break;
                            case gl.SAMPLER_3D        : gl.uniform1i(u, ... value); break;
                            case gl.FLOAT_MAT2x3      : gl.uniformMatrix2x3fv(u, false, [... value]); break;
                            case gl.FLOAT_MAT2x4      : gl.uniformMatrix2x4fv(u, false, [... value]); break;
                            case gl.FLOAT_MAT3x2      : gl.uniformMatrix3x2fv(u, false, [... value]); break;
                            case gl.FLOAT_MAT3x4      : gl.uniformMatrix3x4fv(u, false, [... value]); break;
                            case gl.FLOAT_MAT4x2      : gl.uniformMatrix4x2fv(u, false, [... value]); break;
                            case gl.FLOAT_MAT4x3      : gl.uniformMatrix4x3fv(u, false, [... value]); break;
                        }
                    }
                }
            }
        }

        const attributes = {};
        {
            const nas = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
            for (let a = 0; a < nas; ++a) {
                const i = gl.getActiveAttrib(program, a);
                attributes[i.name] = {type : i.type, size : i.size, location : gl.getAttribLocation(program, i.name)};
            }
        }
        
        function size(type) {
            switch (type) {
                case gl.FLOAT        : return 1;
                case gl.FLOAT_VEC2   : return 2;
                case gl.FLOAT_VEC2   : return 3;
                case gl.FLOAT_VEC4   : return 4;
                case gl.FLOAT_MAT2   : return 4;
                case gl.FLOAT_MAT3   : return 9;
                case gl.FLOAT_MAT4   : return 16;
                default : if (version >= VERSION.WGL_2) {
                    switch (type) {
                        case gl.INT               :
                        case gl.UNSIGNED_INT      : return 1;
                        case gl.INT_VEC2          :
                        case gl.FLOAT_VEC2        :
                        case gl.UNSIGNED_INT_VEC2 : return 2;
                        case gl.INT_VEC3          :
                        case gl.UNSIGNED_INT_VEC3 : return 3;
                        case gl.INT_VEC4          :
                        case gl.UNSIGNED_INT_VEC4 : return 4;
                        case gl.FLOAT_MAT2x3      :
                        case gl.FLOAT_MAT3x2      : return 6;
                        case gl.FLOAT_MAT2x4      :
                        case gl.FLOAT_MAT4x2      : return 8
                        case gl.FLOAT_MAT3x4      :
                        case gl.FLOAT_MAT4x3      : return 12;
                    }
                }
            }
            return 0;
        }

        function type(type) {
            switch (type) {
                case gl.FLOAT        :
                case gl.FLOAT_VEC2   :
                case gl.FLOAT_VEC3   :
                case gl.FLOAT_VEC4   :
                case gl.FLOAT_MAT2   :
                case gl.FLOAT_MAT3   :
                case gl.FLOAT_MAT4   : return gl.FLOAT;
                default : if (version >= VERSION.WGL_2) {
                    switch (type) {
                        case gl.INT               :
                        case gl.INT_VEC2          :
                        case gl.INT_VEC3          :
                        case gl.INT_VEC4          : return gl.INT;
                        case gl.UNSIGNED_INT      :
                        case gl.UNSIGNED_INT_VEC2 :
                        case gl.UNSIGNED_INT_VEC3 :
                        case gl.UNSIGNED_INT_VEC4 : return gl.UNSIGNED_INT;
                        case gl.FLOAT_MAT2x3      :
                        case gl.FLOAT_MAT2x4      :
                        case gl.FLOAT_MAT3x2      :
                        case gl.FLOAT_MAT3x4      :
                        case gl.FLOAT_MAT4x2      :
                        case gl.FLOAT_MAT4x3      : return gl.FLOAT;
                        case gl.HALF_FLOAT        : return gl.HALF_FLOAT;
                    }
                }
            }
            return gl.INVALID_ENUM;
        }

        function attribute(name, layout) {
            const a = attributes[name];
            if (a === undefined) {
                throw 'invalid attribute';
            }
            if (layout !== undefined) {
                layout = Object.assign({size : size(a.type), type : type(a.type), normalize : false, stride : 0, offset : 0}, layout);
                gl.vertexAttribPointer(a.location, layout.size, layout.type, layout.normalize, layout.stride, layout.offset);
                gl.enableVertexAttribArray(a.location);
            } else {
                gl.disableVertexAttribArray(a.location);
            }
        }

        function attributei(name, layout) {
            if (version < VERSION.WGL_2) {
                throw 'not available';
            }
            const a = attributes[name];
            if (a === undefined) {
                throw 'invalid attribute';
            }
            if (layout !== undefined) {
                layout = Object.assign({size : size(a.type), type : type(a.type), normalize : false, stride : 0, offset : 0}, layout);
                gl.vertexAttribIPointer(a.location, layout.size, layout.type, layout.normalize, layout.stride, layout.offset);
                gl.enableVertexAttribArray(a.location);
            } else {
                gl.disableVertexAttribArray(a.location);
            }
            return a.location;
        }

        return {
            program,
            uniform,
            attribute,
            attributei
        }
    }

    return {
        VERSION,
        EVENT,
        version,
        extensions,
        shader : {
            vertex,
            fragment
        },
        program,
        material,

        addObserver,
        removeObserver
    };
}

export {WGL};

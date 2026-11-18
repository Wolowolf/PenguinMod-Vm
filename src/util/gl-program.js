/**
 * Desktop fork (section 303): one way to build a WebGL shader program for the extensions that draw with their own
 * shaders (Iris Text, Simple 3D; Pen+ already uses the same loader). It is the stage renderer's own loader (twgl,
 * which builds the renderer's shaders), so the same GLSL compiles and links exactly as before; it works on any
 * context, not only the renderer's. Lighting keeps its own (one copy, shared by its worker, which can't reach this).
 */

/**
 * Compile and link a program from a vertex and a fragment shader source. The shader objects are let go once the
 * program is linked (they are freed with it).
 * @param {RenderWebGL} renderer - the stage renderer, whose twgl does the work.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - the context to build the program in.
 * @param {string} vertexSource - GLSL of the vertex shader.
 * @param {string} fragmentSource - GLSL of the fragment shader.
 * @returns {WebGLProgram} the linked program.
 * @throws {Error} twgl's message (the source with line numbers and the compiler's log) when it does not compile or
 *     link; nothing is printed.
 */
const createProgram = (renderer, gl, vertexSource, fragmentSource) => {
    let message = '';
    const program = renderer.exports.twgl.createProgramFromSources(gl, [vertexSource, fragmentSource], error => {
        message = error;
    });
    if (!program) throw new Error(message || 'could not link program');
    for (const shader of gl.getAttachedShaders(program)) gl.deleteShader(shader);
    return program;
};

module.exports = {createProgram};

/**
 * Desktop fork (section 298): the small picture jobs that extensions used to repeat, shared.
 * - blobToDataURL: a File or Blob as a data: URL.
 * - setCanvasSkin: make or refresh a bitmap skin from a canvas.
 * - drawText: set a font and colours and draw a text, optionally with an outline.
 * - textCanvas: a canvas exactly as big as a text in a font, with the text's start point.
 * (Render's text-wrapper / measurement provider only wraps lines and caches widths; none of these jobs wraps text.)
 */

/**
 * Read a File or Blob as a data: URL.
 * @param {Blob} blob - the data.
 * @returns {Promise<string>} resolves with the data: URL, rejects with the FileReader's error.
 */
const blobToDataURL = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
});

/**
 * Put a canvas (or any bitmap the renderer takes) into a bitmap skin: a new skin when skinId is null or undefined,
 * otherwise the existing skin is refreshed. Showing the skin on a drawable is left to the caller.
 * @param {RenderWebGL} renderer - the renderer.
 * @param {?number} skinId - the skin to refresh, or null for a new one.
 * @param {HTMLCanvasElement|ImageData|ImageBitmap} canvas - the picture.
 * @param {number} [resolution] - pixels per stage unit (the renderer's default when left out).
 * @param {Array<number>} [rotationCenter] - the skin's centre (the picture's middle when left out).
 * @returns {number} the skin's ID.
 */
const setCanvasSkin = (renderer, skinId, canvas, resolution, rotationCenter) => {
    if (skinId === null || typeof skinId === 'undefined') {
        return renderer.createBitmapSkin(canvas, resolution, rotationCenter);
    }
    renderer.updateBitmapSkin(skinId, canvas, resolution, rotationCenter);
    return skinId;
};

/**
 * Set a font and colours on a 2D context and draw a text.
 * Only the given style parts are set on the context.
 * @param {CanvasRenderingContext2D} ctx - where to draw.
 * @param {string} text - the text.
 * @param {number} x - where the text starts (in the context's textAlign / textBaseline terms).
 * @param {number} y - the text's baseline.
 * @param {object} style - font (CSS font string), fill, stroke (colours), lineWidth, and outline:
 *     'under' (outline drawn before the fill), 'over' (after it) or left out (no outline).
 */
const drawText = (ctx, text, x, y, style) => {
    if (typeof style.font !== 'undefined') ctx.font = style.font;
    if (typeof style.stroke !== 'undefined') ctx.strokeStyle = style.stroke;
    if (typeof style.lineWidth !== 'undefined') ctx.lineWidth = style.lineWidth;
    if (typeof style.fill !== 'undefined') ctx.fillStyle = style.fill;
    if (style.outline === 'under') ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    if (style.outline === 'over') ctx.strokeText(text, x, y);
};

/**
 * A new canvas exactly as big as a text in a font (ink box wide, font box high) plus a margin on every side.
 * The canvas's context has the font set; x / y are where the text must be drawn (alphabetic baseline).
 * @param {string} text - the text.
 * @param {string} font - a CSS font string.
 * @param {number} [margin] - extra pixels on every side (0 when left out).
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number}} the canvas and start.
 */
const textCanvas = (text, font, margin = 0) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = font;
    const m = ctx.measureText(text);
    canvas.width = m.actualBoundingBoxLeft + m.actualBoundingBoxRight + (2 * margin);
    canvas.height = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent + (2 * margin);
    // Resizing a canvas resets its context, font included.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = font;
    return {canvas, ctx, x: m.actualBoundingBoxLeft + margin, y: m.fontBoundingBoxAscent + margin};
};

module.exports = {blobToDataURL, setCanvasSkin, drawText, textCanvas};

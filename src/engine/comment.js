/**
 * @fileoverview
 * Object representing a Scratch Comment (block or workspace).
 */

const uid = require('../util/uid');
const xmlEscape = require('../util/xml-escape');

class Comment {
    /**
     * @param {string} id Id of the comment.
     * @param {string} text Text content of the comment.
     * @param {number} x X position of the comment on the workspace.
     * @param {number} y Y position of the comment on the workspace.
     * @param {number} width The width of the comment when it is full size.
     * @param {number} height The height of the comment when it is full size.
     * @param {boolean} minimized Whether the comment is minimized.
     * @constructor
     */
    constructor (id, text, x, y, width, height, minimized) {
        this.id = id || uid();
        this.text = text;
        this.x = x;
        this.y = y;
        this.width = Math.max(Number(width), Comment.MIN_WIDTH);
        this.height = Math.max(Number(height), Comment.MIN_HEIGHT);
        this.minimized = minimized || false;
        this.blockId = null;
        // look of the comment set in the editor (colours, opacity, font), see Comment.cleanStyle
        this.style = null;
    }

    toXML () {
        return `<comment id="${this.id}" x="${this.x}" y="${
            this.y}" w="${this.width}" h="${this.height}" pinned="${
            this.blockId !== null}" minimized="${this.minimized}">${xmlEscape(this.text)}</comment>`;
    }

    /**
     * Keep only the known style fields with values of the right type.
     * @param {*} style A style object from a project file (or Better Comments' old storage).
     * @returns {?object} The cleaned style, or null when nothing is left.
     */
    static cleanStyle (style) {
        if (!style || typeof style !== 'object') return null;
        const clean = {};
        for (const key of ['color', 'color2', 'txtColor']) {
            if (typeof style[key] === 'string' && /^#[0-9a-f]{3,8}$/i.test(style[key])) clean[key] = style[key];
        }
        if (typeof style.font === 'string') clean.font = style.font.slice(0, 200);
        if (['left', 'center', 'right'].includes(style.textAlign)) clean.textAlign = style.textAlign;
        const opacity = Number(style.opacity);
        if (style.opacity !== undefined && opacity >= 10 && opacity <= 100) clean.opacity = opacity;
        const fontSize = Number(style.fontSize);
        if (style.fontSize !== undefined && fontSize >= 1 && fontSize <= 500) clean.fontSize = fontSize;
        for (const key of ['bold', 'italic']) {
            if (typeof style[key] === 'boolean') clean[key] = style[key];
        }
        return Object.keys(clean).length ? clean : null;
    }

    // TODO choose min and defaults for width and height
    static get MIN_WIDTH () {
        return 20;
    }

    static get MIN_HEIGHT () {
        return 20;
    }

    static get DEFAULT_WIDTH () {
        return 100;
    }

    static get DEFAULT_HEIGHT () {
        return 100;
    }

}

module.exports = Comment;

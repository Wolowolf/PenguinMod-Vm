const inflate = require('pako/lib/inflate').inflate;
const log = require('../util/log');
const AsyncLimiter = require('../util/async-limiter');

/**
 * Desktop fork (section 164): a project's costumes get a skin id when the project opens, but the skin is only made
 * (image decoded, texture uploaded, SVG parsed) the first time something reads it; the renderer does that on the spot
 * (Skin._pmDefer). The current costumes are decoded before the project starts; costumes that blocks can reach are made
 * in idle time right after, one at a time, so they are usually ready when first shown.
 * Only costumes whose size and rotation center are known without decoding them, or can wait to be read, are put off:
 * SVGs and simple PNGs. Everything else loads as before. Extensions that read costume skins' fields themselves
 * (EAGER_EXTENSIONS) switch back to making every skin at once.
 */

// read a costume's skin fields directly: Iris Text, Sprite Effects V2, Turbo Skins, Mouse Cursor, Looks Plus, Pen+,
// Video Sprites
const EAGER_EXTENSIONS = new Set([
    'g1nxIrisText', 'SPspriteEffectsV2', 'SPturboSkins', 'MouseCursor', 'lmsLooksPlus', 'penP', 'videoSprites'
]);
// blocks that can reach any of the target's costumes (or the stage's backdrops), not only those they name
const ANY_COSTUME = {looks_switchcostumeto: 'COSTUME', looks_nextcostume: ''};
const ANY_BACKDROP = {looks_switchbackdropto: 'BACKDROP', looks_switchbackdroptoandwait: 'BACKDROP', looks_nextbackdrop: ''};
const COSTUME_WORDS = ['next costume', 'previous costume', 'random costume'];
const BACKDROP_WORDS = ['next backdrop', 'previous backdrop', 'random backdrop'];

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const chunkName = (data, at) => String.fromCharCode(data[at + 4], data[at + 5], data[at + 6], data[at + 7]);
// chunks after which the browser's decoder may give other pixels than a plain decoding of the file
const UNPLAIN_CHUNKS = new Set(['gAMA', 'iCCP', 'cHRM', 'cICP', 'mDCV', 'cLLI', 'eXIf', 'acTL']);
const CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4};
// the passes of an interlaced PNG: first column, first row, column step, row step
const ADAM7 = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
const WHOLE = [[0, 0, 1, 1]];

/**
 * @param {Uint8Array} data - a file
 * @returns {?object} what decodePng needs when it is an 8-bit PNG without color profile
 */
const readPng = data => {
    if (data.length < 33 || !PNG_SIGNATURE.every((byte, i) => data[i] === byte)) return null;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    if (chunkName(data, 8) !== 'IHDR') return null;
    const info = {
        width: view.getUint32(16), height: view.getUint32(20), colorType: data[25], interlaced: data[28] === 1,
        palette: null, alpha: null, idat: []
    };
    if (!info.width || !info.height || data[24] !== 8 || data[28] > 1 || !CHANNELS[info.colorType]) return null;
    for (let at = 8; at + 12 <= data.length;) {
        const length = view.getUint32(at);
        const name = chunkName(data, at);
        const start = at + 8;
        if (start + length > data.length || UNPLAIN_CHUNKS.has(name)) return null;
        if (name === 'IDAT') info.idat.push(data.subarray(start, start + length));
        else if (name === 'PLTE') info.palette = data.subarray(start, start + length);
        else if (name === 'tRNS') {
            // gray and RGB: the color that is transparent, 2 bytes per channel; a first byte in an 8-bit file is odd
            const channels = info.colorType === 0 ? 1 : 3;
            if (info.colorType === 4 || info.colorType === 6) return null;
            if (info.colorType !== 3) {
                if (length !== channels * 2) return null;
                for (let i = 0; i < channels; i++) if (data[start + (i * 2)]) return null;
            }
            info.alpha = data.subarray(start, start + length);
        } else if (name === 'IEND') return info.idat.length && (info.colorType !== 3 || info.palette) ? info : null;
        at = start + length + 4;
    }
    return null;
};

const paeth = (a, b, c) => {
    const pa = Math.abs(b - c);
    const pb = Math.abs(a - c);
    const pc = Math.abs(a + b - c - c);
    if (pa <= pb && pa <= pc) return a;
    return pb <= pc ? b : c;
};

/**
 * Decode a PNG without waiting: for a skin needed before the browser's decoder could have finished.
 * @param {object} info - from readPng
 * @returns {HTMLCanvasElement} its pixels
 */
const decodePng = info => {
    const {width, height, colorType, palette, alpha} = info;
    const joined = new Uint8Array(info.idat.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of info.idat) {
        joined.set(part, offset);
        offset += part.length;
    }
    const raw = inflate(joined);
    const channels = CHANNELS[colorType];

    const rgba = new Uint8ClampedArray(width * height * 4);
    let at = 0;
    for (const [firstX, firstY, stepX, stepY] of info.interlaced ? ADAM7 : WHOLE) {
        const columns = Math.ceil((width - firstX) / stepX);
        const rows = Math.ceil((height - firstY) / stepY);
        // a pass without pixels has no data at all
        if (columns <= 0 || rows <= 0) continue;
        const rowBytes = columns * channels;
        if (raw.length < at + ((rowBytes + 1) * rows)) throw new Error('PNG data too short');
        let previous = new Uint8Array(rowBytes);
        let row = new Uint8Array(rowBytes);
        for (let y = 0; y < rows; y++) {
            const filter = raw[at++];
            for (let x = 0; x < rowBytes; x++) {
                const left = x >= channels ? row[x - channels] : 0;
                const up = previous[x];
                const upLeft = x >= channels ? previous[x - channels] : 0;
                let predicted = 0;
                if (filter === 1) predicted = left;
                else if (filter === 2) predicted = up;
                else if (filter === 3) predicted = (left + up) >> 1;
                else if (filter === 4) predicted = paeth(left, up, upLeft);
                row[x] = raw[at++] + predicted;
            }
            let out = ((firstY + (y * stepY)) * width + firstX) * 4;
            for (let x = 0; x < rowBytes; x += channels, out += stepX * 4) {
                if (colorType === 6 || colorType === 2) {
                    rgba[out] = row[x];
                    rgba[out + 1] = row[x + 1];
                    rgba[out + 2] = row[x + 2];
                    rgba[out + 3] = colorType === 6 ? row[x + 3] : 255;
                    if (colorType === 2 && alpha && row[x] === alpha[1] && row[x + 1] === alpha[3] &&
                            row[x + 2] === alpha[5]) rgba[out + 3] = 0;
                } else if (colorType === 3) {
                    const index = row[x];
                    rgba[out] = palette[index * 3];
                    rgba[out + 1] = palette[(index * 3) + 1];
                    rgba[out + 2] = palette[(index * 3) + 2];
                    rgba[out + 3] = alpha && index < alpha.length ? alpha[index] : 255;
                } else {
                    rgba[out] = rgba[out + 1] = rgba[out + 2] = row[x];
                    rgba[out + 3] = colorType === 4 ? row[x + 1] : 255;
                    if (colorType === 0 && alpha && row[x] === alpha[1]) rgba[out + 3] = 0;
                }
            }
            const swap = previous;
            previous = row;
            row = swap;
        }
    }
    // through a canvas, as an image is: the silhouette then reads the same values
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0);
    canvas.reusable = false;
    return canvas;
};

const readImage = new AsyncLimiter(asset => createImageBitmap(
    new Blob([asset.data.buffer], {type: asset.assetType.contentType})
), 25);

const idle = callback => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(callback, {timeout: 250});
    else setTimeout(() => callback({timeRemaining: () => 0}), 0);
};

// what a target's blocks can reach: costumes they name, or every costume / backdrop
const scanBlocks = target => {
    const names = new Set();
    let allCostumes = false;
    let allBackdrops = false;
    const blocks = target.blocks._blocks;
    for (const id in blocks) {
        const {opcode, fields, inputs} = blocks[id];
        for (const name in fields) names.add(String(fields[name].value));
        const reaches = (table) => {
            if (!(opcode in table)) return false;
            const input = inputs[table[opcode]];
            return !table[opcode] || (input && input.block !== input.shadow);
        };
        if (reaches(ANY_COSTUME)) allCostumes = true;
        if (reaches(ANY_BACKDROP)) allBackdrops = true;
    }
    if (COSTUME_WORDS.some(word => names.has(word))) allCostumes = true;
    if (BACKDROP_WORDS.some(word => names.has(word))) allBackdrops = true;
    return {names, allCostumes, allBackdrops};
};

// a costume's fields that deferVector makes read from the skin, and what they become when the skin is destroyed
const PARSED_WHEN_READ = [['size', [0, 0]], ['rotationCenterX', 0], ['rotationCenterY', 0]];

class LazyCostumes {
    constructor (runtime) {
        this.runtime = runtime;
        /** True once an extension that reads skins directly was loaded: from then on every skin is made at once. */
        this.eager = false;
        /** How many skins were needed before the browser's decoder had made them. */
        this.madeOnTheSpot = 0;
        this._warmQueue = [];
        this._warming = false;
        runtime.on('EXTENSION_ADDED', info => {
            if (!this.eager && info && EAGER_EXTENSIONS.has(info.id)) {
                this.eager = true;
                this.prepareAll();
            }
        });
    }

    /**
     * Put off an SVG costume's skin.
     * @param {object} costume - the costume
     * @param {Array.<number>} [rotationCenter] - its rotation center; without one, the middle of the SVG
     * @returns {boolean} false when it must be made now instead
     */
    deferVector (costume, rotationCenter) {
        const renderer = this.runtime.renderer;
        if (this.eager || !renderer.createDeferredSVGSkin) return false;
        const asset = costume.asset;
        costume.skinId = renderer.createDeferredSVGSkin(() => asset.decodeText(), rotationCenter, asset);
        // these come from parsing the file, so it is parsed when they are first read
        const parsedWhenRead = (name, get) => {
            Object.defineProperty(costume, name, {
                configurable: true,
                enumerable: true,
                get,
                set: value => {
                    Object.defineProperty(costume, name, {
                        configurable: true, enumerable: true, writable: true, value
                    });
                }
            });
        };
        parsedWhenRead('size', () => renderer.getSkinSize(costume.skinId));
        if (!rotationCenter) {
            parsedWhenRead('rotationCenterX', () => renderer.getSkinRotationCenter(costume.skinId)[0]);
            parsedWhenRead('rotationCenterY', () => renderer.getSkinRotationCenter(costume.skinId)[1]);
            costume.bitmapResolution = 1;
        }
        return true;
    }

    /**
     * Put off a bitmap costume's skin.
     * @param {object} costume - the costume
     * @param {Array.<number>} [rotationCenter] - its rotation center; without one, the middle of the image
     * @returns {boolean} false when it must be made now instead
     */
    deferBitmap (costume, rotationCenter) {
        const renderer = this.runtime.renderer;
        if (this.eager || !renderer.createDeferredBitmapSkin || costume.bitmapResolution === 1) return false;
        const asset = costume.asset;
        const info = readPng(asset.data);
        if (!info) return false;
        costume.bitmapResolution = 2;
        if (!rotationCenter) {
            costume.rotationCenterX = info.width / 2;
            costume.rotationCenterY = info.height / 2;
        }
        const center = rotationCenter ? [rotationCenter[0] / 2, rotationCenter[1] / 2] : [info.width / 4, info.height / 4];
        costume.skinId = renderer.createDeferredBitmapSkin(
            info.width, info.height, 2, center,
            () => {
                this.madeOnTheSpot++;
                return decodePng(info);
            },
            asset
        );
        costume.size = [info.width, info.height];
        return true;
    }

    // make a skin that was put off, with the browser's decoder when it is a bitmap
    _make (skinId) {
        const renderer = this.runtime.renderer;
        const asset = renderer.pmDeferredSource && renderer.pmDeferredSource(skinId);
        if (!asset) {
            // a freed SVG has no source to read, and is drawn again at once (section 165)
            if (renderer.pmPrepareSkin) renderer.pmPrepareSkin(skinId);
            return null;
        }
        if (asset.assetType.runtimeFormat === this.runtime.storage.AssetType.ImageVector.runtimeFormat) {
            renderer.pmPrepareSkin(skinId);
            return null;
        }
        return readImage.do(asset).then(
            image => {
                if (!image) throw new Error('no image');
                renderer.pmSetDeferredBitmap(skinId, image);
            },
            e => {
                log.warn('Decoding a costume failed, trying again', e);
                renderer.pmPrepareSkin(skinId);
            }
        );
    }

    _targetsWith (targets) {
        return new Set(targets.concat(this.runtime.targets));
    }

    /**
     * Desktop fork (section 167): a project was replaced: destroy its costumes' skins, which would otherwise stay for as
     * long as the app runs. A skin something else still shows stays. Skins of sprites and costumes deleted earlier aren't
     * among them: the memory budget frees those.
     * @param {Array.<Target>} targets - the targets that were disposed
     */
    destroySkins (targets) {
        const renderer = this.runtime.renderer;
        if (!renderer || !renderer.destroySkin) return;
        const shown = new Set();
        for (const drawable of renderer._allDrawables) {
            if (drawable && drawable.skin) shown.add(drawable.skin.id);
        }
        for (const target of targets) {
            for (const costume of target.getCostumes()) {
                // nothing to parse any more if someone still holds the costume
                for (const [name, value] of PARSED_WHEN_READ) {
                    const descriptor = Object.getOwnPropertyDescriptor(costume, name);
                    if (descriptor && descriptor.get) costume[name] = value;
                }
                if (renderer._allSkins[costume.skinId] && !shown.has(costume.skinId)) {
                    renderer.destroySkin(costume.skinId);
                }
            }
        }
    }

    /**
     * Make these targets' current costumes, or with eager on all costumes of them and of the project.
     * @param {Array.<Target>} targets - targets about to be added
     * @returns {Promise} resolves once they are made
     */
    prepareForStart (targets) {
        if (this.eager) return this.prepareAll(targets);
        return Promise.all(targets.map(target => {
            const costume = target.getCostumes()[target.currentCostume];
            return costume && this._make(costume.skinId);
        }));
    }

    /**
     * @param {Array.<Target>} [targets] - targets about to be added
     * @returns {Promise} resolves once every costume of the project and these targets is made
     */
    prepareAll (targets = []) {
        const promises = [];
        for (const target of this._targetsWith(targets)) {
            for (const costume of target.getCostumes()) promises.push(this._make(costume.skinId));
        }
        return Promise.all(promises);
    }

    /**
     * In idle time, one at a time, make the costumes that these targets' blocks can reach.
     * @param {Array.<Target>} targets - targets just added
     * @param {boolean} wholeProject - they replace the project
     */
    warmUp (targets, wholeProject) {
        if (wholeProject) this._warmQueue.length = 0;
        if (this.eager) return;
        const stage = this.runtime.getTargetForStage();
        const backdropNames = new Set();
        let allBackdrops = false;
        for (const target of this._targetsWith(targets)) {
            if (!target.isOriginal) continue;
            const scan = scanBlocks(target);
            if (scan.allBackdrops) allBackdrops = true;
            for (const name of scan.names) backdropNames.add(name);
            if (target.isStage || !targets.includes(target)) continue;
            for (const costume of target.getCostumes()) {
                if (scan.allCostumes || scan.names.has(costume.name)) this._warmQueue.push(costume.skinId);
            }
        }
        if (stage) {
            for (const costume of stage.getCostumes()) {
                if (allBackdrops || backdropNames.has(costume.name)) this._warmQueue.push(costume.skinId);
            }
        }
        if (!this._warming) this._warmNext();
    }

    _warmNext () {
        if (!this._warmQueue.length) {
            this._warming = false;
            return;
        }
        // Desktop fork (section 165): the rest is made when first needed
        if (!this.runtime.pmMemory.hasRoom()) {
            this._warmQueue.length = 0;
            this._warming = false;
            return;
        }
        this._warming = true;
        idle(deadline => {
            do {
                const made = this._warmQueue.length && this._make(this._warmQueue.shift());
                if (made) {
                    made.then(() => this._warmNext());
                    return;
                }
            } while (this._warmQueue.length && deadline.timeRemaining() > 2);
            this._warmNext();
        });
    }
}

module.exports = LazyCostumes;

// Desktop fork (docs/EXTENSION-INTEGRATION.md step 3, section 142): a gallery extension moved into the VM
// (src/extensions/*_gallery, listed in moved-gallery-extensions.json) keeps the gallery's code, wrapped in
// a function that is given a Scratch object: the API the gallery code is written against, made here for
// each extension (section 142 replaced the old unsandboxed-extension runner and its shared global.Scratch).
// This turns that function into a built-in extension class. `start(runtime)` runs the code with a new
// Scratch object for the runtime's VM and gives {extensionObject} when the code registered its extension
// at once (most do), and {registered}: a promise for it (some register only after loading their bundled
// libraries, e.g. TurboWarp's Box2D); the extension manager uses it (_loadMovedGalleryExtension). Making
// the class with `new` works only for one that registers at once.
const ArgumentType = require('./argument-type');
const ArgumentAlignment = require('./argument-alignment');
const BlockType = require('./block-type');
const BlockShape = require('./block-shape');
const NotchShape = require('./notch-shape');
const TargetType = require('./target-type');
const Cast = require('../util/cast');
const Clone = require('../util/clone');
const Color = require('../util/color');
const external = require('./tw-external');
const createTranslate = require('./tw-l10n');

/**
 * Parse a URL object or return null.
 * @param {string} url The url to parse
 * @returns {URL|null} The parsed url
 */
const parseURL = url => {
    try {
        return new URL(url, location.href);
    } catch (e) {
        return null;
    }
};

/**
 * Creates the Scratch object of a gallery extension. The editor adds `Scratch.gui` when it hears
 * EXTENSION_API_CREATED.
 * @param {VirtualMachine} vm The VM that these apis should refer to
 * @param {function(object)} register Called with the extension object passed to Scratch.extensions.register
 * @returns {object} The Scratch object
 */
const createExtensionAPI = (vm, register) => {
    const Scratch = {
        ArgumentType,
        ArgumentAlignment,
        BlockType,
        BlockShape,
        NotchShape,
        TargetType,
        Cast,
        Clone,
        Color,
        external
    };
    // The gallery code checks these flags (always true here).
    Scratch.extensions = {
        unsandboxed: true,
        isPenguinMod: true,
        register
    };
    Scratch.vm = vm;
    Scratch.renderer = vm.runtime.renderer;

    Scratch.canFetch = async url => {
        const parsed = parseURL(url);
        if (!parsed) {
            return false;
        }
        // Always allow protocols that don't involve a remote request.
        if (parsed.protocol === 'blob:' || parsed.protocol === 'data:') {
            return true;
        }
        return vm.securityManager.canFetch(parsed.href);
    };

    Scratch.canOpenWindow = async url => {
        const parsed = parseURL(url);
        if (!parsed) {
            return false;
        }
        // Always reject protocols that would allow code execution.
        // eslint-disable-next-line no-script-url
        if (parsed.protocol === 'javascript:') {
            return false;
        }
        return vm.securityManager.canOpenWindow(parsed.href);
    };

    Scratch.canRedirect = async url => {
        const parsed = parseURL(url);
        if (!parsed) {
            return false;
        }
        // Always reject protocols that would allow code execution.
        // eslint-disable-next-line no-script-url
        if (parsed.protocol === 'javascript:') {
            return false;
        }
        return vm.securityManager.canRedirect(parsed.href);
    };

    Scratch.fetch = async (url, options) => {
        const actualURL = url instanceof Request ? url.url : url;
        if (!await Scratch.canFetch(actualURL)) {
            throw new Error(`Permission to fetch ${actualURL} rejected.`);
        }
        return fetch(url, options);
    };

    Scratch.openWindow = async (url, features) => {
        if (!await Scratch.canOpenWindow(url)) {
            throw new Error(`Permission to open tab ${url} rejected.`);
        }
        return window.open(url, '_blank', features);
    };

    Scratch.redirect = async url => {
        if (!await Scratch.canRedirect(url)) {
            throw new Error(`Permission to redirect to ${url} rejected.`);
        }
        location.href = url;
    };

    Scratch.canRecordAudio = async () => vm.securityManager.canRecordAudio();

    Scratch.canRecordVideo = async () => vm.securityManager.canRecordVideo();

    Scratch.canReadClipboard = async () => vm.securityManager.canReadClipboard();

    Scratch.canNotify = async () => vm.securityManager.canNotify();

    Scratch.canGeolocate = async () => vm.securityManager.canGeolocate();

    Scratch.canEmbed = async url => {
        const parsed = parseURL(url);
        if (!parsed) {
            return false;
        }
        return vm.securityManager.canEmbed(parsed.href);
    };

    Scratch.canScreenshotCamera = async () => vm.securityManager.canScreenshotCamera();

    Scratch.canDownload = async (url, name) => {
        const parsed = parseURL(url);
        if (!parsed) {
            return false;
        }
        // Always reject protocols that would allow code execution.
        // eslint-disable-next-line no-script-url
        if (parsed.protocol === 'javascript:') {
            return false;
        }
        return vm.securityManager.canDownload(url, name);
    };

    Scratch.download = async (url, name) => {
        if (!await Scratch.canDownload(url, name)) {
            throw new Error(`Permission to download ${name} rejected.`);
        }
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    Scratch.translate = createTranslate(vm);

    vm.emit('EXTENSION_API_CREATED', Scratch);
    return Scratch;
};

const galleryExtension = code => {
    const GalleryExtension = function (runtime) {
        const started = GalleryExtension.start(runtime);
        if (!started.extensionObject) {
            throw new Error('This gallery extension registers later: load it with loadExtensionURL');
        }
        return started.extensionObject;
    };
    GalleryExtension.start = runtime => {
        const started = {extensionObject: null};
        started.registered = new Promise(resolve => {
            const Scratch = createExtensionAPI(runtime.vm, object => {
                if (started.extensionObject) {
                    throw new Error('A gallery extension moved into the VM may register only one extension');
                }
                started.extensionObject = object;
                Scratch.extensions.register = () => {
                    throw new Error('Too late to register new extensions.');
                };
                resolve(object);
            });
            code(Scratch);
        });
        return started;
    };
    return GalleryExtension;
};

module.exports = galleryExtension;

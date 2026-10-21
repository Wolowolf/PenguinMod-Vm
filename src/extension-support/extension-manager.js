const dispatch = require('../dispatch/central-dispatch');
const log = require('../util/log');
const maybeFormatMessage = require('../util/maybe-format-message');

const BlockType = require('./block-type');
const SecurityManager = require('./tw-security-manager');
const Cast = require('../util/cast');

const AddonSwitches = require('./extension-addon-switchers');

// Desktop fork: the gallery extensions that ship with the app (ID => address); nothing else loads.
const shippedExtensions = require('./shipped-extensions.json');
const normalizeExtensionURL = url => {
    try {
        return new URL(String(url).replace('penguinmod.site', 'penguinmod.com')).href;
    } catch (e) {
        return null;
    }
};
const shippedExtensionURLs = new Set(Object.values(shippedExtensions).map(normalizeExtensionURL));
const isShippedExtensionURL = url => shippedExtensionURLs.has(normalizeExtensionURL(url));
// Desktop fork: gallery extensions moved into the VM (ID => their old gallery address). Their gallery
// tiles still ask for that address, which loads the built-in extension instead.
const movedGalleryExtensions = require('./moved-gallery-extensions.json');
const movedGalleryIDs = new Map(Object.entries(movedGalleryExtensions)
    .map(([id, url]) => [normalizeExtensionURL(url), id]));

// thhank yoh random stack droverflwo person
async function sha256(source) {
    const sourceBytes = new TextEncoder().encode(source);
    const digest = await crypto.subtle.digest("SHA-256", sourceBytes);
    const resultBytes = [...new Uint8Array(digest)];
    return resultBytes.map(x => x.toString(16).padStart(2, '0')).join("");
}

// These extensions are currently built into the VM repository but should not be loaded at startup.
// TODO: move these out into a separate repository?
// TODO: change extension spec so that library info, including extension ID, can be collected through static methods

const defaultBuiltinExtensions = {
    // This is an example that isn't loaded with the other core blocks,
    // but serves as a reference for loading core blocks as extensions.
    // These are the non-core built-in extensions.
    pen: () => require('../extensions/scratch3_pen'),
    music: () => require('../extensions/scratch3_music'),
    videoSensing: () => require('../extensions/scratch3_video_sensing'),

    // garbomuffin: *silence*

    // pm: category expansions & seperations go here
    // pmMotionExpansion: extra motion blocks that were in the category & new ones that werent
    pmMotionExpansion: () => require("../extensions/pm_motionExpansion"),
    // pmOperatorsExpansion: extra operators that were in the category & new ones that werent
    pmOperatorsExpansion: () => require("../extensions/pm_operatorsExpansion"),
    // pmSensingExpansion: extra sensing blocks that were in the category & new ones that werent
    pmSensingExpansion: () => require("../extensions/pm_sensingExpansion"),
    // pmControlsExpansion: extra control blocks that were in the category & new ones that werent
    pmControlsExpansion: () => require("../extensions/pm_controlsExpansion"),
    // pmEventsExpansion: extra event blocks that were in the category & new ones that werent
    pmEventsExpansion: () => require("../extensions/pm_eventsExpansion"),


    // jg: jeremyes esxsitenisonsnsn
    // jgJSONParsed: handle JSON objects BETTER
    // jgJSONParsed: () => require("../extensions/jg_jsonParsed"),
    // jgPrism: blocks for specific use cases or major convenience
    jgPrism: () => require("../extensions/jg_prism"),
    // jgTween: epic animation
    jgTween: () => require("../extensions/jg_tween"),
    // jgTailgating: follow sprites like in an RPG
    jgTailgating: () => require("../extensions/jg_tailgating"),
    // jgCostumeDrawing: draw on costumes
    // hiding so fir doesnt touch
    // jgCostumeDrawing: () => require("../extensions/jg_costumeDrawing"),

    // jgAdvancedText: event extension requested by silvxrcat
    // hiding so fir doesnt touch
    // jgAdvancedText: () => require("../extensions/jg_advancedText"),


    // jw: hello it is i jwklong
    // jwProto: placeholders, labels, defenitons, we got em
    jwProto: () => require("../extensions/jw_proto"),
    // Blockly 2: a faithful recreation of the original blockly blocks
    // omega num port for penguinmod
    // good color utilties
    jwColor: () => require("../extensions/jwColor"),
    // date type
    // integers

    // jw: They'll think its made by jwklong >:)
    // (but it's not (yet (maybe (probably not (but its made by ianyourgod)))))
    // this is the real jwklong speaking, one word shall be said about this: A N G E R Y
    // Structs: hehe structs for oop (look at c)

    // theshovel: ...
    // shovellzcompresss: ...
    shovellzcompresss: () => require("../extensions/theshovel_lzString"),

    // gsa: fill out your introduction stupet!!!
    // no >:(
    // the replacment for the above extension
    // Camera: camera
    pmCamera: () => require('../extensions/pm_camera'),

    // sharkpool: insert sharkpools epic introduction here
    // sharkpoolPrinting: ...
    sharkpoolPrinting: () => require("../extensions/sharkpool_printing"),

    // silvxrcat: ...

    // TW extensions

    // lms: ...

    // xeltalliv: ...

    // DT: ...

    // griffpatch: ...
    // griffpatch: () => require('../extensions/griffpatch_box2d')

    // iyg: erm a crep, erm a werdohhhh
    // iygPerlin:
    iygPerlin: () => require('../extensions/iyg_perlin_noise'),
    // fr: waw 3d physics!!

    // Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the extensions of the three galleries, moved into the VM
    // (their gallery addresses: moved-gallery-extensions.json)
    // PenguinMod gallery
    P7BoxPhys: () => require('../extensions/penguinmod_gallery/pooiod/Box2D'),
    SPgrids: () => require('../extensions/penguinmod_gallery/SharkPool/Tile-Grids'),
    SPsoundWaves: () => require('../extensions/penguinmod_gallery/SharkPool/Sound-Waves'),
    beatSync: () => require('../extensions/penguinmod_gallery/Gen1x/beat_sync'),
    discordauth: () => require('../extensions/penguinmod_gallery/NotHouse/DiscordAuth'),
    divVecQuat: () => require('../extensions/penguinmod_gallery/Div/divVecQuat'),
    dogeiscutResolution: () => require('../extensions/penguinmod_gallery/DogeisCut/Resolution'),
    e2ee: () => require('../extensions/penguinmod_gallery/MikeDev101/e2ee'),
    embintranslation: () => require('../extensions/penguinmod_gallery/Embin/embintranslation'),
    g1nxIrisText: () => require('../extensions/penguinmod_gallery/Gen1x/iris-text'),
    g1nxLighting: () => require('../extensions/penguinmod_gallery/Gen1x/lighting'),
    gaimeriCryptoExtension: () => require('../extensions/penguinmod_gallery/gaimerI17/crypto'),
    gaimeriDeviceMotionExtension: () => require('../extensions/penguinmod_gallery/gaimerI17/DeviceMotion'),
    googleAuth: () => require('../extensions/penguinmod_gallery/Ikelene/googleAuthExtension'),
    midi: () => require('../extensions/penguinmod_gallery/electricfuzzball_pm/MIDI'),
    mubiloppenguinhook: () => require('../extensions/penguinmod_gallery/MubiLop/penguinhook'),
    numberUtilities: () => require('../extensions/penguinmod_gallery/MubiLop/numutils'),
    obviousAlexCMath3d: () => require('../extensions/penguinmod_gallery/ObviousAlexC/3DMath'),
    p7videosharing: () => require('../extensions/penguinmod_gallery/pooiod/VideoSharing'),
    pmTextToSpeech: () => require('../extensions/penguinmod_gallery/PuzzlingGGG/ttsrV2'),
    pooiod7Dictation: () => require('../extensions/penguinmod_gallery/pooiod/Dictation'),
    qxsckbignumber: () => require('../extensions/penguinmod_gallery/qxsck/big-decimal'),
    randomutils: () => require('../extensions/penguinmod_gallery/Gen1x/random_utils'),
    spritesheeter: () => require('../extensions/penguinmod_gallery/MubiLop/spritesheeter'),
    steve0greatnesstimers: () => require('../extensions/penguinmod_gallery/steve0greatness/timers'),
    toastnotifs: () => require('../extensions/penguinmod_gallery/MubiLop/toastnotifs'),
    webrtc: () => require('../extensions/penguinmod_gallery/MikeDev101/webrtc'),
    // TurboWarp gallery
    Bitwise: () => require('../extensions/turbowarp_gallery/bitwise'),
    Encoding: () => require('../extensions/turbowarp_gallery/encoding'),
    MouseCursor: () => require('../extensions/turbowarp_gallery/cursor'),
    SPASfontManager: () => require('../extensions/turbowarp_gallery/SharkPool/Font-Manager'),
    ShovelUtils: () => require('../extensions/turbowarp_gallery/TheShovel/ShovelUtils'),
    battery: () => require('../extensions/turbowarp_gallery/battery'),
    claytonhtmlencode: () => require('../extensions/turbowarp_gallery/Clay/htmlEncode'),
    clipboard: () => require('../extensions/turbowarp_gallery/clipboard'),
    cloudlink: () => require('../extensions/turbowarp_gallery/cloudlink'),
    cst1229zip: () => require('../extensions/turbowarp_gallery/CST1229/zip'),
    cubesterKeySimulation: () => require('../extensions/turbowarp_gallery/CubesterYT/KeySimulation'),
    cubesterWindowControls: () => require('../extensions/turbowarp_gallery/CubesterYT/WindowControls'),
    dninwakelock: () => require('../extensions/turbowarp_gallery/DNin/wake-lock'),
    dtbyxeroname: () => require('../extensions/turbowarp_gallery/XeroName/Deltatime'),
    faceSensing: () => require('../extensions/turbowarp_gallery/lab/face-sensing'),
    griffpatch: () => require('../extensions/turbowarp_gallery/box2d'),
    gsaWebsocket: () => require('../extensions/turbowarp_gallery/godslayerakp/ws'),
    itch: () => require('../extensions/turbowarp_gallery/itchio'),
    lmsData: () => require('../extensions/turbowarp_gallery/Lily/ListTools'),
    lmsLooksPlus: () => require('../extensions/turbowarp_gallery/Lily/LooksPlus'),
    lmsSoundExpanded: () => require('../extensions/turbowarp_gallery/Lily/SoundExpanded'),
    lmsVideo: () => require('../extensions/turbowarp_gallery/Lily/Video'),
    lmsclonesplus: () => require('../extensions/turbowarp_gallery/Lily/ClonesPlus'),
    lmsutilsblocks: () => require('../extensions/turbowarp_gallery/Lily/lmsutils'),
    localstorage: () => require('../extensions/turbowarp_gallery/local-storage'),
    mdwaltersnotifications: () => require('../extensions/turbowarp_gallery/mdwalters/notifications'),
    medericodertextcase: () => require('../extensions/turbowarp_gallery/Medericoder/textcase'),
    mobilekeyboard0419: () => require('../extensions/turbowarp_gallery/veggiecan/mobilekeyboard'),
    navigatorinfo: () => require('../extensions/turbowarp_gallery/navigator'),
    nonameawagraph: () => require('../extensions/turbowarp_gallery/NOname-awa/graphics2d'),
    obviousalexsensing: () => require('../extensions/turbowarp_gallery/obviousAlexC/SensingPlus'),
    penP: () => require('../extensions/turbowarp_gallery/obviousAlexC/penPlus'),
    pointerlock: () => require('../extensions/turbowarp_gallery/pointerlock'),
    qxsckvarandlist: () => require('../extensions/turbowarp_gallery/qxsck/var-and-list'),
    runtimeoptions: () => require('../extensions/turbowarp_gallery/runtime-options'),
    shovelColorPicker: () => require('../extensions/turbowarp_gallery/TheShovel/ColorPicker'),
    skyhigh173BigInt: () => require('../extensions/turbowarp_gallery/Skyhigh173/bigint'),
    steamworks: () => require('../extensions/turbowarp_gallery/steamworks'),
    stretch: () => require('../extensions/turbowarp_gallery/stretch'),
    strings: () => require('../extensions/turbowarp_gallery/text'),
    theshovelcanvaseffects: () => require('../extensions/turbowarp_gallery/TheShovel/CanvasEffects'),
    truefantombase: () => require('../extensions/turbowarp_gallery/true-fantom/base'),
    truefantommath: () => require('../extensions/turbowarp_gallery/true-fantom/math'),
    truefantomnetwork: () => require('../extensions/turbowarp_gallery/true-fantom/network'),
    utilities: () => require('../extensions/turbowarp_gallery/utilities'),
    videoSprites: () => require('../extensions/turbowarp_gallery/lab/video-sprites'),
    xeltallivSimple3D: () => require('../extensions/turbowarp_gallery/Xeltalliv/simple3D'),
    xeltallivclipblend: () => require('../extensions/turbowarp_gallery/Xeltalliv/clippingblending'),
    // SharkPool gallery
    CameraSensingPlusSP: () => require('../extensions/sharkpool_gallery/Camera-Sensing-Plus'),
    DICandSPmonitorsPlus: () => require('../extensions/sharkpool_gallery/Variables-Expanded'),
    Gamepad: () => require('../extensions/sharkpool_gallery/Gamepad-Expanded'),
    HyperSense2SP: () => require('../extensions/sharkpool_gallery/Hyper-Sense-V2'),
    LZcollisionsSP: () => require('../extensions/sharkpool_gallery/Lazy-Collisions'),
    ObscurasMIDITools: () => require('../extensions/sharkpool_gallery/MIDI-Tools'),
    SPadvControl: () => require('../extensions/sharkpool_gallery/Extra-Controls'),
    SPanimations: () => require('../extensions/sharkpool_gallery/Animations'),
    SPcolorMaster: () => require('../extensions/sharkpool_gallery/Color-Master'),
    SPgeolocation: () => require('../extensions/sharkpool_gallery/Geolocation'),
    SPgifManager: () => require('../extensions/sharkpool_gallery/GIF-Manager'),
    SPlayering: () => require('../extensions/sharkpool_gallery/Layer-Control'),
    SPmbpCST: () => require('../extensions/sharkpool_gallery/My-Blocks-Plus'),
    SPmessagePlus: () => require('../extensions/sharkpool_gallery/Messages-Plus'),
    SPpartEngine: () => require('../extensions/sharkpool_gallery/Particle-Engine'),
    SPpenPapers: () => require('../extensions/sharkpool_gallery/Pen-Papers'),
    SPpopups: () => require('../extensions/sharkpool_gallery/Popup-Phoenix'),
    SPqrCodes: () => require('../extensions/sharkpool_gallery/QR-Codes'),
    SPrecording2: () => require('../extensions/sharkpool_gallery/Recording-V2'),
    SPrigidBody: () => require('../extensions/sharkpool_gallery/Rigidbodies'),
    SPscenes: () => require('../extensions/sharkpool_gallery/Scenes'),
    SPspriteEffectsV2: () => require('../extensions/sharkpool_gallery/Sprite-Effects-V2'),
    SPspriteParent: () => require('../extensions/sharkpool_gallery/Sprite-Parenting'),
    SPsvgSheets: () => require('../extensions/sharkpool_gallery/SVG-Spritesheets'),
    SPtempVars: () => require('../extensions/sharkpool_gallery/Temporary-Variables'),
    SPtimeCalc: () => require('../extensions/sharkpool_gallery/Time-Calculation'),
    SPtuneShark3: () => require('../extensions/sharkpool_gallery/Tune-Shark-V3'),
    SPturboSkins: () => require('../extensions/sharkpool_gallery/Turbo-Skins'),
    SharkPoolSharktilities: () => require('../extensions/sharkpool_gallery/Sharktilities'),
    enderKeysPlusV2: () => require('../extensions/sharkpool_gallery/KeysPlusV2'),
    filesExpanded: () => require('../extensions/sharkpool_gallery/Files-Expanded'),
    speechSP: () => require('../extensions/sharkpool_gallery/Speech-Bubbles'),
};
const CORE_EXTENSIONS = [
    'argument',
    'colour',
    'control',
    'data',
    'event',
    'looks',
    'math',
    'motion',
    'operator',
    'procedures',
    'sensing',
    'sound'
];

const coreExtensionList = Object.getOwnPropertyNames(defaultBuiltinExtensions);

const preload = [];

/**
 * @typedef {object} ArgumentInfo - Information about an extension block argument
 * @property {ArgumentType} type - the type of value this argument can take
 * @property {*|undefined} default - the default value of this argument (default: blank)
 */

/**
 * @typedef {object} ConvertedBlockInfo - Raw extension block data paired with processed data ready for scratch-blocks
 * @property {ExtensionBlockMetadata} info - the raw block info
 * @property {object} json - the scratch-blocks JSON definition for this block
 * @property {string} xml - the scratch-blocks XML definition for this block
 */

/**
 * @typedef {object} CategoryInfo - Information about a block category
 * @property {string} id - the unique ID of this category
 * @property {string} name - the human-readable name of this category
 * @property {string|undefined} blockIconURI - optional URI for the block icon image
 * @property {string} color1 - the primary color for this category, in '#rrggbb' format
 * @property {string} color2 - the secondary color for this category, in '#rrggbb' format
 * @property {string} color3 - the tertiary color for this category, in '#rrggbb' format
 * @property {Array.<ConvertedBlockInfo>} blocks - the blocks, separators, etc. in this category
 * @property {Array.<object>} menus - the menus provided by this category
 */

/**
 * @typedef {object} PendingExtensionWorker - Information about an extension worker still initializing
 * @property {string} extensionURL - the URL of the extension to be loaded by this worker
 * @property {Function} resolve - function to call on successful worker startup
 * @property {Function} reject - function to call on failed worker startup
 */

const createExtensionService = extensionManager => {
    const service = {};
    service.registerExtensionServiceSync = extensionManager.registerExtensionServiceSync.bind(extensionManager);
    service.allocateWorker = extensionManager.allocateWorker.bind(extensionManager);
    service.onWorkerInit = extensionManager.onWorkerInit.bind(extensionManager);
    service.registerExtensionService = extensionManager.registerExtensionService.bind(extensionManager);
    return service;
};

class ExtensionManager {
    constructor(vm) {
        /**
         * The ID number to provide to the next extension worker.
         * @type {int}
         */
        this.nextExtensionWorker = 0;

        /**
         * FIFO queue of extensions which have been requested but not yet loaded in a worker,
         * along with promise resolution functions to call once the worker is ready or failed.
         *
         * @type {Array.<PendingExtensionWorker>}
         */
        this.pendingExtensions = [];

        /**
         * Map of worker ID to workers which have been allocated but have not yet finished initialization.
         * @type {Array.<PendingExtensionWorker>}
         */
        this.pendingWorkers = [];

        /**
         * Map of worker ID to the URL where it was loaded from.
         * @type {Array<string>}
         */
        this.workerURLs = [];

        /**
         * Set by the editor: (extension id, extension URL or undefined) => name to show instead of the
         * extension's own name, or a falsy value to keep it.
         * @type {?function}
         */
        this.categoryNameOf = null;

        /**
         * Map of loaded extension URLs/IDs to service names.
         * @type {Map.<string, string>}
         * @private
         */
        this._loadedExtensions = new Map();

        /**
         * Responsible for determining security policies related to custom extensions.
         */
        this.securityManager = new SecurityManager();

        /**
         * @type {VirtualMachine}
         */
        this.vm = vm;

        /**
         * Keep a reference to the runtime so we can construct internal extension objects.
         * TODO: remove this in favor of extensions accessing the runtime as a service.
         * @type {Runtime}
         */
        this.runtime = vm.runtime;

        this.loadingAsyncExtensions = 0;
        this.asyncExtensionsLoadedCallbacks = [];

        this.builtinExtensions = Object.assign({}, defaultBuiltinExtensions);
        // Desktop fork: moved gallery extensions still waiting to register (ID => promise)
        this._movedGalleryLoads = new Map();

        dispatch.setService('extensions', createExtensionService(this)).catch(e => {
            log.error(`ExtensionManager was unable to register extension service: ${JSON.stringify(e)}`);
        });

        preload.forEach(value => {
            this.loadExtensionURL(value);
        });

        this.extUrlCodes = {};

        // Desktop fork: only the extensions that ship with the app can load: the built-ins and the
        // gallery extensions in shipped-extensions.json (ID => address of the app's offline gallery
        // copy). A project saves only their IDs, like built-ins. A packaged project, which holds
        // baked copies the packager made from that list, switches the check off.
        this.unrestrictedExtensionURLs = false;
        // extensions that the user has stated (when they where loaded) that they do not wnat updated
        this.keepOlder = [];
        // map of all new shas so we know when a new code update has happened and so ask the user about it
        this.extensionHashes = {};
    }

    getCoreExtensionList() {
        return coreExtensionList;
    }
    getBuiltInExtensionsList() {
        return this.builtinExtensions;
    }

    getAddonBlockSwitches() {
        return AddonSwitches(this.vm);
    }

    /**
     * Check whether an extension is registered or is in the process of loading. This is intended to control loading or
     * adding extensions so it may return `true` before the extension is ready to be used. Use the promise returned by
     * `loadExtensionURL` if you need to wait until the extension is truly ready.
     * @param {string} extensionID - the ID of the extension.
     * @returns {boolean} - true if loaded, false otherwise.
     */
    isExtensionLoaded(extensionID) {
        return this._loadedExtensions.has(extensionID);
    }

    /**
     * Determine whether an extension with a given ID is built in to the VM, such as pen.
     * Note that "core extensions" like motion will return false here.
     * @param {string} extensionId The extension id to check
     * @returns {boolean} If the extension id is internal
     */
    isBuiltinExtension(extensionId) {
        return Object.prototype.hasOwnProperty.call(this.builtinExtensions, extensionId);
    }

    /**
     * Synchronously load an internal extension (core or non-core) by ID. This call will
     * fail if the provided id is not does not match an internal extension.
     * @param {string} extensionId - the ID of an internal extension
     */
    loadExtensionIdSync(extensionId) {
        if (!this.isBuiltinExtension(extensionId)) {
            log.warn(`Could not find extension ${extensionId} in the built in extensions.`);
            return;
        }

        /** @TODO dupe handling for non-builtin extensions. See commit 670e51d33580e8a2e852b3b038bb3afc282f81b9 */
        if (this.isExtensionLoaded(extensionId)) {
            const message = `Rejecting attempt to load a second extension with ID ${extensionId}`;
            log.warn(message);
            return;
        }

        if (Object.prototype.hasOwnProperty.call(movedGalleryExtensions, extensionId)) {
            // Desktop fork: added now, or when it registers (see _loadMovedGalleryExtension).
            this._loadMovedGalleryExtension(extensionId).catch(e => log.error(`Failed to load ${extensionId}`, e));
            return;
        }

        const extension = this.builtinExtensions[extensionId]();
        const extensionInstance = new extension(this.runtime);
        this._addBuiltinExtensionInstance(extensionId, extensionInstance);
    }

    _addBuiltinExtensionInstance(extensionId, extensionInstance) {
        const serviceName = this._registerInternalExtension(extensionInstance);
        // devs are stupid so uh
        // get the ACTUAL id of the ext so that saving/loading doesnt error
        const realId = extensionInstance.getInfo().id;
        this._loadedExtensions.set(extensionId, serviceName);
        this.runtime.compilerRegisterExtension(realId, extensionInstance);
    }

    // Desktop fork: a gallery extension moved into the VM (desktop-gallery-extension.js). Most
    // register while their code runs and are added at once, like loadExtensionIdSync; some register
    // only after loading their bundled libraries (TurboWarp's Box2D): the promise waits for them.
    _loadMovedGalleryExtension(extensionId) {
        if (this.isExtensionLoaded(extensionId)) return Promise.resolve();
        if (!this._movedGalleryLoads.has(extensionId)) {
            const started = this.builtinExtensions[extensionId]().start(this.runtime);
            if (started.extensionObject) {
                this._addBuiltinExtensionInstance(extensionId, started.extensionObject);
                return Promise.resolve();
            }
            this._movedGalleryLoads.set(extensionId, started.registered.then(extensionObject => {
                this._movedGalleryLoads.delete(extensionId);
                this._addBuiltinExtensionInstance(extensionId, extensionObject);
            }));
        }
        return this._movedGalleryLoads.get(extensionId);
    }

    addBuiltinExtension (extensionId, extensionClass) {
        this.builtinExtensions[extensionId] = () => extensionClass;
    }

    // Desktop fork: a gallery address is accepted only when it is the address of a shipped
    // extension (shipped-extensions.json); other gallery files, web addresses, data:, blob: and
    // file: are refused.
    _isValidExtensionURL(extensionURL) {
        if (this.unrestrictedExtensionURLs) {
            try {
                const protocol = new URL(extensionURL).protocol;
                return protocol === 'https:' || protocol === 'http:' ||
                    protocol === 'data:' || protocol === 'file:';
            } catch (e) {
                return false;
            }
        }
        return isShippedExtensionURL(extensionURL);
    }

    /**
     * Load an extension by URL or internal extension ID
     * @param {string} extensionURL - the URL for the extension to load OR the ID of an internal extension
     * @param {string|null} oldHash - included when loading, contains the known hash that is from the loaded file so it can be compared with the one gotten over the url
     * @returns {Promise} resolved once the extension is loaded and initialized or rejected on failure
     */
    async loadExtensionURL(extensionURL, oldHash = '') {
        const movedID = movedGalleryIDs.get(normalizeExtensionURL(extensionURL));
        if (movedID) extensionURL = movedID;
        if (Object.prototype.hasOwnProperty.call(movedGalleryExtensions, extensionURL)) {
            await this._loadMovedGalleryExtension(extensionURL);
            return [extensionURL];
        }
        if (this.isBuiltinExtension(extensionURL)) {
            this.loadExtensionIdSync(extensionURL);
            return [extensionURL];
        }

        if (this.isExtensionURLLoaded(extensionURL)) {
            // Extension is already loaded.
            return [];
        }

        if (!this._isValidExtensionURL(extensionURL)) {
            throw new Error(`Invalid extension URL: ${extensionURL}`);
        }

        if (extensionURL.includes("penguinmod.site")) {
            alert("Extensions using penguinmod.site are deprecated, please swap them over to use penguinmod.com instead.")
        }
        const normalURL = extensionURL.replace("penguinmod.site", "penguinmod.com");

        this.runtime.setExternalCommunicationMethod('customExtensions', true);

        this.loadingAsyncExtensions++;

        const rewritten = await this.securityManager.rewriteExtensionURL(normalURL);
        const blob = (await fetch(rewritten).then(req => req.blob()))
        const blobUrl = URL.createObjectURL(blob)
        const newHash = await new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = async ({ target: { result } }) => {
                console.log(result)
                this.extUrlCodes[extensionURL] = result
                resolve(await sha256(result))
            }
            reader.onerror = err => {
                console.error('couldnt read the contents of url', url, err)
            }
            reader.readAsText(blob)
        })
        this.extensionHashes[extensionURL] = newHash
        if (oldHash && oldHash !== newHash && this.securityManager.shouldUseLocal(extensionURL)) return Promise.reject('useLocal')

        // Desktop fork: shipped extensions always run unsandboxed (no worker or iframe sandbox).
        const { load } = require('./tw-unsandboxed-extension-runner');
        const extensionObjects = await load(blobUrl, this.vm)
            .catch(error => this._failedLoadingExtensionScript(error));
        const fakeWorkerId = this.nextExtensionWorker++;
        const returnedIDs = [];
        this.workerURLs[fakeWorkerId] = normalURL;

        for (const extensionObject of extensionObjects) {
            const extensionInfo = extensionObject.getInfo();
            const serviceName = `unsandboxed.${fakeWorkerId}.${extensionInfo.id}`;
            dispatch.setServiceSync(serviceName, extensionObject);
            dispatch.callSync('extensions', 'registerExtensionServiceSync', serviceName);
            this._loadedExtensions.set(extensionInfo.id, serviceName);
            returnedIDs.push(extensionInfo.id);
            this.runtime.compilerRegisterExtension(extensionInfo.id, extensionObject);
        }

        this._finishedLoadingExtensionScript();
        return returnedIDs;
    }

    /**
     * Wait until all async extensions have loaded
     * @returns {Promise} resolved when all async extensions have loaded
     */
    allAsyncExtensionsLoaded() {
        if (this.loadingAsyncExtensions === 0) {
            return;
        }
        return new Promise((resolve, reject) => {
            this.asyncExtensionsLoadedCallbacks.push({
                resolve,
                reject
            });
        });
    }

    /**
     * Regenerate blockinfo for all (or one) loaded dynamic extensions
     * @param {string} [extension] optional extension id
     * @returns {Promise} resolved once all the extensions have been reinitialized
     */
    refreshDynamicCategorys(extension) {
        const refresh_service = service =>
            dispatch.call(service, 'getInfo')
                .then(info => {
                    info = this._prepareExtensionInfo(service, info);
                    if (!info.isDynamic) return;
                    dispatch.call('runtime', '_refreshExtensionPrimitives', info);
                })
                .catch(e => {
                    log.error(`Failed to refresh built-in extension primitives: ${e}`);
                })

        if (!this._loadedExtensions) return Promise.reject('_loadedExtensions is not readable yet');
        if (!extension) {
            const all_services = Array.from(this._loadedExtensions.values()).map(refresh_service);
            return Promise.all(all_services);
        }
        if (!this._loadedExtensions.has(extension)) {
            return Promise.reject(new Error(`Unknown extension: ${extension}`));
        }

        return refresh_service(this._loadedExtensions.get(extension));
    }

    /**
     * Regenerate blockinfo for all (or one) loaded extensions
     * @param {string} [extension] optional extension id
     * @returns {Promise} resolved once all the extensions have been reinitialized
     */
    refreshBlocks(extension) {
        const refresh_service = service =>
            dispatch.call(service, 'getInfo')
                .then(info => {
                    info = this._prepareExtensionInfo(service, info);
                    dispatch.call('runtime', '_refreshExtensionPrimitives', info);
                })
                .catch(e => {
                    log.error(`Failed to refresh built-in extension primitives: ${e}`);
                });

        if (!extension) {
            const all_services = Array.from(this._loadedExtensions.values()).map(refresh_service);
            return Promise.all(all_services);
        }
        if (!this._loadedExtensions.has(extension)) {
            return Promise.reject(new Error(`Unknown extension: ${extension}`));
        }

        return refresh_service(this._loadedExtensions.get(extension));
    }

    prepareSwap(id) {
        const serviceName = this._loadedExtensions.get(id);
        const { provider, isRemote } = dispatch._getServiceProvider(serviceName);
        if (isRemote || typeof provider.dispose === 'function') 
            dispatch.call(serviceName, 'dispose');
        delete dispatch.services[serviceName];
        delete this.runtime[`ext_${id}`];

        this._loadedExtensions.delete(id);
        const workerId = +serviceName.split('.')[1];
        delete this.workerURLs[workerId];
    }
    removeExtension(id) {
        const serviceName = this._loadedExtensions.get(id);
        const { provider, isRemote } = dispatch._getServiceProvider(serviceName);
        if (isRemote || typeof provider.dispose === 'function') 
            dispatch.call(serviceName, 'dispose');
        delete dispatch.services[serviceName];
        delete this.runtime[`ext_${id}`];

        this._loadedExtensions.delete(id);
        const workerId = +serviceName.split('.')[1];
        delete this.workerURLs[workerId];
        dispatch.call('runtime', '_removeExtensionPrimitive', id);
        this.refreshBlocks();
    }
    getExtensionIdFromOpcode(opcode) {
        // Allowed ID characters are those matching the regular expression [\w-]: A-Z, a-z, 0-9, and hyphen ("-").
        if (!(typeof opcode === 'string')) {
            console.error('invalid opcode ' + opcode);
            return '';
        }
        const index = opcode.indexOf('_');
        const forbiddenSymbols = /[^\w-]/g;
        const prefix = opcode.substring(0, index).replace(forbiddenSymbols, '-');
        if (CORE_EXTENSIONS.indexOf(prefix) === -1) {
            if (prefix !== '') return prefix;
        }
    }
    findUsedExtensions() {
        const results = [];
        for (const target of this.runtime.targets) {
            for (const blockId in target.blocks._blocks) {
                const block = target.blocks.getBlock(blockId);
                const ext = this.getExtensionIdFromOpcode(block.opcode);
                results.push(ext);
            }
        }
        return results;
    }
    removeUnusedExtensions() {
        const all = [...this._loadedExtensions.keys()];
        const used = this.findUsedExtensions();
        const unused = all.filter(ext => !used.includes(ext));
        for (const toRemove of unused)
            this.removeExtension(toRemove);
    }

    allocateWorker() {
        const id = this.nextExtensionWorker++;
        const workerInfo = this.pendingExtensions.shift();
        this.pendingWorkers[id] = workerInfo;
        this.workerURLs[id] = workerInfo.extensionURL;
        return [id, workerInfo.extensionURL];
    }

    /**
     * Synchronously collect extension metadata from the specified service and begin the extension registration process.
     * @param {string} serviceName - the name of the service hosting the extension.
     */
    registerExtensionServiceSync(serviceName) {
        const info = dispatch.callSync(serviceName, 'getInfo');
        this._registerExtensionInfo(serviceName, info);
    }

    /**
     * Collect extension metadata from the specified service and begin the extension registration process.
     * @param {string} serviceName - the name of the service hosting the extension.
     */
    registerExtensionService(serviceName) {
        dispatch.call(serviceName, 'getInfo').then(info => {
            this._loadedExtensions.set(info.id, serviceName);
            this._registerExtensionInfo(serviceName, info);
            this._finishedLoadingExtensionScript();
        });
    }

    _finishedLoadingExtensionScript() {
        this.loadingAsyncExtensions--;
        if (this.loadingAsyncExtensions === 0) {
            this.asyncExtensionsLoadedCallbacks.forEach(i => i.resolve());
            this.asyncExtensionsLoadedCallbacks = [];
        }
    }

    _failedLoadingExtensionScript(error) {
        // Don't set the current extension counter to 0, otherwise it will go negative if another
        // extension finishes or fails to load.
        this.loadingAsyncExtensions--;
        this.asyncExtensionsLoadedCallbacks.forEach(i => i.reject(error));
        this.asyncExtensionsLoadedCallbacks = [];
        // Re-throw error so the promise still rejects.
        throw error;
    }

    /**
     * Called by an extension worker to indicate that the worker has finished initialization.
     * @param {int} id - the worker ID.
     * @param {*?} e - the error encountered during initialization, if any.
     */
    onWorkerInit(id, e) {
        const workerInfo = this.pendingWorkers[id];
        delete this.pendingWorkers[id];
        if (e) {
            workerInfo.reject(e);
        } else {
            workerInfo.resolve();
        }
    }

    /**
     * Register an internal (non-Worker) extension object
     * @param {object} extensionObject - the extension object to register
     * @returns {string} The name of the registered extension service
     */
    _registerInternalExtension(extensionObject) {
        const extensionInfo = extensionObject.getInfo();
        const fakeWorkerId = this.nextExtensionWorker++;
        const serviceName = `extension_${fakeWorkerId}_${extensionInfo.id}`;
        dispatch.setServiceSync(serviceName, extensionObject);
        dispatch.callSync('extensions', 'registerExtensionServiceSync', serviceName);
        return serviceName;
    }

    /**
     * Sanitize extension info then register its primitives with the VM.
     * @param {string} serviceName - the name of the service hosting the extension
     * @param {ExtensionInfo} extensionInfo - the extension's metadata
     * @private
     */
    _registerExtensionInfo(serviceName, extensionInfo) {
        extensionInfo = this._prepareExtensionInfo(serviceName, extensionInfo);
        dispatch.call('runtime', '_registerExtensionPrimitives', extensionInfo).catch(e => {
            log.error(`Failed to register primitives for extension on service ${serviceName}:`, e);
        });
    }

    /**
     * Apply minor cleanup and defaults for optional extension fields.
     * TODO: make the ID unique in cases where two copies of the same extension are loaded.
     * @param {string} serviceName - the name of the service hosting this extension block
     * @param {ExtensionInfo} extensionInfo - the extension info to be sanitized
     * @returns {ExtensionInfo} - a new extension info object with cleaned-up values
     * @private
     */
    _prepareExtensionInfo(serviceName, extensionInfo) {
        extensionInfo = Object.assign({}, extensionInfo);
        if (!/^[a-z0-9]+$/i.test(extensionInfo.id)) {
            throw new Error('Invalid extension id');
        }
        extensionInfo.name = extensionInfo.name || extensionInfo.id;
        // a name given by the editor for this extension (its URL or built-in id) replaces its own
        if (this.categoryNameOf) {
            // Service names for extension workers are in the format "extension.WORKER_ID.EXTENSION_ID"
            const extensionURL = this.workerURLs[+serviceName.split('.')[1]];
            const name = this.categoryNameOf(extensionInfo.id, extensionURL);
            if (name) extensionInfo.name = name;
        }
        extensionInfo.blocks = extensionInfo.blocks || [];
        extensionInfo.targetTypes = extensionInfo.targetTypes || [];
        extensionInfo.menus = extensionInfo.menus || {};
        extensionInfo.menus = this._prepareMenuInfo(serviceName, extensionInfo.menus);
        extensionInfo.blocks = extensionInfo.blocks.reduce((results, blockInfo) => {
            try {
                let result;
                switch (blockInfo) {
                case '---': // separator
                    result = '---';
                    break;
                default: // an ExtensionBlockMetadata object
                    result = this._prepareBlockInfo(serviceName, blockInfo, extensionInfo.menus);
                    break;
                }
                results.push(result);
            } catch (e) {
                // TODO: more meaningful error reporting
                log.error(`Error processing block: ${e.message}, Block:\n${JSON.stringify(blockInfo)}`, e);
            }
            return results;
        }, []);
        return extensionInfo;
    }

    /**
     * Prepare extension menus. e.g. setup binding for dynamic menu functions.
     * @param {string} serviceName - the name of the service hosting this extension block
     * @param {Array.<MenuInfo>} menus - the menu defined by the extension.
     * @returns {Array.<MenuInfo>} - a menuInfo object with all preprocessing done.
     * @private
     */
    _prepareMenuInfo(serviceName, menus) {
        const menuNames = Object.getOwnPropertyNames(menus);
        for (let i = 0; i < menuNames.length; i++) {
            const menuName = menuNames[i];
            let menuInfo = menus[menuName];

            // If the menu description is in short form (items only) then normalize it to general form: an object with
            // its items listed in an `items` property.
            if (!menuInfo.items && (typeof menuInfo.variableType !== 'string')) {
                menuInfo = {
                    items: menuInfo
                };
                menus[menuName] = menuInfo;
            }
            // If `items` is a string, it should be the name of a function in the extension object. Calling the
            // function should return an array of items to populate the menu when it is opened.
            if (typeof menuInfo.items === 'string') {
                const menuItemFunctionName = menuInfo.items;
                const serviceObject = dispatch.services[serviceName];
                // Bind the function here so we can pass a simple item generation function to Scratch Blocks later.
                menuInfo.items = this._getExtensionMenuItems.bind(this, serviceObject, menuItemFunctionName);
            }
        }
        return menus;
    }

    /**
     * Fetch the items for a particular extension menu, providing the target ID for context.
     * @param {object} extensionObject - the extension object providing the menu.
     * @param {string} menuItemFunctionName - the name of the menu function to call.
     * @returns {Array} menu items ready for scratch-blocks.
     * @private
     */
    _getExtensionMenuItems(extensionObject, menuItemFunctionName, field) {
        // Fetch the items appropriate for the target currently being edited. This assumes that menus only
        // collect items when opened by the user while editing a particular target.
        const editingTarget = this.runtime.getEditingTarget() || this.runtime.getTargetForStage();
        const editingTargetID = editingTarget ? editingTarget.id : null;
        const extensionMessageContext = this.runtime.makeMessageContextForTarget(editingTarget);

        // PenguinMod Desktop: the values of the other menus of the block this menu sits in ({ARG: value}),
        // when scratch-blocks says which field asks (so one menu can depend on another)
        const blockArgs = {};
        const menuBlock = field && field.sourceBlock_;
        const parent = menuBlock && menuBlock.getParent && menuBlock.getParent();
        if (parent && parent.inputList) {
            for (const input of parent.inputList) {
                const shadow = input.connection && input.connection.targetBlock();
                const shadowField = shadow && shadow.isShadow() && shadow.inputList[0] && shadow.inputList[0].fieldRow[0];
                if (shadowField && shadowField.getValue) blockArgs[input.name] = shadowField.getValue();
            }
        }

        // TODO: Fix this to use dispatch.call when extensions are running in workers.
        const menuFunc = extensionObject[menuItemFunctionName];
        const menuItems = menuFunc.call(extensionObject, editingTargetID, blockArgs).map(
            item => {
                item = maybeFormatMessage(item, extensionMessageContext);
                switch (typeof item) {
                case 'object':
                    if (Array.isArray(item)) return item.slice(0, 2);
                    return [
                        maybeFormatMessage(item.text, extensionMessageContext),
                        item.value
                    ].concat(item.disabled ? ['disabled'] : []);
                case 'string':
                    return [item, item];
                default:
                    return item;
                }
            });

        if (!menuItems || menuItems.length < 1) {
            throw new Error(`Extension menu returned no items: ${menuItemFunctionName}`);
        }
        return menuItems;
    }

    _normalize(thing, to) {
        switch (to) {
        case 'string': return Cast.toString(thing);
        case 'bigint':
        case 'number': return Cast.toNumber(thing);
        case 'boolean': return Cast.toBoolean(thing);
        case 'function': return new Function(thing);
        default: return Cast.toString(thing);
        }
    }

    /**
     * Apply defaults for optional block fields.
     * @param {string} serviceName - the name of the service hosting this extension block
     * @param {ExtensionBlockMetadata} blockInfo - the block info from the extension
     * @param {object.<ExtensionMenuMetadata>} menus The menus from the extension
     * @returns {ExtensionBlockMetadata} - a new block info object which has values for all relevant optional fields.
     * @private
     */
    _prepareBlockInfo(serviceName, blockInfo, menus) {
        if (blockInfo.blockType === BlockType.XML) {
            blockInfo = Object.assign({}, blockInfo);
            blockInfo.xml = String(blockInfo.xml) || '';
            return blockInfo;
        }

        blockInfo = Object.assign({}, {
            blockType: BlockType.COMMAND,
            terminal: false,
            blockAllThreads: false,
            arguments: {}
        }, blockInfo);
        blockInfo.text = blockInfo.text || blockInfo.opcode;

        switch (blockInfo.blockType) {
        case BlockType.EVENT:
            if (blockInfo.func) {
                log.warn(`Ignoring function "${blockInfo.func}" for event block ${blockInfo.opcode}`);
            }
            break;
        case BlockType.BUTTON:
            if (!blockInfo.opcode && !blockInfo.func) {
                throw new Error(`Missing opcode or func for button: ${blockInfo.text}`);
            }

            if (blockInfo.func && !blockInfo.opcode) {
                blockInfo.opcode = blockInfo.func;
            }
            const funcName = blockInfo.opcode;
            const callBlockFunc = (...args) => dispatch.call(serviceName, funcName, ...args);

            blockInfo.func = callBlockFunc;
            break;
        case BlockType.LABEL:
            break;
        default: {
            if (!blockInfo.opcode) {
                throw new Error('Missing opcode for block');
            }

            const funcName = blockInfo.func || blockInfo.opcode;

            const getBlockInfo = blockInfo.isDynamic ?
                args => args && args.mutation && args.mutation.blockInfo :
                () => blockInfo;
            const callBlockFunc = (() => {
                if (dispatch._isRemoteService(serviceName)) {
                    return (args, util, realBlockInfo) =>
                        dispatch.call(serviceName, funcName, args, util, realBlockInfo)
                            .then(result => {
                                // Scratch is only designed to handle these types.
                                // If any other value comes in such as undefined, null, an object, etc.
                                // we'll convert it to a string to avoid undefined behavior.
                                if (
                                    typeof result === 'number' ||
                                        typeof result === 'string' ||
                                        typeof result === 'boolean'
                                ) {
                                    return result;
                                }
                                return `${result}`;
                            })
                        // When an error happens, instead of returning undefined, we'll return a stringified
                        // version of the error so that it can be debugged.
                            .catch(err => {
                                // We want the full error including stack to be printed but the log helper
                                // messes with that.
                                // eslint-disable-next-line no-console
                                console.error('Custom extension block error', err);
                                return `${err}`;
                            });
                }

                // avoid promise latency if we can call direct
                const serviceObject = dispatch.services[serviceName];
                if (!serviceObject) {
                    // extension was likely removed
                    return () => {};
                }
                if (!serviceObject[funcName]) {
                    // The function might show up later as a dynamic property of the service object
                    log.warn(`Could not find extension block function called ${funcName}`);
                }
                return (args, util, realBlockInfo) =>
                    serviceObject[funcName](args, util, realBlockInfo);
            })();

            blockInfo.func = (args, util, visualReport) => {
                const normal = {
                    'angle': "number",
                    'Boolean': "boolean",
                    'color': "string",
                    'number': "number",
                    'string': "string",
                    'matrix': "string",
                    'note': "number",
                    'image': "string",
                    'polygon': "object",
                    // normalization exceptions
                    'list': "exception",
                    'broadcast': "exception"
                };
                const realBlockInfo = getBlockInfo(args);
                for (const arg in realBlockInfo.arguments) {
                    const expected = normal[realBlockInfo.arguments[arg].type];
                    if (realBlockInfo.arguments[arg].exemptFromNormalization === true) continue;
                    if (expected === 'exception') continue;
                    if (!expected) continue;
                    // stupidly long check but :Trollhands
                    // if this argument is for a variable dropdown, do not type cast it
                    // as variable dropdowns report an object and not something we can or should cast
                    if (typeof menus[realBlockInfo.arguments[arg].menu]?.variableType === 'string') continue;
                    if (!(typeof args[arg] === expected)) args[arg] = this._normalize(args[arg], expected);
                }
                // TODO: filter args using the keys of realBlockInfo.arguments? maybe only if sandboxed?
                const returnValue = callBlockFunc(args, util, realBlockInfo);
                const isCustomAPI = (returnValue?.value ?? false) && (returnValue?.constructor?.name !== "Object");
                //if (!visualReport && isCustomAPI && realBlockInfo.exemptFromNormalization !== true) return returnValue.value;
                return returnValue;
            };
            break;
        }
        }

        return blockInfo;
    }

    extensionUrlFromId(extId) {
        for (const [extensionId, serviceName] of this._loadedExtensions.entries()) {
            if (extensionId !== extId) continue;
            // Service names for extension workers are in the format "extension.WORKER_ID.EXTENSION_ID"
            const workerId = +serviceName.split('.')[1];
            return this.workerURLs[workerId];
        }
    }
    getExtensionURLs() {
        const extensionURLs = {};
        for (const [extensionId, serviceName] of this._loadedExtensions.entries()) {
            // Service names for extension workers are in the format "extension.WORKER_ID.EXTENSION_ID"
            const workerId = +serviceName.split('.')[1];
            const extensionURL = this.workerURLs[workerId];
            if (typeof extensionURL === 'string') {
                extensionURLs[extensionId] = extensionURL;
            } else if (Object.prototype.hasOwnProperty.call(movedGalleryExtensions, extensionId)) {
                // Desktop fork: lets the extension library mark a moved extension's gallery tile as used.
                extensionURLs[extensionId] = movedGalleryExtensions[extensionId];
            }
        }
        return extensionURLs;
    }

    isExtensionURLLoaded (url) {
        return this.workerURLs.includes(url);
    }
}

module.exports = ExtensionManager;

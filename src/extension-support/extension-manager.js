const log = require('../util/log');
const maybeFormatMessage = require('../util/maybe-format-message');

const BlockType = require('./block-type');
const SecurityManager = require('./tw-security-manager');
const Cast = require('../util/cast');

const AddonSwitches = require('./extension-addon-switchers');

const normalizeExtensionURL = url => {
    try {
        return new URL(String(url).replace('penguinmod.site', 'penguinmod.com')).href;
    } catch (e) {
        return null;
    }
};
// Desktop fork: only built-in extensions load; nothing loads from an address. The gallery extensions
// were moved into the VM (ID => their old gallery address); their gallery tiles still ask for that
// address, which loads the built-in extension instead.
const movedGalleryExtensions = require('./moved-gallery-extensions.json');
const movedGalleryIDs = new Map(Object.entries(movedGalleryExtensions)
    .map(([id, url]) => [normalizeExtensionURL(url), id]));
const movedGalleryAddressOf = id => (Object.prototype.hasOwnProperty.call(movedGalleryExtensions, id) ?
    movedGalleryExtensions[id] : undefined);

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
    // (their gallery addresses: moved-gallery-extensions.json), each in its own chunk of the build, fetched
    // only when the extension is loaded (see _loadMovedGalleryExtension)
    // PenguinMod gallery
    P7BoxPhys: () => import(/* webpackChunkName: "ext-P7BoxPhys" */ '../extensions/penguinmod_gallery/pooiod/Box2D'),
    SPgrids: () => import(/* webpackChunkName: "ext-SPgrids" */ '../extensions/penguinmod_gallery/SharkPool/Tile-Grids'),
    SPsoundWaves: () => import(/* webpackChunkName: "ext-SPsoundWaves" */ '../extensions/penguinmod_gallery/SharkPool/Sound-Waves'),
    beatSync: () => import(/* webpackChunkName: "ext-beatSync" */ '../extensions/penguinmod_gallery/Gen1x/beat_sync'),
    discordauth: () => import(/* webpackChunkName: "ext-discordauth" */ '../extensions/penguinmod_gallery/NotHouse/DiscordAuth'),
    divVecQuat: () => import(/* webpackChunkName: "ext-divVecQuat" */ '../extensions/penguinmod_gallery/Div/divVecQuat'),
    dogeiscutResolution: () => import(/* webpackChunkName: "ext-dogeiscutResolution" */ '../extensions/penguinmod_gallery/DogeisCut/Resolution'),
    e2ee: () => import(/* webpackChunkName: "ext-e2ee" */ '../extensions/penguinmod_gallery/MikeDev101/e2ee'),
    embintranslation: () => import(/* webpackChunkName: "ext-embintranslation" */ '../extensions/penguinmod_gallery/Embin/embintranslation'),
    g1nxIrisText: () => import(/* webpackChunkName: "ext-g1nxIrisText" */ '../extensions/penguinmod_gallery/Gen1x/iris-text'),
    g1nxLighting: () => import(/* webpackChunkName: "ext-g1nxLighting" */ '../extensions/penguinmod_gallery/Gen1x/lighting'),
    gaimeriCryptoExtension: () => import(/* webpackChunkName: "ext-gaimeriCryptoExtension" */ '../extensions/penguinmod_gallery/gaimerI17/crypto'),
    gaimeriDeviceMotionExtension: () => import(/* webpackChunkName: "ext-gaimeriDeviceMotionExtension" */ '../extensions/penguinmod_gallery/gaimerI17/DeviceMotion'),
    googleAuth: () => import(/* webpackChunkName: "ext-googleAuth" */ '../extensions/penguinmod_gallery/Ikelene/googleAuthExtension'),
    midi: () => import(/* webpackChunkName: "ext-midi" */ '../extensions/penguinmod_gallery/electricfuzzball_pm/MIDI'),
    mubiloppenguinhook: () => import(/* webpackChunkName: "ext-mubiloppenguinhook" */ '../extensions/penguinmod_gallery/MubiLop/penguinhook'),
    numberUtilities: () => import(/* webpackChunkName: "ext-numberUtilities" */ '../extensions/penguinmod_gallery/MubiLop/numutils'),
    obviousAlexCMath3d: () => import(/* webpackChunkName: "ext-obviousAlexCMath3d" */ '../extensions/penguinmod_gallery/ObviousAlexC/3DMath'),
    p7videosharing: () => import(/* webpackChunkName: "ext-p7videosharing" */ '../extensions/penguinmod_gallery/pooiod/VideoSharing'),
    pmTextToSpeech: () => import(/* webpackChunkName: "ext-pmTextToSpeech" */ '../extensions/penguinmod_gallery/PuzzlingGGG/ttsrV2'),
    pooiod7Dictation: () => import(/* webpackChunkName: "ext-pooiod7Dictation" */ '../extensions/penguinmod_gallery/pooiod/Dictation'),
    qxsckbignumber: () => import(/* webpackChunkName: "ext-qxsckbignumber" */ '../extensions/penguinmod_gallery/qxsck/big-decimal'),
    randomutils: () => import(/* webpackChunkName: "ext-randomutils" */ '../extensions/penguinmod_gallery/Gen1x/random_utils'),
    spritesheeter: () => import(/* webpackChunkName: "ext-spritesheeter" */ '../extensions/penguinmod_gallery/MubiLop/spritesheeter'),
    steve0greatnesstimers: () => import(/* webpackChunkName: "ext-steve0greatnesstimers" */ '../extensions/penguinmod_gallery/steve0greatness/timers'),
    toastnotifs: () => import(/* webpackChunkName: "ext-toastnotifs" */ '../extensions/penguinmod_gallery/MubiLop/toastnotifs'),
    webrtc: () => import(/* webpackChunkName: "ext-webrtc" */ '../extensions/penguinmod_gallery/MikeDev101/webrtc'),
    // TurboWarp gallery
    Bitwise: () => import(/* webpackChunkName: "ext-Bitwise" */ '../extensions/turbowarp_gallery/bitwise'),
    Encoding: () => import(/* webpackChunkName: "ext-Encoding" */ '../extensions/turbowarp_gallery/encoding'),
    MouseCursor: () => import(/* webpackChunkName: "ext-MouseCursor" */ '../extensions/turbowarp_gallery/cursor'),
    SPASfontManager: () => import(/* webpackChunkName: "ext-SPASfontManager" */ '../extensions/turbowarp_gallery/SharkPool/Font-Manager'),
    ShovelUtils: () => import(/* webpackChunkName: "ext-ShovelUtils" */ '../extensions/turbowarp_gallery/TheShovel/ShovelUtils'),
    battery: () => import(/* webpackChunkName: "ext-battery" */ '../extensions/turbowarp_gallery/battery'),
    claytonhtmlencode: () => import(/* webpackChunkName: "ext-claytonhtmlencode" */ '../extensions/turbowarp_gallery/Clay/htmlEncode'),
    clipboard: () => import(/* webpackChunkName: "ext-clipboard" */ '../extensions/turbowarp_gallery/clipboard'),
    cloudlink: () => import(/* webpackChunkName: "ext-cloudlink" */ '../extensions/turbowarp_gallery/cloudlink'),
    cst1229zip: () => import(/* webpackChunkName: "ext-cst1229zip" */ '../extensions/turbowarp_gallery/CST1229/zip'),
    cubesterKeySimulation: () => import(/* webpackChunkName: "ext-cubesterKeySimulation" */ '../extensions/turbowarp_gallery/CubesterYT/KeySimulation'),
    cubesterWindowControls: () => import(/* webpackChunkName: "ext-cubesterWindowControls" */ '../extensions/turbowarp_gallery/CubesterYT/WindowControls'),
    dninwakelock: () => import(/* webpackChunkName: "ext-dninwakelock" */ '../extensions/turbowarp_gallery/DNin/wake-lock'),
    dtbyxeroname: () => import(/* webpackChunkName: "ext-dtbyxeroname" */ '../extensions/turbowarp_gallery/XeroName/Deltatime'),
    faceSensing: () => import(/* webpackChunkName: "ext-faceSensing" */ '../extensions/turbowarp_gallery/lab/face-sensing'),
    griffpatch: () => import(/* webpackChunkName: "ext-griffpatch" */ '../extensions/turbowarp_gallery/box2d'),
    gsaWebsocket: () => import(/* webpackChunkName: "ext-gsaWebsocket" */ '../extensions/turbowarp_gallery/godslayerakp/ws'),
    itch: () => import(/* webpackChunkName: "ext-itch" */ '../extensions/turbowarp_gallery/itchio'),
    lmsData: () => import(/* webpackChunkName: "ext-lmsData" */ '../extensions/turbowarp_gallery/Lily/ListTools'),
    lmsLooksPlus: () => import(/* webpackChunkName: "ext-lmsLooksPlus" */ '../extensions/turbowarp_gallery/Lily/LooksPlus'),
    lmsSoundExpanded: () => import(/* webpackChunkName: "ext-lmsSoundExpanded" */ '../extensions/turbowarp_gallery/Lily/SoundExpanded'),
    lmsVideo: () => import(/* webpackChunkName: "ext-lmsVideo" */ '../extensions/turbowarp_gallery/Lily/Video'),
    lmsclonesplus: () => import(/* webpackChunkName: "ext-lmsclonesplus" */ '../extensions/turbowarp_gallery/Lily/ClonesPlus'),
    lmsutilsblocks: () => import(/* webpackChunkName: "ext-lmsutilsblocks" */ '../extensions/turbowarp_gallery/Lily/lmsutils'),
    localstorage: () => import(/* webpackChunkName: "ext-localstorage" */ '../extensions/turbowarp_gallery/local-storage'),
    mdwaltersnotifications: () => import(/* webpackChunkName: "ext-mdwaltersnotifications" */ '../extensions/turbowarp_gallery/mdwalters/notifications'),
    medericodertextcase: () => import(/* webpackChunkName: "ext-medericodertextcase" */ '../extensions/turbowarp_gallery/Medericoder/textcase'),
    mobilekeyboard0419: () => import(/* webpackChunkName: "ext-mobilekeyboard0419" */ '../extensions/turbowarp_gallery/veggiecan/mobilekeyboard'),
    navigatorinfo: () => import(/* webpackChunkName: "ext-navigatorinfo" */ '../extensions/turbowarp_gallery/navigator'),
    nonameawagraph: () => import(/* webpackChunkName: "ext-nonameawagraph" */ '../extensions/turbowarp_gallery/NOname-awa/graphics2d'),
    obviousalexsensing: () => import(/* webpackChunkName: "ext-obviousalexsensing" */ '../extensions/turbowarp_gallery/obviousAlexC/SensingPlus'),
    penP: () => import(/* webpackChunkName: "ext-penP" */ '../extensions/turbowarp_gallery/obviousAlexC/penPlus'),
    pointerlock: () => import(/* webpackChunkName: "ext-pointerlock" */ '../extensions/turbowarp_gallery/pointerlock'),
    qxsckvarandlist: () => import(/* webpackChunkName: "ext-qxsckvarandlist" */ '../extensions/turbowarp_gallery/qxsck/var-and-list'),
    runtimeoptions: () => import(/* webpackChunkName: "ext-runtimeoptions" */ '../extensions/turbowarp_gallery/runtime-options'),
    shovelColorPicker: () => import(/* webpackChunkName: "ext-shovelColorPicker" */ '../extensions/turbowarp_gallery/TheShovel/ColorPicker'),
    skyhigh173BigInt: () => import(/* webpackChunkName: "ext-skyhigh173BigInt" */ '../extensions/turbowarp_gallery/Skyhigh173/bigint'),
    steamworks: () => import(/* webpackChunkName: "ext-steamworks" */ '../extensions/turbowarp_gallery/steamworks'),
    stretch: () => import(/* webpackChunkName: "ext-stretch" */ '../extensions/turbowarp_gallery/stretch'),
    strings: () => import(/* webpackChunkName: "ext-strings" */ '../extensions/turbowarp_gallery/text'),
    theshovelcanvaseffects: () => import(/* webpackChunkName: "ext-theshovelcanvaseffects" */ '../extensions/turbowarp_gallery/TheShovel/CanvasEffects'),
    truefantombase: () => import(/* webpackChunkName: "ext-truefantombase" */ '../extensions/turbowarp_gallery/true-fantom/base'),
    truefantommath: () => import(/* webpackChunkName: "ext-truefantommath" */ '../extensions/turbowarp_gallery/true-fantom/math'),
    truefantomnetwork: () => import(/* webpackChunkName: "ext-truefantomnetwork" */ '../extensions/turbowarp_gallery/true-fantom/network'),
    utilities: () => import(/* webpackChunkName: "ext-utilities" */ '../extensions/turbowarp_gallery/utilities'),
    videoSprites: () => import(/* webpackChunkName: "ext-videoSprites" */ '../extensions/turbowarp_gallery/lab/video-sprites'),
    xeltallivSimple3D: () => import(/* webpackChunkName: "ext-xeltallivSimple3D" */ '../extensions/turbowarp_gallery/Xeltalliv/simple3D'),
    xeltallivclipblend: () => import(/* webpackChunkName: "ext-xeltallivclipblend" */ '../extensions/turbowarp_gallery/Xeltalliv/clippingblending'),
    // SharkPool gallery
    CameraSensingPlusSP: () => import(/* webpackChunkName: "ext-CameraSensingPlusSP" */ '../extensions/sharkpool_gallery/Camera-Sensing-Plus'),
    DICandSPmonitorsPlus: () => import(/* webpackChunkName: "ext-DICandSPmonitorsPlus" */ '../extensions/sharkpool_gallery/Variables-Expanded'),
    Gamepad: () => import(/* webpackChunkName: "ext-Gamepad" */ '../extensions/sharkpool_gallery/Gamepad-Expanded'),
    HyperSense2SP: () => import(/* webpackChunkName: "ext-HyperSense2SP" */ '../extensions/sharkpool_gallery/Hyper-Sense-V2'),
    LZcollisionsSP: () => import(/* webpackChunkName: "ext-LZcollisionsSP" */ '../extensions/sharkpool_gallery/Lazy-Collisions'),
    ObscurasMIDITools: () => import(/* webpackChunkName: "ext-ObscurasMIDITools" */ '../extensions/sharkpool_gallery/MIDI-Tools'),
    SPadvControl: () => import(/* webpackChunkName: "ext-SPadvControl" */ '../extensions/sharkpool_gallery/Extra-Controls'),
    SPanimations: () => import(/* webpackChunkName: "ext-SPanimations" */ '../extensions/sharkpool_gallery/Animations'),
    SPcolorMaster: () => import(/* webpackChunkName: "ext-SPcolorMaster" */ '../extensions/sharkpool_gallery/Color-Master'),
    SPgeolocation: () => import(/* webpackChunkName: "ext-SPgeolocation" */ '../extensions/sharkpool_gallery/Geolocation'),
    SPgifManager: () => import(/* webpackChunkName: "ext-SPgifManager" */ '../extensions/sharkpool_gallery/GIF-Manager'),
    SPlayering: () => import(/* webpackChunkName: "ext-SPlayering" */ '../extensions/sharkpool_gallery/Layer-Control'),
    SPmbpCST: () => import(/* webpackChunkName: "ext-SPmbpCST" */ '../extensions/sharkpool_gallery/My-Blocks-Plus'),
    SPmessagePlus: () => import(/* webpackChunkName: "ext-SPmessagePlus" */ '../extensions/sharkpool_gallery/Messages-Plus'),
    SPpartEngine: () => import(/* webpackChunkName: "ext-SPpartEngine" */ '../extensions/sharkpool_gallery/Particle-Engine'),
    SPpenPapers: () => import(/* webpackChunkName: "ext-SPpenPapers" */ '../extensions/sharkpool_gallery/Pen-Papers'),
    SPpopups: () => import(/* webpackChunkName: "ext-SPpopups" */ '../extensions/sharkpool_gallery/Popup-Phoenix'),
    SPqrCodes: () => import(/* webpackChunkName: "ext-SPqrCodes" */ '../extensions/sharkpool_gallery/QR-Codes'),
    SPrecording2: () => import(/* webpackChunkName: "ext-SPrecording2" */ '../extensions/sharkpool_gallery/Recording-V2'),
    SPrigidBody: () => import(/* webpackChunkName: "ext-SPrigidBody" */ '../extensions/sharkpool_gallery/Rigidbodies'),
    SPscenes: () => import(/* webpackChunkName: "ext-SPscenes" */ '../extensions/sharkpool_gallery/Scenes'),
    SPspriteEffectsV2: () => import(/* webpackChunkName: "ext-SPspriteEffectsV2" */ '../extensions/sharkpool_gallery/Sprite-Effects-V2'),
    SPspriteParent: () => import(/* webpackChunkName: "ext-SPspriteParent" */ '../extensions/sharkpool_gallery/Sprite-Parenting'),
    SPsvgSheets: () => import(/* webpackChunkName: "ext-SPsvgSheets" */ '../extensions/sharkpool_gallery/SVG-Spritesheets'),
    SPtempVars: () => import(/* webpackChunkName: "ext-SPtempVars" */ '../extensions/sharkpool_gallery/Temporary-Variables'),
    SPtimeCalc: () => import(/* webpackChunkName: "ext-SPtimeCalc" */ '../extensions/sharkpool_gallery/Time-Calculation'),
    SPtuneShark3: () => import(/* webpackChunkName: "ext-SPtuneShark3" */ '../extensions/sharkpool_gallery/Tune-Shark-V3'),
    SPturboSkins: () => import(/* webpackChunkName: "ext-SPturboSkins" */ '../extensions/sharkpool_gallery/Turbo-Skins'),
    SharkPoolSharktilities: () => import(/* webpackChunkName: "ext-SharkPoolSharktilities" */ '../extensions/sharkpool_gallery/Sharktilities'),
    enderKeysPlusV2: () => import(/* webpackChunkName: "ext-enderKeysPlusV2" */ '../extensions/sharkpool_gallery/KeysPlusV2'),
    filesExpanded: () => import(/* webpackChunkName: "ext-filesExpanded" */ '../extensions/sharkpool_gallery/Files-Expanded'),
    speechSP: () => import(/* webpackChunkName: "ext-speechSP" */ '../extensions/sharkpool_gallery/Speech-Bubbles'),
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

// Desktop fork (section 142): extensions are plain objects kept here and called directly. The message
// system for extensions in workers (src/dispatch, "extension_<n>_<id>" service names) is gone: every
// extension is built in and runs on the page.
class ExtensionManager {
    constructor(vm) {
        /**
         * Set by the editor: (extension id, gallery address or undefined) => name to show instead of the
         * extension's own name, or a falsy value to keep it.
         * @type {?function}
         */
        this.categoryNameOf = null;

        /**
         * Map of loaded extension IDs to extension objects.
         * @type {Map.<string, object>}
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

        this.builtinExtensions = Object.assign({}, defaultBuiltinExtensions);
        // Desktop fork: moved gallery extensions still waiting to register (ID => promise)
        this._movedGalleryLoads = new Map();
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
        this._registerInternalExtension(extensionInstance);
        // devs are stupid so uh
        // get the ACTUAL id of the ext so that saving/loading doesnt error
        const realId = extensionInstance.getInfo().id;
        this._loadedExtensions.set(extensionId, extensionInstance);
        this.runtime.compilerRegisterExtension(realId, extensionInstance);
    }

    // Desktop fork: a gallery extension moved into the VM (desktop-gallery-extension.js). Its code is
    // in its own chunk of the build ("ext-<ID>"), fetched the first time it is loaded (a packaged game
    // holds the chunks of its project's extensions); it is added once it registers, which most do
    // while their code runs and some only after loading their bundled libraries (TurboWarp's Box2D).
    _loadMovedGalleryExtension(extensionId) {
        if (this.isExtensionLoaded(extensionId)) return Promise.resolve();
        if (!this._movedGalleryLoads.has(extensionId)) {
            const loading = this.builtinExtensions[extensionId]()
                .then(module => (module.default || module).start(this.runtime).registered)
                .then(extensionObject => {
                    this._movedGalleryLoads.delete(extensionId);
                    if (!this.isExtensionLoaded(extensionId)) {
                        this._addBuiltinExtensionInstance(extensionId, extensionObject);
                    }
                }, error => {
                    this._movedGalleryLoads.delete(extensionId);
                    throw error;
                });
            this._movedGalleryLoads.set(extensionId, loading);
        }
        return this._movedGalleryLoads.get(extensionId);
    }

    addBuiltinExtension (extensionId, extensionClass) {
        this.builtinExtensions[extensionId] = () => extensionClass;
    }

    /**
     * Load an extension by internal extension ID, or by the old gallery address of a gallery
     * extension moved into the VM (Desktop fork: nothing else loads from an address).
     * @param {string} extensionURL - the ID of an internal extension, or a moved extension's gallery address
     * @returns {Promise} resolved once the extension is loaded and initialized or rejected on failure
     */
    async loadExtensionURL(extensionURL) {
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
        throw new Error(`Unknown extension: ${extensionURL}`);
    }

    /**
     * Regenerate blockinfo for all (or one) loaded dynamic extensions
     * @param {string} [extension] optional extension id
     * @returns {Promise} resolved once all the extensions have been reinitialized
     */
    refreshDynamicCategorys(extension) {
        const refresh_service = extensionObject =>
            new Promise(resolve => resolve(extensionObject.getInfo()))
                .then(info => {
                    info = this._prepareExtensionInfo(extensionObject, info);
                    if (!info.isDynamic) return;
                    this._callRuntime('_refreshExtensionPrimitives', info);
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
        const refresh_service = extensionObject =>
            new Promise(resolve => resolve(extensionObject.getInfo()))
                .then(info => {
                    info = this._prepareExtensionInfo(extensionObject, info);
                    this._callRuntime('_refreshExtensionPrimitives', info);
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

    // Desktop fork (section 142): calls an extension's dispose() and logs what it throws, as the old message
    // system did.
    _disposeExtension(extensionObject) {
        if (!extensionObject || typeof extensionObject.dispose !== 'function') return;
        try {
            extensionObject.dispose();
        } catch (e) {
            log.error('Extension dispose failed', e);
        }
    }

    // Desktop fork (section 142): calls a runtime method and logs what it throws (the old message system
    // turned it into a rejected promise that nothing waited for).
    _callRuntime(method, ...args) {
        try {
            this.runtime[method](...args);
        } catch (e) {
            log.error(`Runtime ${method} failed:`, e);
        }
    }

    prepareSwap(id) {
        this._disposeExtension(this._loadedExtensions.get(id));
        delete this.runtime[`ext_${id}`];

        this._loadedExtensions.delete(id);
    }
    removeExtension(id) {
        this._disposeExtension(this._loadedExtensions.get(id));
        delete this.runtime[`ext_${id}`];

        this._loadedExtensions.delete(id);
        this._callRuntime('_removeExtensionPrimitive', id);
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

    /**
     * Register an extension object's blocks with the VM.
     * @param {object} extensionObject - the extension object to register
     * @returns {object} The extension object (what _loadedExtensions keeps)
     */
    _registerInternalExtension(extensionObject) {
        this._registerExtensionInfo(extensionObject, extensionObject.getInfo());
        return extensionObject;
    }

    /**
     * Sanitize extension info then register its primitives with the VM.
     * @param {object} extensionObject - the extension object
     * @param {ExtensionInfo} extensionInfo - the extension's metadata
     * @private
     */
    _registerExtensionInfo(extensionObject, extensionInfo) {
        extensionInfo = this._prepareExtensionInfo(extensionObject, extensionInfo);
        this._callRuntime('_registerExtensionPrimitives', extensionInfo);
    }

    /**
     * Apply minor cleanup and defaults for optional extension fields.
     * TODO: make the ID unique in cases where two copies of the same extension are loaded.
     * @param {object} extensionObject - the extension object
     * @param {ExtensionInfo} extensionInfo - the extension info to be sanitized
     * @returns {ExtensionInfo} - a new extension info object with cleaned-up values
     * @private
     */
    _prepareExtensionInfo(extensionObject, extensionInfo) {
        extensionInfo = Object.assign({}, extensionInfo);
        if (!/^[a-z0-9]+$/i.test(extensionInfo.id)) {
            throw new Error('Invalid extension id');
        }
        extensionInfo.name = extensionInfo.name || extensionInfo.id;
        // a name given by the editor for this extension (its gallery address or built-in id) replaces its own
        if (this.categoryNameOf) {
            const name = this.categoryNameOf(extensionInfo.id, movedGalleryAddressOf(extensionInfo.id));
            if (name) extensionInfo.name = name;
        }
        extensionInfo.blocks = extensionInfo.blocks || [];
        extensionInfo.targetTypes = extensionInfo.targetTypes || [];
        extensionInfo.menus = extensionInfo.menus || {};
        extensionInfo.menus = this._prepareMenuInfo(extensionObject, extensionInfo.menus);
        extensionInfo.blocks = extensionInfo.blocks.reduce((results, blockInfo) => {
            try {
                let result;
                switch (blockInfo) {
                case '---': // separator
                    result = '---';
                    break;
                default: // an ExtensionBlockMetadata object
                    result = this._prepareBlockInfo(extensionObject, blockInfo, extensionInfo.menus);
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
     * @param {object} extensionObject - the extension object
     * @param {Array.<MenuInfo>} menus - the menu defined by the extension.
     * @returns {Array.<MenuInfo>} - a menuInfo object with all preprocessing done.
     * @private
     */
    _prepareMenuInfo(extensionObject, menus) {
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
                // Bind the function here so we can pass a simple item generation function to Scratch Blocks later.
                menuInfo.items = this._getExtensionMenuItems.bind(this, extensionObject, menuItemFunctionName);
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
     * @param {object} extensionObject - the extension object
     * @param {ExtensionBlockMetadata} blockInfo - the block info from the extension
     * @param {object.<ExtensionMenuMetadata>} menus The menus from the extension
     * @returns {ExtensionBlockMetadata} - a new block info object which has values for all relevant optional fields.
     * @private
     */
    _prepareBlockInfo(extensionObject, blockInfo, menus) {
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
            // a promise, as from the old message system
            const callBlockFunc = (...args) => new Promise(resolve => resolve(extensionObject[funcName](...args)));

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
            if (!extensionObject[funcName]) {
                // The function might show up later as a dynamic property of the extension object
                log.warn(`Could not find extension block function called ${funcName}`);
            }
            const callBlockFunc = (args, util, realBlockInfo) =>
                extensionObject[funcName](args, util, realBlockInfo);

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
            // Desktop fork (roadmap step 4): the arguments this wrapper converts, with the type each is converted to
            // (the same rules as below).
            const argumentTypes = realBlockInfo => {
                const types = [];
                for (const arg in realBlockInfo.arguments) {
                    const expected = normal[realBlockInfo.arguments[arg].type];
                    if (realBlockInfo.arguments[arg].exemptFromNormalization === true) continue;
                    if (expected === 'exception') continue;
                    if (!expected) continue;
                    if (typeof menus[realBlockInfo.arguments[arg].menu]?.variableType === 'string') continue;
                    types.push([arg, expected]);
                }
                return types;
            };
            blockInfo.func = (args, util, visualReport) => {
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
            // Desktop fork (roadmap step 4): what the compiler needs to call a pure block's function without this
            // wrapper (src/compiler/jsgen.js descendPureExtensionBlock): the call itself, the arguments the wrapper
            // would convert, and the conversion. Not for dynamic blocks (their info comes with each call).
            if (!blockInfo.isDynamic) {
                let types = null;
                blockInfo.func.pmDirect = {
                    call: (args, util) => callBlockFunc(args, util, blockInfo),
                    argumentTypes: () => types || (types = argumentTypes(blockInfo)),
                    normalize: (value, type) => (typeof value === type ? value : this._normalize(value, type))
                };
            }
            break;
        }
        }

        return blockInfo;
    }

    // Desktop fork: no extension loads from an address; these give the old gallery address of the
    // loaded gallery extensions (moved into the VM), e.g. for the extension library's "used" marks.
    extensionUrlFromId(extId) {
        if (!this.isExtensionLoaded(extId)) return undefined;
        return movedGalleryAddressOf(extId);
    }
    getExtensionURLs() {
        const extensionURLs = {};
        for (const extensionId of this._loadedExtensions.keys()) {
            const extensionURL = movedGalleryAddressOf(extensionId);
            if (extensionURL) extensionURLs[extensionId] = extensionURL;
        }
        return extensionURLs;
    }

    isExtensionURLLoaded (url) {
        const movedID = movedGalleryIDs.get(normalizeExtensionURL(url));
        return !!movedID && this.isExtensionLoaded(movedID);
    }
}

module.exports = ExtensionManager;

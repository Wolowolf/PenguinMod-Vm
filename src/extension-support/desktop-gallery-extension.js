// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): a gallery extension moved into the VM
// (src/extensions/*_gallery, listed in moved-gallery-extensions.json) keeps the gallery's code,
// wrapped in a function that is given the Scratch object of an unsandboxed extension. This turns
// that function into a built-in extension class. `start(runtime)` runs the code with a new Scratch
// object for the runtime's VM and gives {extensionObject} when the code registered its extension at
// once (most do), and {registered}: a promise for it (some register only after loading their
// bundled libraries, e.g. TurboWarp's Box2D); the extension manager uses it
// (_loadMovedGalleryExtension). Making the class with `new` works only for one that registers at
// once. Like the old address loader, it leaves that Scratch object in global.Scratch (TurboWarp's
// Zip reads globalThis.Scratch while it loads).
const {createUnsandboxedExtensionAPI} = require('./tw-unsandboxed-extension-runner');

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
            const Scratch = createUnsandboxedExtensionAPI(runtime.vm, object => {
                if (started.extensionObject) {
                    throw new Error('A gallery extension moved into the VM may register only one extension');
                }
                started.extensionObject = object;
                Scratch.extensions.register = () => {
                    throw new Error('Too late to register new extensions.');
                };
                resolve(object);
            });
            global.Scratch = Scratch;
            code(Scratch);
        });
        return started;
    };
    return GalleryExtension;
};

module.exports = galleryExtension;

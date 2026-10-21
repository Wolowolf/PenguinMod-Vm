// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): a gallery extension moved into the VM
// (src/extensions/*_gallery, listed in moved-gallery-extensions.json) keeps the gallery's code,
// wrapped in a function that is given the Scratch object of an unsandboxed extension. This turns
// that function into a built-in extension class: making one runs the code with a new Scratch
// object for the runtime's VM (not made global, so it can't mix with an extension loading from an
// address at the same time) and gives back the extension object the code registered.
const {createUnsandboxedExtensionAPI} = require('./tw-unsandboxed-extension-runner');

const galleryExtension = code => function GalleryExtension (runtime) {
    let extensionObject = null;
    const Scratch = createUnsandboxedExtensionAPI(runtime.vm, object => {
        if (extensionObject) throw new Error('A gallery extension moved into the VM may register only one extension');
        extensionObject = object;
    });
    code(Scratch);
    Scratch.extensions.register = () => {
        throw new Error('Too late to register new extensions.');
    };
    if (!extensionObject) throw new Error('The gallery extension did not register an extension');
    return extensionObject;
};

module.exports = galleryExtension;

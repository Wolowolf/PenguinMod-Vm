/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the TurboWarp gallery's pointerlock.js as its build makes it, moved into
// the VM as a built-in extension. The code is the gallery file, except (section 119, step 5): the mouse's pointerLocked hook instead of replacing its postData / getScratchX / getScratchY, and RUNTIME_STEP_END instead of wrapping runtime._step (marked "Desktop fork").
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
module.exports = require('../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Pointerlock
// ID: pointerlock
// Description: Adds blocks for mouse locking. Mouse x & y blocks will report the change since the previous frame while the pointer is locked. Replaces the pointerlock experiment.
// By: GarboMuffin
// License: MIT AND MPL-2.0

/* generated l10n code */Scratch.translate.setup({"de":{"_Pointerlock":"Zeigersperren"},"es":{"_Pointerlock":"Bloque del Ratón","_disabled":"desactivado","_enabled":"activado","_pointer locked?":"¿ratón bloqueado?","_set pointer lock [enabled]":"fijar bloque del ratón [enabled]"},"fi":{"_Pointerlock":"Hiiren osoittimen lukitus","_disabled":"pois päältä","_enabled":"päällä","_pointer locked?":"onko hiiren osoittimen lukitus päällä?","_set pointer lock [enabled]":"kytke hiiren osoittimen lukitus [enabled]"},"it":{"_Pointerlock":"Blocco Puntatore","_disabled":"sblocca","_enabled":"blocca","_pointer locked?":"puntatore bloccato","_set pointer lock [enabled]":"[enabled] puntatore"},"ja":{"_Pointerlock":"ポインターロック","_disabled":"無効","_enabled":"有効","_pointer locked?":"ポインターはロックされている","_set pointer lock [enabled]":"ポインターロックを[enabled]にする"},"ko":{"_Pointerlock":"포인터 잠금","_disabled":"비활성화","_enabled":"활성화","_pointer locked?":"포인터가 잠겼는가?","_set pointer lock [enabled]":"포인터 잠금을 [enabled]하기"},"nb":{"_Pointerlock":"Pointerlås","_disabled":"deaktivert","_enabled":"aktivert","_pointer locked?":"peker låst?","_set pointer lock [enabled]":"sette pekerlås [enabled]"},"nl":{"_Pointerlock":"Muisaanwijzer-vergrendeling","_disabled":"ontgrendel","_enabled":"vergrendel","_pointer locked?":"muisaanwijzer vergrendeld?","_set pointer lock [enabled]":"[enabled] muisaanwijzer"},"ru":{"_disabled":"выключен","_enabled":"включен","_pointer locked?":"указать заблокирован?","_set pointer lock [enabled]":"задать включённость блокировка указателя [enabled]"},"uk":{"_disabled":"розблокувати","_enabled":"заблокувати","_pointer locked?":"вказівник заблоковано?","_set pointer lock [enabled]":"[enabled] вказівник миші"},"zh-cn":{"_Pointerlock":"鼠标锁定","_disabled":"禁用","_enabled":"启用","_pointer locked?":"指针锁定？","_set pointer lock [enabled]":"将指针锁定设为[enabled]"}});/* end generated l10n code */(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("pointerlock extension must be run unsandboxed");
  }

  const vm = Scratch.vm;

  const canvas = vm.runtime.renderer.canvas;
  const mouse = vm.runtime.ioDevices.mouse;
  let isLocked = false;
  let isPointerLockEnabled = false;

  let rect = canvas.getBoundingClientRect();
  window.addEventListener("resize", () => {
    rect = canvas.getBoundingClientRect();
  });

  const postMouseData = (e, isDown) => {
    const { movementX, movementY } = e;
    const { width, height } = rect;
    const x = mouse._clientX + movementX;
    const y = mouse._clientY - movementY;
    mouse._clientX = x;
    mouse._scratchX = mouse.runtime.stageWidth * (x / width - 0.5);
    mouse._clientY = y;
    mouse._scratchY = mouse.runtime.stageHeight * (y / height - 0.5);
    if (typeof isDown === "boolean") {
      const data = {
        button: e.button,
        isDown,
      };
      // Desktop fork (section 119): posted past the mouse's pointerLocked filter
      data.pointerLock = true;
      mouseDevice.postData(data);
    }
  };

  const mouseDevice = vm.runtime.ioDevices.mouse;
  // Desktop fork (section 119): while mouseDevice.pointerLocked is on, the mouse ignores other posted data and
  // does not round its position (so that high framerates don't dramatically limit the project's input precision).
  const setPointerLockEnabled = (enabled) => {
    isPointerLockEnabled = enabled;
    mouseDevice.pointerLocked = enabled;
  };

  document.addEventListener(
    "mousedown",
    (e) => {
      // @ts-expect-error
      if (canvas.contains(e.target)) {
        if (isLocked) {
          postMouseData(e, true);
        } else if (isPointerLockEnabled) {
          canvas.requestPointerLock();
        }
      }
    },
    true
  );
  document.addEventListener(
    "mouseup",
    (e) => {
      if (isLocked) {
        postMouseData(e, false);
        // @ts-expect-error
      } else if (isPointerLockEnabled && canvas.contains(e.target)) {
        canvas.requestPointerLock();
      }
    },
    true
  );
  document.addEventListener(
    "mousemove",
    (e) => {
      if (isLocked) {
        postMouseData(e);
      }
    },
    true
  );

  document.addEventListener("pointerlockchange", () => {
    isLocked = document.pointerLockElement === canvas;
  });
  document.addEventListener("pointerlockerror", (e) => {
    console.error("Pointer lock error", e);
  });

  // Desktop fork (section 119): after each frame
  vm.runtime.on("RUNTIME_STEP_END", () => {
    if (isPointerLockEnabled) {
      const { width, height } = rect;
      mouse._clientX = width / 2;
      mouse._clientY = height / 2;
      mouse._scratchX = 0;
      mouse._scratchY = 0;
    }
  });

  vm.runtime.on("PROJECT_LOADED", () => {
    setPointerLockEnabled(false);
    if (isLocked) {
      document.exitPointerLock();
    }
  });

  class Pointerlock {
    getInfo() {
      return {
        id: "pointerlock",
        name: Scratch.translate("Pointerlock"),
        blocks: [
          {
            opcode: "setLocked",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("set pointer lock [enabled]"),
            arguments: {
              enabled: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "true",
                menu: "enabled",
              },
            },
          },
          {
            opcode: "isLocked",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("pointer locked?"),
          },
        ],
        menus: {
          enabled: {
            acceptReporters: true,
            items: [
              {
                text: Scratch.translate("enabled"),
                value: "true",
              },
              {
                text: Scratch.translate("disabled"),
                value: "false",
              },
            ],
          },
        },
      };
    }

    setLocked(args) {
      setPointerLockEnabled(Scratch.Cast.toBoolean(args.enabled) === true);
      if (!isPointerLockEnabled && isLocked) {
        document.exitPointerLock();
      }
    }

    isLocked() {
      return isLocked;
    }
  }

  Scratch.extensions.register(new Pointerlock());
})(Scratch);
});

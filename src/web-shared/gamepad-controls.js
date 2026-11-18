// Used by the editor (GUI gamepad addon) and by packaged games (packager gamepad addon):
// turns a gamepad into the project's keys, mouse button and a virtual cursor.
import GamepadLib from "./gamepadlib.js";

const GAMEPAD_CONFIG_MAGIC = " // _gamepad_";

const scratchKeyToKey = (key) => {
  switch (key) {
    case "right arrow":
      return "ArrowRight";
    case "up arrow":
      return "ArrowUp";
    case "left arrow":
      return "ArrowLeft";
    case "down arrow":
      return "ArrowDown";
    case "enter":
      return "Enter";
    case "space":
      return " ";
  }
  return key.toLowerCase().charAt(0);
};

const getKeysUsedByProject = (vm) => {
  const allBlocks = [vm.runtime.getTargetForStage(), ...vm.runtime.targets]
    .filter((i) => i.isOriginal)
    .map((i) => i.blocks);
  const result = new Set();
  for (const blocks of allBlocks) {
    for (const block of Object.values(blocks._blocks)) {
      if (block.opcode === "event_whenkeypressed" || block.opcode === "event_whenkeyhit" || block.opcode === "sensing_keyoptions") {
        // For blocks like "key (my variable) pressed?", the sensing_keyoptions still exists but has a null parent.
        if (block.opcode === "sensing_keyoptions" && !block.parent) {
          continue;
        }
        const key = block.fields.KEY_OPTION.value;
        result.add(scratchKeyToKey(key));
      }
    }
  }
  return result;
};

const findOptionsComment = (vm) => {
  const target = vm.runtime.getTargetForStage();
  const comments = target.comments;
  for (const comment of Object.values(comments)) {
    if (comment.text.includes(GAMEPAD_CONFIG_MAGIC)) {
      return comment;
    }
  }
  return null;
};

const parseOptionsComment = (vm, console) => {
  const comment = findOptionsComment(vm);
  if (!comment) {
    return null;
  }
  const lineWithMagic = comment.text.split("\n").find((i) => i.endsWith(GAMEPAD_CONFIG_MAGIC));
  if (!lineWithMagic) {
    console.warn("Gamepad comment does not contain valid line");
    return null;
  }
  const jsonText = lineWithMagic.substr(0, lineWithMagic.length - GAMEPAD_CONFIG_MAGIC.length);
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.buttons) || !Array.isArray(parsed.axes)) {
      throw new Error("Invalid data");
    }
  } catch (e) {
    console.warn("Gamepad comment has invalid JSON", e);
    return null;
  }
  return parsed;
};

// Wait for the project to finish loading. Renderer and scripts will not be fully available until this happens.
const waitForProject = (vm) =>
  new Promise((resolve) => {
    if (vm.editingTarget) return resolve();
    vm.runtime.once("PROJECT_LOADED", resolve);
  });

// The gamepad, using the mapping stored in the project's stage comment or else the keys the project uses.
const createGamepad = (vm, console) => {
  GamepadLib.setConsole(console);
  const gamepad = new GamepadLib();
  gamepad.getUserHints = () => {
    const parsedOptions = parseOptionsComment(vm, console);
    if (parsedOptions) {
      return {
        importedSettings: parsedOptions,
      };
    }
    return {
      usedKeys: getKeysUsedByProject(vm),
    };
  };
  return gamepad;
};

/**
 * Sends the gamepad's keys, mouse button and virtual cursor to the project.
 * @param {object} options
 * @param {GamepadLib} options.gamepad from createGamepad
 * @param {object} options.vm the VM, with its renderer
 * @param {string} options.cursorSrc image of the virtual cursor
 * @param {function} [options.isDisabled] true while nothing should be sent
 * @param {boolean} [options.pointerlock] move a locked pointer instead of the virtual cursor
 * @param {function} [options.getLayersRect] the stage's size on screen (pointerlock only)
 * @returns {HTMLImageElement} the virtual cursor, for the caller to place over the stage
 */
const connectGamepad = ({ gamepad, vm, cursorSrc, isDisabled = () => false, pointerlock = false, getLayersRect }) => {
  const vmStarted = () => vm.runtime._steppingInterval !== null;

  const renderer = vm.runtime.renderer;
  const width = renderer._xRight - renderer._xLeft;
  const height = renderer._yTop - renderer._yBottom;
  const canvas = renderer.canvas;

  const virtualCursorElement = document.createElement("img");
  virtualCursorElement.hidden = true;
  virtualCursorElement.className = "sa-gamepad-cursor";
  virtualCursorElement.src = cursorSrc;

  let hideCursorTimeout;

  const hideRealCursor = () => {
    document.body.classList.add("sa-gamepad-hide-cursor");
  };
  const showRealCursor = () => {
    document.body.classList.remove("sa-gamepad-hide-cursor");
  };
  const virtualCursorSetVisible = (visible) => {
    virtualCursorElement.hidden = !visible;
    clearTimeout(hideCursorTimeout);
    if (visible) {
      hideRealCursor();
      hideCursorTimeout = setTimeout(virtualCursorHide, 8000);
    }
  };
  const virtualCursorHide = () => {
    virtualCursorSetVisible(false);
  };
  const virtualCursorSetDown = (down) => {
    virtualCursorSetVisible(true);
    virtualCursorElement.classList.toggle("sa-gamepad-cursor-down", down);
  };
  const virtualCursorSetPosition = (x, y) => {
    virtualCursorSetVisible(true);
    const CURSOR_SIZE = 6;
    const stageX = width / 2 + x - CURSOR_SIZE / 2;
    const stageY = height / 2 - y - CURSOR_SIZE / 2;
    virtualCursorElement.style.transform = `translate(${stageX}px, ${stageY}px)`;
  };

  document.addEventListener("mousemove", () => {
    virtualCursorSetVisible(false);
    showRealCursor();
  });

  let getCanvasSize;
  // Support modern ResizeObserver and slow getBoundingClientRect version for improved browser support (matters for TurboWarp)
  if (window.ResizeObserver) {
    let canvasWidth = width;
    let canvasHeight = height;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvasWidth = entry.contentRect.width;
        canvasHeight = entry.contentRect.height;
      }
    });
    resizeObserver.observe(canvas);
    getCanvasSize = () => [canvasWidth, canvasHeight];
  } else {
    getCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      return [rect.width, rect.height];
    };
  }

  // Both in Scratch space
  let virtualX = 0;
  let virtualY = 0;
  const postMouseData = (data) => {
    if (isDisabled() || !vmStarted()) return;
    const [rectWidth, rectHeight] = getCanvasSize();
    vm.postIOData("mouse", {
      ...data,
      canvasWidth: rectWidth,
      canvasHeight: rectHeight,
      x: (virtualX + width / 2) * (rectWidth / width),
      y: (height / 2 - virtualY) * (rectHeight / height),
    });
  };
  const postKeyboardData = (key, isDown) => {
    if (isDisabled() || !vmStarted()) return;
    vm.postIOData("keyboard", {
      key,
      isDown,
    });
  };
  const handleGamepadButtonDown = (e) => postKeyboardData(e.detail, true);
  const handleGamepadButtonUp = (e) => postKeyboardData(e.detail, false);
  const handleGamepadMouseDown = (e) => {
    virtualCursorSetDown(true);
    postMouseData({
      isDown: true,
      button: e.detail,
    });
  };
  const handleGamepadMouseUp = (e) => {
    virtualCursorSetDown(false);
    postMouseData({
      isDown: false,
      button: e.detail,
    });
  };
  const handleGamepadMouseMove = (e) => {
    const { x, y } = e.detail;
    if (pointerlock) {
      const deltaX = x - virtualX;
      const deltaY = -(y - virtualY);
      virtualX = x;
      virtualY = y;
      // Coordinates that pointerlock accepts are in "screen space" but virtual cursor is in "stage space"
      const SPEED_MULTIPLIER = 4.0;
      const layersRect = getLayersRect();
      const zoomMultiplierX = layersRect.width / vm.runtime.stageWidth;
      const zoomMultiplierY = layersRect.height / vm.runtime.stageHeight;
      // This is defined in pointerlock addon
      vm.pointerLockMove(deltaX * SPEED_MULTIPLIER * zoomMultiplierX, deltaY * SPEED_MULTIPLIER * zoomMultiplierY);
    } else {
      virtualX = x;
      virtualY = y;
      virtualCursorSetPosition(virtualX, virtualY);
      postMouseData({});
    }
  };

  if (!pointerlock) {
    gamepad.virtualCursor.maxX = renderer._xRight;
    gamepad.virtualCursor.minX = renderer._xLeft;
    gamepad.virtualCursor.maxY = renderer._yTop;
    gamepad.virtualCursor.minY = renderer._yBottom;
  }
  gamepad.addEventListener("keydown", handleGamepadButtonDown);
  gamepad.addEventListener("keyup", handleGamepadButtonUp);
  gamepad.addEventListener("mousedown", handleGamepadMouseDown);
  gamepad.addEventListener("mouseup", handleGamepadMouseUp);
  gamepad.addEventListener("mousemove", handleGamepadMouseMove);

  return virtualCursorElement;
};

export { GAMEPAD_CONFIG_MAGIC, waitForProject, findOptionsComment, createGamepad, connectGamepad };

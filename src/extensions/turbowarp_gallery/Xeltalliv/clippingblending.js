/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the TurboWarp gallery's Xeltalliv/clippingblending.js as its build makes it, moved into
// the VM as a built-in extension. The code is the gallery file, except (section 120, step 5): clip boxes and blend modes are built into the renderer
// (scratch-render DrawModes.js, Drawable updateClipBox / updateBlendMode, the pen skin's setDrawModes) and the pen extension, so this file no longer
// replaces renderer._drawThese, gl.bindFramebuffer, Drawable.prototype.getUniforms, the renderer's createPenSkin, the pen's _onTargetMoved / _penDown,
// the pen skin's _flushLines or RenderedTarget onStopAll / makeClone: it uses PROJECT_STOP_ALL and runtime.pmCloneCreatedHooks (marked "Desktop fork").
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Clipping & Blending
// ID: xeltallivclipblend
// Description: Clipping outside of a specified rectangular area and different color blending modes.
// By: Vadik1 <https://scratch.mit.edu/users/Vadik1/>
// License: MIT

/* generated l10n code */Scratch.translate.setup({"de":{"_Clipping & Blending":"Ränder verändern & Farben mischen","_height":"Höhe","_width":"Weite"},"es":{"_default":"por defecto"},"fi":{"_Clipping & Blending":"Leikkaaminen ja sekoitus","_Stage selected: no blocks":"Esiintymislava valittu: ei lohkoja","_additive":"additiivista","_additive with alpha":"alfa-additiivista","_blending":"sekoitus","_clear clipping box":"poista leikkauslaatikko","_clipping box [PROP]":"leikkauslaatikon [PROP]","_default":"oletus","_default behind":"tausta","_erase":"pyyhintä","_height":"korkeus","_invert":"käänteis","_mask":"maski","_max x":"suurin x-sijainti","_max y":"suurin y-sijainti","_min x":"pienin x-sijainti","_min y":"pienin y-sijainti","_multiply":"monistus","_off":"pois päältä","_on":"päälle","_set clipping box x1:[X1] y1:[Y1] x2:[X2] y2:[Y2]":"aseta leikkauslaatikoksi x1: [X1] y1: [Y1] x2: [X2] y2: [Y2]","_subtract":"vähennys","_subtract with alpha":"alfavähennys","_use [BLENDMODE] blending":"käytä [BLENDMODE] sekoitusta","_width":"leveys"},"fr":{"_height":"hauteur","_width":"largeur"},"it":{"_Clipping & Blending":"Ritaglio e Fusione","_Stage selected: no blocks":"Stage selezionato: nessun blocco","_additive":"additiva","_additive with alpha":"additiva con alfa","_blending":"fusione","_clear clipping box":"cancella area ritaglio","_clipping box [PROP]":"[PROP] area ritaglio","_default":"predefinito","_default behind":"predefinito dietro","_erase":"cancellazione","_height":"altezza","_invert":"colori invertiti","_mask":"maschera","_max x":"x man","_max y":"y max","_min x":"x min","_min y":"y min","_multiply":"moltiplicativa","_off":"disabilita","_on":"abilita","_set clipping box x1:[X1] y1:[Y1] x2:[X2] y2:[Y2]":"usa area ritaglio x1:[X1] y1:[Y1] x2:[X2] y2:[Y2]","_subtract":"sottrattiva","_subtract with alpha":"sottrattiva con alfa","_use [BLENDMODE] blending":"usa fusione [BLENDMODE]","_width":"larghezza"},"ja":{"_Stage selected: no blocks":"ステージ選択: ブロックがありません。","_additive":"加算","_blending":"ブレンディング","_clear clipping box":"クリッピングボックスをクリア","_clipping box [PROP]":"クリッピングボックスの[PROP]","_default":"デフォルト","_height":"高さ","_invert":"色の反転","_mask":"マスク","_max x":"最大のx","_max y":"最大のy","_min x":"最小のx","_min y":"最小のy","_multiply":"乗算","_off":"オフ","_on":"オン","_set clipping box x1:[X1] y1:[Y1] x2:[X2] y2:[Y2]":"クリッピングボックスをx1:[X1]y1:[Y1]x2:[X2]y2:[Y2]にする","_subtract":"減算","_use [BLENDMODE] blending":"[BLENDMODE]ブレンディングを使う","_width":"横幅"},"ko":{"_Clipping & Blending":"클리핑 및 블렌딩","_additive":"더하기","_blending":"블렌딩","_clear clipping box":"클리핑 영역 초기화","_clipping box [PROP]":"클리핑 영역 [PROP]","_default":"기본","_height":"높이","_invert":"반전","_max x":"최대 x","_max y":"최대 y","_min x":"최소 x","_min y":"최소 y","_multiply":"곱하기","_off":"끄기","_on":"켜기","_set clipping box x1:[X1] y1:[Y1] x2:[X2] y2:[Y2]":"클리핑 영역을 x1:[X1] y1:[Y1] x2:[X2] y2:[Y2] (으)로 정하기","_subtract":"빼기","_use [BLENDMODE] blending":"[BLENDMODE] 블렌딩하기","_width":"넓이"},"nb":{"_Clipping & Blending":"Klipping og blanding","_height":"høyde","_off":"av","_on":"på","_width":"bredde"},"nl":{"_Clipping & Blending":"Knippen & mengen","_default":"standaard","_height":"hoogte","_invert":"omgekeerd","_off":"uit","_on":"aan","_width":"breedte"},"pl":{"_height":"wysokość","_width":"szerokość"},"ru":{"_Clipping & Blending":"Обрезка и Смешивание","_Stage selected: no blocks":"Выбрана сцена: нет блоков","_additive":"прибавление","_additive with alpha":"дополнение с прозрачностью","_blending":"смешивание","_clear clipping box":"отчистить рамку отсечения","_clipping box [PROP]":"[PROP] рамки отсечения","_default":"по умолчанию","_default behind":"обычное позади","_erase":"стереть","_height":"высота","_invert":"инверт","_mask":"маска","_max x":"максимальный x","_max y":"максимальный y","_min x":"минимальный x","_min y":"минимальный y","_multiply":"умножение","_off":"выключить","_on":"включить","_set clipping box x1:[X1] y1:[Y1] x2:[X2] y2:[Y2]":"задать рамку отсечения x1:[X1] y1:[Y1] x2:[X2] y2:[Y2]","_subtract":"вычитание","_subtract with alpha":"вычитание с прозрачностью","_use [BLENDMODE] blending":"использовать режим смешивания [BLENDMODE]","_width":"ширина"},"tr":{"_Clipping & Blending":"Kırpma ve Karıştırma"},"uk":{"_Clipping & Blending":"Обрізання та Змішування","_height":"висота","_off":"вимкнути","_on":"увімкнути","_width":"ширина"},"zh-cn":{"_Clipping & Blending":"裁剪与颜色混合","_Stage selected: no blocks":"选中舞台时无可用积木","_additive":"加法","_additive with alpha":"带有透明度的加法","_blending":"混合模式","_clear clipping box":"清除裁剪框","_clipping box [PROP]":"裁剪框[PROP]","_default":"默认","_default behind":"默认后方","_erase":"擦除","_height":"高度","_invert":"反色","_mask":"遮罩","_max x":"右x","_max y":"上y","_min x":"左x","_min y":"下y","_multiply":"正片叠底","_off":"关闭","_on":"打开","_set clipping box x1:[X1] y1:[Y1] x2:[X2] y2:[Y2]":"将裁剪框设为x1：[X1] y1：[Y1] x2：[X2] y2：[Y2]","_subtract":"减法","_subtract with alpha":"带有透明度的减法","_use [BLENDMODE] blending":"使用[BLENDMODE]混合模式","_width":"宽度"}});/* end generated l10n code */(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("Clipping & Blending extension must be run unsandboxed");
  }

  // Simplified remake of an icon by True-Fantom
  const icon =
    "data:image/svg+xml," +
    encodeURIComponent(`
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0,0,200,200">
      <circle r="100" cx="100" cy="100" fill="#9966ff"/>
      <path d="M122,61v-4a12,12 0,0,0 -12,-12h-4m-17,0h-16m-17,0h-4a12,12 0,0,0 -12,12v4m0,17v16m0,17v4a12,12 0,0,0 12,12h4" stroke="#ffffff" stroke-width="11" stroke-linecap="round" fill="none"/>
      <g fill="#ffffff" stroke="#9966ff" stroke-width="7.5">
        <circle r="32" cx="118" cy="102"/>
        <circle r="32" cx="96" cy="137"/>
        <circle r="32" cx="140" cy="137"/>
      </g>
    </svg>`);

  // Desktop fork (section 120): the renderer draws clip boxes and blend modes itself (scratch-render DrawModes.js),
  // and the pen extension passes each sprite's target.clipbox / target.blendMode to the pen layer.
  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const renderer = vm.renderer;

  // Reset on stop & clones inherit effects
  runtime.on("PROJECT_STOP_ALL", () => {
    for (const target of runtime.targets) {
      if (target.clipbox || target.blendMode) {
        target.clipbox = null;
        target.blendMode = null;
        renderer.updateDrawableClipBox(target.drawableID, null);
        renderer.updateDrawableBlendMode(target.drawableID, null);
      }
    }
  });
  runtime.pmCloneCreatedHooks.push((newTarget, original) => {
    if (original.clipbox || original.blendMode) {
      newTarget.clipbox = original.clipbox
        ? Object.assign({}, original.clipbox)
        : null;
      newTarget.blendMode = original.blendMode;
      renderer.updateDrawableClipBox(newTarget.drawableID, original.clipbox);
      renderer.updateDrawableBlendMode(newTarget.drawableID, original.blendMode);
    }
  });

  class Extension {
    getInfo() {
      return {
        id: "xeltallivclipblend",
        name: Scratch.translate("Clipping & Blending"),
        color1: "#9966FF",
        color2: "#855CD6",
        color3: "#774DCB",
        menuIconURI: icon,
        blocks: [
          {
            blockType: Scratch.BlockType.LABEL,
            text: Scratch.translate("Stage selected: no blocks"),
            filter: [Scratch.TargetType.STAGE],
          },
          {
            opcode: "setClipbox",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate(
              "set clipping box x1:[X1] y1:[Y1] x2:[X2] y2:[Y2]"
            ),
            arguments: {
              X1: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "0",
              },
              Y1: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "0",
              },
              X2: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "100",
              },
              Y2: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "100",
              },
            },
            filter: [Scratch.TargetType.SPRITE],
            extensions: ["colours_looks"],
          },
          {
            opcode: "clearClipbox",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("clear clipping box"),
            filter: [Scratch.TargetType.SPRITE],
            extensions: ["colours_looks"],
          },
          {
            opcode: "getClipbox",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("clipping box [PROP]"),
            arguments: {
              PROP: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "width",
                menu: "props",
              },
            },
            filter: [Scratch.TargetType.SPRITE],
            extensions: ["colours_looks"],
          },
          "---",
          {
            opcode: "setBlend2",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("use [BLENDMODE] blending"),
            arguments: {
              BLENDMODE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "default",
                menu: "blends2",
              },
            },
            filter: [Scratch.TargetType.SPRITE],
            extensions: ["colours_looks"],
          },
          {
            opcode: "getBlend",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("blending"),
            filter: [Scratch.TargetType.SPRITE],
            disableMonitor: true,
            extensions: ["colours_looks"],
          },
          "---",
        ],
        menus: {
          states: {
            acceptReporters: true,
            items: [
              { text: Scratch.translate("on"), value: "on" },
              { text: Scratch.translate("off"), value: "off" },
            ],
          },
          blends: {
            acceptReporters: true,
            items: [
              { text: Scratch.translate("default"), value: "default" },
              { text: Scratch.translate("additive"), value: "additive" }, // -> additive legacy
              { text: Scratch.translate("subtract"), value: "subtract" }, // -> subtract legacy
              { text: Scratch.translate("multiply"), value: "multiply" },
              { text: Scratch.translate("invert"), value: "invert" }, // -> invert legacy
            ],
          },
          blends2: {
            acceptReporters: true,
            items: [
              { text: Scratch.translate("default"), value: "default" },
              {
                text: Scratch.translate("default behind"),
                value: "default behind",
              },
              { text: Scratch.translate("additive"), value: "additive" },
              {
                text: Scratch.translate("additive with alpha"),
                value: "additive with alpha",
              },
              { text: Scratch.translate("subtract"), value: "subtract" },
              {
                text: Scratch.translate("subtract with alpha"),
                value: "subtract with alpha",
              },
              { text: Scratch.translate("multiply"), value: "multiply" },
              { text: Scratch.translate("invert"), value: "invert" },
              { text: Scratch.translate("mask"), value: "mask" },
              { text: Scratch.translate("erase"), value: "erase" },
            ],
          },
          props: {
            acceptReporters: true,
            items: [
              { text: Scratch.translate("width"), value: "width" },
              { text: Scratch.translate("height"), value: "height" },
              { text: Scratch.translate("min x"), value: "min x" },
              { text: Scratch.translate("min y"), value: "min y" },
              { text: Scratch.translate("max x"), value: "max x" },
              { text: Scratch.translate("max y"), value: "max y" },
            ],
          },
        },
      };
    }

    setClipbox({ X1, Y1, X2, Y2 }, { target }) {
      if (target.isStage) return;
      const newClipbox = {
        x_min: Math.min(X1, X2),
        y_min: Math.min(Y1, Y2),
        x_max: Math.max(X1, X2),
        y_max: Math.max(Y1, Y2),
      };
      target.clipbox = newClipbox;
      renderer.updateDrawableClipBox.call(
        renderer,
        target.drawableID,
        newClipbox
      );
      if (target.visible) {
        renderer.dirty = true;
        target.emitVisualChange();
        target.runtime.requestRedraw();
        target.runtime.requestTargetsUpdate(target);
      }
    }

    clearClipbox(args, { target }) {
      if (target.isStage) return;
      target.clipbox = null;
      renderer.updateDrawableClipBox.call(renderer, target.drawableID, null);
      if (target.visible) {
        renderer.dirty = true;
        target.emitVisualChange();
        target.runtime.requestRedraw();
        target.runtime.requestTargetsUpdate(target);
      }
    }

    getClipbox({ PROP }, { target }) {
      const clipbox = target.clipbox;
      if (!clipbox) return "";
      switch (PROP) {
        case "width":
          return clipbox.x_max - clipbox.x_min;
        case "height":
          return clipbox.y_max - clipbox.y_min;
        case "min x":
          return clipbox.x_min;
        case "min y":
          return clipbox.y_min;
        case "max x":
          return clipbox.x_max;
        case "max y":
          return clipbox.y_max;
        default:
          return "";
      }
    }


    setBlend2({ BLENDMODE }, { target }) {
      switch (BLENDMODE) {
        case "default":
        case "default behind":
        case "additive":
        case "additive with alpha":
        case "subtract":
        case "subtract with alpha":
        case "multiply":
        case "invert":
        case "mask":
        case "erase":
          this._setBlend(BLENDMODE, target);
          return;
        default:
          return;
      }
    }

    _setBlend(newValue, target) {
      if (target.isStage) return;
      target.blendMode = newValue;
      renderer.updateDrawableBlendMode.call(
        renderer,
        target.drawableID,
        newValue
      );
      if (target.visible) {
        renderer.dirty = true;
        target.emitVisualChange();
        target.runtime.requestRedraw();
        target.runtime.requestTargetsUpdate(target);
      }
    }

    getBlend(args, { target }) {
      switch (target.blendMode) {
        case "additive legacy":
          return "additive";
        case "subtract legacy":
          return "subtract";
        case "invert legacy":
          return "invert";
        default:
          return target.blendMode ?? "default";
      }
    }


  }

  Scratch.extensions.register(new Extension());
})(Scratch);
});

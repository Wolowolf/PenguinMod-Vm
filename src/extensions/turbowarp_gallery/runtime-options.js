/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the TurboWarp gallery's runtime-options.js as its build makes it, moved into
// the VM as a built-in extension. The code is the gallery file, except (section 270): only Turbo mode can be switched (interpolation, fencing, misc limits and high quality pen are fixed in this app), no clone limit or username blocks (marked "Desktop fork").
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
module.exports = require('../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Runtime Options
// ID: runtimeoptions
// Description: Get and modify turbo mode, framerate, interpolation, clone limit, stage size, and more.
// By: GarboMuffin
// License: MIT AND MPL-2.0

/* generated l10n code */Scratch.translate.setup({"ca":{"_Runtime Options":"Opcions d'execució"},"cs":{"_Runtime Options":"Nastavení běhu"},"de":{"_Runtime Options":"Laufzeit-Optionen","_height":"Höhe","_width":"Weite"},"es":{"_Runtime Options":"Opciones de Runtime"},"fi":{"_Infinity":"ääretön","_Runtime Options":"Ajonaikaiset asetukset","_[thing] enabled?":"onko [thing] käytössä?","_clone limit":"klooniraja","_default ({n})":"oletus ({n})","_disabled":"pois päältä","_enabled":"päällä","_framerate":"kuvataajuus","_framerate limit":"kuvataajuus","_height":"korkeus","_high quality pen":"korkealaatuinen kynä","_interpolation":"interpolaatio","_remove fencing":"aitauksen poistaminen","_remove misc limits":"erilaisten rajoitusten poistaminen","_set [thing] to [enabled]":"kytke [thing] [enabled]","_set clone limit to [limit]":"aseta kloonirajaksi [limit]","_set framerate limit to [fps]":"aseta kuvataajuudeksi [fps]","_set stage size width: [width] height: [height]":"aseta esiintymislavan leveydeksi [width] ja korkeudeksi [height]","_set username to [username]":"aseta käyttäjänimeksi [username]","_stage [dimension]":"esiintymislavan [dimension]","_stage size":"esiintymislavan koko","_turbo mode":"turbotila","_username":"käyttäjänimi","_when [WHAT] changed":"kun [WHAT] muuttuu","_width":"leveys"},"fr":{"_Runtime Options":"Options d'exécution","_height":"hauteur","_width":"largeur"},"hu":{"_Runtime Options":"Lefutási Opciók"},"it":{"_Infinity":"infinito","_Runtime Options":"Opzioni Esecuzione","_[thing] enabled?":"[thing] abilitato","_clone limit":"limite cloni","_default ({n})":"predefinito({n})","_disabled":"sblocca","_enabled":"blocca","_framerate":"frequenza","_framerate limit":"limite framerate","_height":"altezza","_high quality pen":"penna alta qualità","_interpolation":"interpolazione","_remove fencing":"rimuovi i limiti dallo Stage","_remove misc limits":"rimuovi limiti","_set [thing] to [enabled]":"imposta [thing] a [enabled]","_set clone limit to [limit]":"imposta limite cloni a [limit]","_set framerate limit to [fps]":"imposta limite framerate a [fps]","_set stage size width: [width] height: [height]":"imposta dimensioni Stage larghezza: [width]altezza: [height]","_set username to [username]":"imposta username a [username]","_stage [dimension]":"[dimension] dello Stage","_stage size":"dimensioni Stage","_turbo mode":"modalità turbo","_when [WHAT] changed":"quando [WHAT] cambia","_width":"larghezza"},"ja":{"_Infinity":"無限","_Runtime Options":"ランタイムのオプション","_[thing] enabled?":"[thing]が有効","_clone limit":"クローンの制限","_default ({n})":"デフォルト({n})","_disabled":"無効","_enabled":"有効","_framerate":"フレームレート","_framerate limit":"フレームレートの制限","_height":"高さ","_high quality pen":"ペンできれいに描画する","_interpolation":"補完機能","_remove fencing":"動く範囲と大きさの制限を解除する","_remove misc limits":"その他の制限を解除する","_set [thing] to [enabled]":"[thing]を[enabled]にする","_set clone limit to [limit]":"クローンの制限を[limit]にする","_set framerate limit to [fps]":"フレームレートの制限を[fps]にする","_set stage size width: [width] height: [height]":"ステージの横幅を[width]高さを[height]にする","_set username to [username]":"ユーザー名を[username]にする","_stage [dimension]":"ステージの[dimension]","_stage size":"ステージのサイズ","_turbo mode":"ターボモード","_username":"ユーザー名","_when [WHAT] changed":"[WHAT]が変更されたとき","_width":"横幅"},"ja-hira":{"_Runtime Options":"ランタイムのオプション"},"ko":{"_Infinity":"무제한","_Runtime Options":"실행 설정","_[thing] enabled?":"[thing]이(가) 활성화인가?","_clone limit":"복제본 개수 제한","_default ({n})":"기본 ({n})","_disabled":"비활성화","_enabled":"활성화","_framerate":"프레임률","_framerate limit":"프레임률 제한","_height":"높이","_high quality pen":"고품질 펜","_interpolation":"보간법","_remove fencing":"무대 밖 동작","_remove misc limits":"기타 제한 비활성화","_set [thing] to [enabled]":"[thing]을(를) [enabled]하기","_set clone limit to [limit]":"복제본 개수 제한을 [limit](으)로 정하기","_set framerate limit to [fps]":"프레임률 제한을 [fps](으)로 정하기","_set stage size width: [width] height: [height]":"무대 크기를 넓이:[width] 높이:[height] (으)로 정하기","_set username to [username]":"사용자 이름을 [username](으)로 정하기","_stage [dimension]":"무대 [dimension]","_stage size":"무대 크기","_turbo mode":"터보 모드","_username":"사용자 이름","_when [WHAT] changed":"[WHAT]이(가) 변경되었을 때","_width":"넓이"},"lt":{"_Runtime Options":"Paleidimo laiko parinktys"},"nb":{"_Infinity":"Uendelighet","_Runtime Options":"Kjøretidsalternativer","_[thing] enabled?":"[thing] aktivert?","_clone limit":"klon grense","_default ({n})":"standard ({n})","_disabled":"deaktivert","_enabled":"aktivert","_framerate":"Bildetakt","_framerate limit":"grense for bildefrekvens","_height":"høyde","_high quality pen":"Høy kvalitet penn","_interpolation":"interpolasjon","_remove fencing":"Fjern gjerde","_remove misc limits":"fjern diverse begrensninger","_set [thing] to [enabled]":"sett [thing] til [enabled]","_set clone limit to [limit]":"sett klon-grensen til [limit]","_set framerate limit to [fps]":"begrens bildefrekvensen til [fps]","_set stage size width: [width] height: [height]":"sett scenestørrelse bredde: [width] høyde: [height]","_set username to [username]":"sett brukernavn til [username]","_stage [dimension]":"scene [dimension]","_stage size":"scenestørrelse","_turbo mode":"turbo modus","_username":"brukernavn","_when [WHAT] changed":"når [WHAT] endret seg","_width":"bredde"},"nl":{"_Infinity":"oneindig","_Runtime Options":"Looptijdopties","_[thing] enabled?":"[thing] ingeschakeld?","_clone limit":"kloonlimiet","_default ({n})":"standaard ({n})","_disabled":"uit","_enabled":"in","_framerate limit":"framerate-limiet","_height":"hoogte","_high quality pen":"pen met hoge kwaliteit","_interpolation":"interpolatie","_remove fencing":"waarde-limieten weghalen","_remove misc limits":"diverse limieten weghalen","_set [thing] to [enabled]":"schakel [thing] [enabled]","_set clone limit to [limit]":"maak kloonlimiet [limit]","_set framerate limit to [fps]":"maak framerate-limiet [fps]","_set stage size width: [width] height: [height]":"maak speelveldbreedte: [width] en -hoogte: [height]","_set username to [username]":"maak gebruikersnaam [username]","_stage [dimension]":"[dimension] van speelveld","_stage size":"speelveldgrootte","_turbo mode":"turbomodus","_username":"gebruikersnaam","_when [WHAT] changed":"wanneer [WHAT] verandert","_width":"breedte"},"pl":{"_Runtime Options":"Opcje Uruchamiania","_height":"wysokość","_set clone limit to [limit]":"ustaw limit klonów na [limit]","_turbo mode":"tryb turbo","_username":"nazwa użytkownika","_width":"szerokość"},"pt":{"_Runtime Options":"Opções de Execução"},"pt-br":{"_Runtime Options":"Opções de Execução"},"ru":{"_Infinity":"Бесконечно","_Runtime Options":"Опции Выполнения","_[thing] enabled?":"[thing] включен?","_clone limit":"лимит клонов","_default ({n})":"по умолчанию ({n})","_disabled":"выключен","_enabled":"включен","_framerate":"частота кадров","_framerate limit":"лимит частоты кадров","_height":"высота","_high quality pen":"перо в высоком качестве","_interpolation":"интерполяция","_remove fencing":"убрать рамку","_remove misc limits":"убрать разные ограничения","_set [thing] to [enabled]":"задать [thing] в [enabled]","_set clone limit to [limit]":"задать лимит клонов в [limit]","_set framerate limit to [fps]":"задать лимит частоты кадров в [fps]","_set stage size width: [width] height: [height]":"задать ширину: [width] высоту: [height] сцены","_set username to [username]":"задать имя пользователя как [username]","_stage [dimension]":"[dimension] сцены","_stage size":"размер сцены","_turbo mode":"турбо режим","_username":"имя пользователя","_when [WHAT] changed":"когда [WHAT] изменён","_width":"ширина"},"sl":{"_Runtime Options":"Možnosti izvajanja"},"sv":{"_Runtime Options":"Körtidsalternativ"},"tr":{"_Runtime Options":"Çalışma Zamanı Seçenekleri"},"uk":{"_Infinity":"без меж","_Runtime Options":"Параметри виконання","_[thing] enabled?":"[thing] увімкнено?","_clone limit":"макс. кількість клонів","_default ({n})":"за умовчанням ({n})","_disabled":"вимкнути","_enabled":"увімкнути","_framerate":"частота кадрів","_framerate limit":"макс. частота кадрів","_height":"висота","_high quality pen":"перо високої якості","_interpolation":"інтерполяція","_remove fencing":"прибрати рамку","_remove misc limits":"прибрати різні обмеження","_set [thing] to [enabled]":"[enabled] налаштування [thing]","_set clone limit to [limit]":"встановити макс. кількість клонів до [limit]","_set framerate limit to [fps]":"встановити макс. частоту кадрів [fps]","_set stage size width: [width] height: [height]":"встановити розмір сцени: ширина: [width] висота: [height]","_set username to [username]":"встановити ім'я користувача [username]","_stage [dimension]":"[dimension] сцени","_stage size":"розмір сцени","_turbo mode":"режим турбо","_username":"ім'я користувача","_when [WHAT] changed":"коли [WHAT] змінено","_width":"ширина"},"zh-cn":{"_Infinity":"无限","_Runtime Options":"运行选项","_[thing] enabled?":"启用了[thing]？","_clone limit":"克隆限制","_default ({n})":"默认值({n})","_disabled":"禁用","_enabled":"启用","_framerate":"帧率","_framerate limit":"FPS上限","_height":"高度","_high quality pen":"高清画笔","_interpolation":"补帧","_remove fencing":"允许角色移出舞台","_remove misc limits":"取消音效范围与画笔大小限制","_set [thing] to [enabled]":"将[thing]设为[enabled]","_set clone limit to [limit]":"将克隆体限制设为[limit]","_set framerate limit to [fps]":"将FPS上限设为[fps]","_set stage size width: [width] height: [height]":"将舞台大小设为宽[width] 高[height]","_set username to [username]":"将用户名设为[username]","_stage [dimension]":"舞台的[dimension]","_stage size":"舞台尺寸","_turbo mode":"加速模式","_username":"用户名称","_when [WHAT] changed":"当[WHAT]被修改时","_width":"宽度"},"zh-tw":{"_Runtime Options":"運行選項"}});/* end generated l10n code */(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("Runtime Options extension needs to be run unsandboxed");
  }

  const TURBO_MODE = "turbo mode";
  const FRAMERATE = "framerate";
  const STAGE_SIZE = "stage size";

  /** @param {string} what */
  const emitChanged = (what) =>
    Scratch.vm.runtime.startHats("runtimeoptions_whenChange", {
      WHAT: what,
    });

  Scratch.vm.on("TURBO_MODE_OFF", () => emitChanged(TURBO_MODE));
  Scratch.vm.on("TURBO_MODE_ON", () => emitChanged(TURBO_MODE));
  Scratch.vm.on("FRAMERATE_CHANGED", () => emitChanged(FRAMERATE));
  Scratch.vm.on("STAGE_SIZE_CHANGED", () => emitChanged(STAGE_SIZE));

  class RuntimeOptions {
    getInfo() {
      return {
        id: "runtimeoptions",
        name: Scratch.translate("Runtime Options"),
        color1: "#8c9abf",
        color2: "#7d8aab",
        color3: "#6f7b99",
        blocks: [
          {
            opcode: "getEnabled",
            // Desktop fork (section 270): only Turbo mode (the other switches are always on in this app)
            text: Scratch.translate("turbo mode on?"),
            blockType: Scratch.BlockType.BOOLEAN,
          },
          {
            opcode: "setEnabled",
            text: Scratch.translate("set turbo mode to [enabled]"),
            blockType: Scratch.BlockType.COMMAND,
            arguments: {
              enabled: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "true",
                menu: "enabled",
              },
            },
          },

          "---",

          {
            opcode: "getFramerate",
            text: Scratch.translate("framerate limit"),
            blockType: Scratch.BlockType.REPORTER,
          },
          {
            opcode: "setFramerate",
            text: Scratch.translate("set framerate limit to [fps]"),
            blockType: Scratch.BlockType.COMMAND,
            arguments: {
              fps: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "30",
              },
            },
          },

          "---",

          {
            opcode: "getDimension",
            text: Scratch.translate({
              default: "stage [dimension]",
              description: "[dimension] is a dropdown of width and height",
            }),
            blockType: Scratch.BlockType.REPORTER,
            arguments: {
              dimension: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "width",
                menu: "dimension",
              },
            },
          },
          {
            opcode: "setDimensions",
            text: Scratch.translate(
              "set stage size width: [width] height: [height]"
            ),
            blockType: Scratch.BlockType.COMMAND,
            arguments: {
              width: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "480",
              },
              height: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "360",
              },
            },
          },

          "---",

          {
            opcode: "whenChange",
            blockType: Scratch.BlockType.EVENT,
            text: Scratch.translate("when [WHAT] changed"),
            isEdgeActivated: false,
            arguments: {
              WHAT: { type: Scratch.ArgumentType.STRING, menu: "changeable" },
            },
          },
        ],
        menus: {
          changeable: {
            acceptReporters: false,
            items: [
              {
                text: Scratch.translate("turbo mode"),
                value: TURBO_MODE,
              },
              {
                text: Scratch.translate("framerate"),
                value: FRAMERATE,
              },
              {
                text: Scratch.translate("stage size"),
                value: STAGE_SIZE,
              },
            ],
          },

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

          dimension: {
            acceptReporters: false /* Desktop fork (section 265): only its own items work */,
            items: [
              {
                text: Scratch.translate("width"),
                value: "width",
              },
              {
                text: Scratch.translate("height"),
                value: "height",
              },
            ],
          },
        },
      };
    }

    getEnabled() {
      return Scratch.vm.runtime.turboMode;
    }

    setEnabled({ enabled }) {
      Scratch.vm.setTurboMode(Scratch.Cast.toBoolean(enabled));
    }

    getFramerate() {
      return Scratch.vm.runtime.frameLoop.framerate;
    }

    setFramerate({ fps }) {
      fps = Scratch.Cast.toNumber(fps);
      Scratch.vm.setFramerate(fps);
    }


    getDimension({ dimension }) {
      if (dimension === "width") {
        return Scratch.vm.runtime.stageWidth;
      } else if (dimension === "height") {
        return Scratch.vm.runtime.stageHeight;
      }
      return 0;
    }

    setDimensions({ width, height }) {
      width = Scratch.Cast.toNumber(width);
      height = Scratch.Cast.toNumber(height);
      Scratch.vm.setStageSize(width, height);
    }


  }

  Scratch.extensions.register(new RuntimeOptions());
})(Scratch);
});

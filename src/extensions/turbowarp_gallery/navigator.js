/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the TurboWarp gallery's navigator.js as its build makes it, moved into
// the VM as a built-in extension. The code is the gallery file, changed where marked "Desktop fork (extension merges)": Battery and
// Wake Lock moved in (Battery's hats now start as navigatorinfo_…; Wake Lock's page event listener goes through
// Scratch.vm.runtime.pmPage, section 159).
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
module.exports = require('../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Navigator
// ID: navigatorinfo
// Description: Details about the user's browser and operating system.
// By: GarboMuffin
// By: D-ScratchNinja <https://scratch.mit.edu/users/D-ScratchNinja/>
// Context: "Navigator" refers to someone's browser
// License: MIT AND MPL-2.0

/* generated l10n code */Scratch.translate.setup({"fi":{"_dark":"tummaa","_device memory in GB":"laitteen muisti GB:nä","_light":"vaaleaa","_user prefers [THEME] color scheme?":"käyttääkö käyttäjä [THEME] väriteemaa?","_user prefers more contrast?":"käyttääkö käyttäjä korkeaa kontrastia?","_user prefers reduced motion?":"käyttääkö käyttäjä vähennettyä liikettä?"},"it":{"_dark":"scuro","_device memory in GB":"memoria dispositivo in GB","_light":"chiaro","_user prefers [THEME] color scheme?":"l'utente preferisce il tema [THEME]","_user prefers more contrast?":"l'utente preferisce contrasto alto","_user prefers reduced motion?":"l'utente preferisce movimento ridotto"},"ja":{"_dark":"ダーク","_device memory in GB":"デバイスメモリー(GB)","_light":"ライト","_user prefers [THEME] color scheme?":"ユーザーが[THEME]配色を好んでいる","_user prefers more contrast?":"ユーザーがコントラストを好む","_user prefers reduced motion?":"ユーザーが動きを減らしたい"},"ko":{"_dark":"다크","_device memory in GB":"기기 메모리 GB","_light":"라이트","_user prefers [THEME] color scheme?":"사용자가 [THEME]색상 테마를 선호하는가?","_user prefers more contrast?":"사용자가 고대비를 선호하는가?","_user prefers reduced motion?":"사용자가 감소된 움직임을 선호하는가?"},"nb":{"_dark":"mørk","_device memory in GB":"enhetens minne i GB","_light":"lys","_user prefers [THEME] color scheme?":"bruker foretrekker [THEME] fargeskjema?","_user prefers more contrast?":"brukeren foretrekker mer kontrast?","_user prefers reduced motion?":"bruker foretrekker redusert bevegelse?"},"nl":{"_dark":"donker","_device memory in GB":"apparaatgeheugen in GB","_light":"licht","_user prefers [THEME] color scheme?":"gebruik heeft voorkeur voor [THEME] kleurenschema?","_user prefers more contrast?":"gebruiker heeft voorkeur voor meer contrast?","_user prefers reduced motion?":"gebruiker heeft voorkeur voor verminderde beweging?"},"pl":{"_dark":"ciemny","_light":"jasny"},"ru":{"_dark":"тёмную","_device memory in GB":"память устройства в ГБ","_light":"светлую","_user prefers [THEME] color scheme?":"пользователь предпочитает [THEME] тему?","_user prefers more contrast?":"пользователь предпочитает больший контраст?","_user prefers reduced motion?":"пользователь предпочитает уменьшенное движение?"},"zh-cn":{"_dark":"暗色","_device memory in GB":"设备运行内存","_light":"亮色","_user prefers [THEME] color scheme?":"开启了[THEME]主题？","_user prefers more contrast?":"开启了高对比度？","_user prefers reduced motion?":"开启了动画减弱功能？"}});/* end generated l10n code */(function (Scratch) {
  "use strict";

  // Desktop fork (extension merges): Battery's code, its hats now under this extension's ID
  /** @type {Promise<BatteryManager>|null} */
  let getBatteryPromise = null;
  /** @type {BatteryManager|null} */
  let cachedBattery = null;
  /** @type {boolean} */
  let batteryError = false;

  const withBattery = (callback) => {
    // Getting the BatteryManager is async the first time. Usually it's very fast, but we shouldn't assume that it is.
    // All the logic here lets us return values immediately when we have already got the battery instead of forcing
    // a delay by returning a promise.
    if (!navigator.getBattery || batteryError) {
      return callback(null);
    }
    if (cachedBattery) {
      return callback(cachedBattery);
    }
    if (!getBatteryPromise) {
      getBatteryPromise = navigator
        .getBattery()
        .then((battery) => {
          getBatteryPromise = null;
          cachedBattery = battery;
          cachedBattery.addEventListener("chargingchange", () => {
            Scratch.vm.runtime.startHats("navigatorinfo_chargingChanged");
          });
          cachedBattery.addEventListener("levelchange", () => {
            Scratch.vm.runtime.startHats("navigatorinfo_levelChanged");
          });
          cachedBattery.addEventListener("chargingtimechange", () => {
            Scratch.vm.runtime.startHats("navigatorinfo_chargeTimeChanged");
          });
          cachedBattery.addEventListener("dischargingtimechange", () => {
            Scratch.vm.runtime.startHats("navigatorinfo_dischargeTimeChanged");
          });
          return cachedBattery;
        })
        .catch((error) => {
          getBatteryPromise = null;
          console.error("Could not get battery", error);
          batteryError = true;
          return null;
        });
    }
    return getBatteryPromise.then((battery) => {
      return callback(battery);
    });
  };

  // Try to get the battery immediately so that event blocks work.
  withBattery(() => {});

  // Desktop fork (extension merges): Wake Lock's code
  /** @type {WakeLockSentinel} */
  let wakeLock = null;
  let latestEnabled = false;
  let promise = Promise.resolve();

  class NavigatorInfo {
    constructor() {
      // Desktop fork (extension merges): from Wake Lock
      Scratch.vm.runtime.on("PROJECT_STOP_ALL", () => {
        this.setWakeLock({
          enabled: false,
        });
      });
      Scratch.vm.runtime.pmPage.addEventListener("document", "visibilitychange", () => {
        // If enabled, reacquire wake lock when document becomes visible again
        if (wakeLock !== null && document.visibilityState === "visible") {
          latestEnabled = false;
          this.setWakeLock({
            enabled: true,
          });
        }
      });
    }

    getInfo() {
      return {
        id: "navigatorinfo",
        name: "Device Info",
        color1: "#cf8436",
        blocks: [
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Device",
          },
          {
            opcode: "getMemory",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("device memory in GB"),
          },
          {
            // Desktop fork (section 270): moved here from Network ("network type"); answers on phones and Chromebooks,
            // empty where the system does not tell
            opcode: "connectionType",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("connection type"),
          },
          {
            opcode: "getPreferredColorScheme",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("user prefers [THEME] color scheme?"),
            arguments: {
              THEME: {
                type: Scratch.ArgumentType.STRING,
                menu: "THEME",
                defaultValue: "dark",
              },
            },
          },
          {
            opcode: "getPreferredReducedMotion",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("user prefers reduced motion?"),
          },
          {
            opcode: "getPreferredContrast",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("user prefers more contrast?"),
          },
          // Desktop fork (extension merges): from Wake Lock
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Screen",
          },
          {
            opcode: "setWakeLock",
            blockType: Scratch.BlockType.COMMAND,
            text: "keep the screen awake [enabled]",
            arguments: {
              enabled: {
                type: Scratch.ArgumentType.STRING,
                menu: "onOff",
                defaultValue: "true",
              },
            },
          },
          {
            opcode: "isLocked",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "screen kept awake?",
          },
          // Desktop fork (extension merges): from Battery
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Battery",
          },
          {
            opcode: "charging",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "charging?",
          },
          {
            opcode: "level",
            blockType: Scratch.BlockType.REPORTER,
            text: "battery level",
          },
          {
            opcode: "chargeTime",
            blockType: Scratch.BlockType.REPORTER,
            text: "seconds until charged",
          },
          {
            opcode: "dischargeTime",
            blockType: Scratch.BlockType.REPORTER,
            text: "seconds until empty",
          },
          {
            opcode: "chargingChanged",
            blockType: Scratch.BlockType.EVENT,
            text: "when charging changes",
            isEdgeActivated: false,
          },
          {
            opcode: "levelChanged",
            blockType: Scratch.BlockType.EVENT,
            text: "when battery level changes",
            isEdgeActivated: false,
          },
          {
            opcode: "chargeTimeChanged",
            blockType: Scratch.BlockType.EVENT,
            text: "when seconds until charged changes",
            isEdgeActivated: false,
          },
          {
            opcode: "dischargeTimeChanged",
            blockType: Scratch.BlockType.EVENT,
            text: "when seconds until empty changes",
            isEdgeActivated: false,
          },
        ],
        menus: {
          THEME: {
            acceptReporters: false /* Desktop fork (section 265): only its own items work */,
            items: [
              {
                text: Scratch.translate("light"),
                value: "light",
              },
              {
                text: Scratch.translate("dark"),
                value: "dark",
              },
            ],
          },
          onOff: {
            acceptReporters: true,
            items: [
              {
                text: "on",
                value: "true",
              },
              {
                text: "off",
                value: "false",
              },
            ],
          },
        },
      };
    }

    connectionType() {
      const types = { bluetooth: "bluetooth", cellular: "mobile data", ethernet: "cable", wifi: "wi-fi", wimax: "wimax" };
      try {
        return types[navigator.connection.type] || "";
      } catch (err) {
        return "";
      }
    }

    getMemory() {
      // @ts-expect-error
      if (navigator.deviceMemory == undefined) {
        return "Unsupported";
      } else {
        // @ts-expect-error
        return navigator.deviceMemory;
      }
    }

    getPreferredColorScheme(args) {
      return (
        window.matchMedia("(prefers-color-scheme: dark)").matches ===
        (args.THEME === "dark")
      );
    }

    getPreferredReducedMotion() {
      return !!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    getPreferredContrast() {
      return !!window.matchMedia("(prefers-contrast: more)").matches;
    }

    // Desktop fork (extension merges): from Wake Lock
    setWakeLock(args) {
      if (!navigator.wakeLock) {
        // Not supported in this browser.
        return;
      }

      const enable = Scratch.Cast.toBoolean(args.enabled);
      if (enable && document.visibilityState === "hidden") {
        // Can't request wake lock while document is hidden.
        return;
      }

      const previousEnabled = latestEnabled;
      latestEnabled = enable;
      if (latestEnabled && !previousEnabled) {
        promise = promise
          .then(() => navigator.wakeLock.request("screen"))
          .then((sentinel) => {
            wakeLock = sentinel;
            wakeLock.addEventListener("release", () => {
              if (document.visibilityState === "visible") {
                // If the document is hidden, wake lock should be reacquired when it's visible again.
                wakeLock = null;
                latestEnabled = false;
              }
            });
          })
          .catch((error) => {
            console.error(error);
            // Allow to retry
            latestEnabled = false;
          });
        return promise;
      } else if (!latestEnabled && previousEnabled) {
        promise = promise
          .then(() => {
            if (wakeLock) {
              return wakeLock.release();
            } else {
              // Attempt to enable in the first place didn't work
            }
          })
          .then(() => {
            wakeLock = null;
          })
          .catch((error) => {
            console.error(error);
            wakeLock = null;
          });
        return promise;
      }
    }

    isLocked() {
      return !!wakeLock;
    }

    // Desktop fork (extension merges): from Battery
    charging() {
      return withBattery((battery) => {
        if (!battery) return true;
        return battery.charging;
      });
    }

    level() {
      return withBattery((battery) => {
        if (!battery) return 100;
        return battery.level * 100;
      });
    }

    chargeTime() {
      return withBattery((battery) => {
        if (!battery) return 0;
        return battery.chargingTime;
      });
    }

    dischargeTime() {
      return withBattery((battery) => {
        if (!battery) return Infinity;
        return battery.dischargingTime;
      });
    }
  }

  Scratch.extensions.register(new NavigatorInfo());
})(Scratch);
});

/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the TurboWarp gallery's obviousAlexC/SensingPlus.js as its build makes it, moved into
// the VM as a built-in extension. The code is the gallery file, except: list values through Variable.pmGetValue / pmIndexOf instead of its `value`, so the list keeps its lookup table (section 125, step 5e) (marked "Desktop fork").
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
// Desktop fork (section 155): "random" list indexes use the runtime's random numbers (Scratch.Cast.toListIndex gets Scratch.vm.runtime).
// Desktop fork (section 159): its dialogs, localStorage and window / document event listeners go through
// Scratch.vm.runtime.pmPage, the runtime's door to the page (marked by the name).
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Sensing Plus
// ID: obviousalexsensing
// Description: An extension to the sensing category.
// By: ObviousAlexC <https://scratch.mit.edu/users/pinksheep2917/>
// License: MIT

/* generated l10n code */Scratch.translate.setup({"fi":{"_# of fingers down":"näyttöä painavien sormien määrä","_# of simultaneous possible":"samanaikaisten kosketusten mahdollinen määrä","_Needs a gyroscope or accelerometer":"Tarvitsee gyroskoopin tai kiihtyvyysmittarin.","_Sensing+":"Tuntoaisti +","_Tap to allow access to accelerometer and gyroscope.":"Anna lupa kiihtyvyysmittarin ja gyroskoopin käyttöön napauttamalla.","_To allow accelerometer and gyroscope access, open iOS settings > Apps > Safari > Advanced > Website Data > press Edit > Clear data for {domain}, then refresh this page.":"Salli kiihtyvyysmittarin ja gyroskoopin käyttö avaamalla iOS:n asetukset ja valitsemalla Apit > Safari > Lisävalinnat > Sivustojen data > Muokkaa. Poista sitten luettelosta {domain}, napauta Valmis ja päivitä tämä sivu.","_[type] on the [axis] axis":"[type] [axis]-akselilla","_acceleration":"kiihtyvyys","_accelerometer":"kiihtyvyysmittari","_current finger touching":"tällä hetkellä koskettava sormi","_finger [ID] [PositionType]":"sormen [ID] [PositionType]","_finger [ID] speed":"sormen [ID] nopeus","_gyroscope":"gyroskooppi","_has a [device]?":"onko laitteella [device]?","_is finger [ID] down?":"painaako sormi [ID]?","_rotation":"kierto","_supports touches?":"tuetaanko kosketusta?","_touching a finger?":"koskettaako sormea?","_touching finger [ID]?":"koskettaako sormea [ID]?"},"it":{"_# of fingers down":"numero di dita a contatto","_# of simultaneous possible":"numero max di tocchi simultanei","_Needs a gyroscope or accelerometer":"Occorre un giroscopio o accelerometro","_Sensing+":"Sensori Plus","_Tap to allow access to accelerometer and gyroscope.":"Tocca per consentire l'accesso ad accelerometro e giroscopio","_To allow accelerometer and gyroscope access, open iOS settings > Apps > Safari > Advanced > Website Data > press Edit > Clear data for {domain}, then refresh this page.":"Per consentire l'accesso a accelerometro e giroscopio apri le impostazioni di iOS > App > Safari > Avanzate > Dati dei siti web > premere Modifica > rimuovere i dati per {domain} e aggiornare questa pagina.","_[type] on the [axis] axis":"[type]sull'asse [axis]","_acceleration":"accelerazione","_accelerometer":"accelerometro","_current finger touching":"dito attuale a contatto","_finger [ID] [PositionType]":"[PositionType] di dito [ID]","_finger [ID] speed":"velocità dito [ID]","_gyroscope":"giroscopio","_has a [device]?":"ha un [device]","_is finger [ID] down?":"dito [ID] a contatto","_rotation":"rotazione","_supports touches?":"supporta tocco","_touching a finger?":"a contatto con un dito","_touching finger [ID]?":"a contatto con dito [ID]"},"ja":{"_# of fingers down":"タッチされている指の数","_# of simultaneous possible":"同時にタッチ可能な数","_Needs a gyroscope or accelerometer":"ジャイロスコープや加速度センサーを搭載した機器が必要です","_Sensing+":"調べる+","_Tap to allow access to accelerometer and gyroscope.":"タップして加速度計とジャイロスコープへのアクセスを許可します","_To allow accelerometer and gyroscope access, open iOS settings > Apps > Safari > Advanced > Website Data > press Edit > Clear data for {domain}, then refresh this page.":"加速度計とジャイロスコープへのアクセスを有効にするには、iOSの設定 > アプリ > Safari > 詳細 > Webサイトデータ > 編集を押す > {domain}のデータを消し、このページを再読み込みしてください。","_[type] on the [axis] axis":"[axis]軸の[type]","_acceleration":"加速度","_accelerometer":"加速度センサー","_current finger touching":"スプライトに触れている指の数","_finger [ID] [PositionType]":"指[ID]の[PositionType]座標","_finger [ID] speed":"指[ID]の速度","_gyroscope":"ジャイロスコープ","_has a [device]?":"[device]機能を持っている","_is finger [ID] down?":"指[ID]が下がっているか","_rotation":"回転","_supports touches?":"タッチ対応","_touching a finger?":"指に触れているか?","_touching finger [ID]?":"[ID]本の指に触れているか"},"ko":{"_# of fingers down":"입력된 손가락 개수","_# of simultaneous possible":"최대 동시입력 개수","_Needs a gyroscope or accelerometer":"자이로스코프 또는 속도계가 필요합니다","_Sensing+":"감지 플러스","_accelerometer":"속도계","_finger [ID] [PositionType]":"손가락 [ID]의 [PositionType]좌표 ","_finger [ID] speed":"손가락 [ID]의 속도","_gyroscope":"자이로스코프","_has a [device]?":"[device]가 있는가?","_is finger [ID] down?":"손가락 [ID](이)가 입력중인가?","_rotation":"회전","_supports touches?":"터치를 지원하는가?"},"nb":{"_# of fingers down":"# av fingre ned","_# of simultaneous possible":"# av samtidige mulige","_Needs a gyroscope or accelerometer":"Trenger en gyroskop eller akselerometer","_accelerometer":"akselerometer","_current finger touching":"nåværende finger berøring","_finger [ID] speed":"finger [ID] hastighet","_gyroscope":"gyroskop","_has a [device]?":"har en [device]?","_touching a finger?":"berøre en finger?","_touching finger [ID]?":"berøring finger [ID]?"},"nl":{"_# of fingers down":"# vingers op scherm","_# of simultaneous possible":"# mogelijke gelijktijdige aanrakingen","_Needs a gyroscope or accelerometer":"Gyroscoop of versnellingsmeter vereist","_Sensing+":"Waarnemen+","_accelerometer":"versnellingsmeter","_current finger touching":"huidig aangeraakte vinger","_finger [ID] [PositionType]":"vinger [ID] [PositionType]","_finger [ID] speed":"vinger [ID] snelheid","_gyroscope":"gyroscoop","_has a [device]?":"[device] verbonden?","_rotation":"rotatie","_touching a finger?":"raak ik een vinger?","_touching finger [ID]?":"raak ik vinger [ID]?"},"ru":{"_# of fingers down":"# палец нажат","_# of simultaneous possible":"# симультаннии возможно","_Needs a gyroscope or accelerometer":"Нужен гироскоп или акселерометр","_Sensing+":"Сенсоры+","_Tap to allow access to accelerometer and gyroscope.":"Нажмите, чтобы разрешить доступ к акселерометру и гироскопу.","_To allow accelerometer and gyroscope access, open iOS settings > Apps > Safari > Advanced > Website Data > press Edit > Clear data for {domain}, then refresh this page.":"Чтобы разрешить доступ к акселерометру и гироскопу, откройте настройки iOS > Приложения > Safari > Дополнительно > Данные веб-сайта > нажмите \"Редактировать\" > \"Очистить данные для {domain}\", затем обновите эту страницу.","_[type] on the [axis] axis":"[type] на оси [axis]","_acceleration":"ускорение","_accelerometer":"акселерометр","_current finger touching":"текущее касание пальцем","_finger [ID] [PositionType]":"палец [ID] [PositionType]","_finger [ID] speed":"скорость пальца [ID]","_gyroscope":"гироскоп","_has a [device]?":"имеет [device]?","_is finger [ID] down?":"палец [ID] опущен?","_rotation":"поворот","_supports touches?":"Поддерживает дотрагивания?","_touching a finger?":"дотрагивается до пальца?","_touching finger [ID]?":"дотрагивается до пальца [ID]?"},"zh-cn":{"_# of fingers down":"按下的手指数量","_# of simultaneous possible":"可能同时按下的手指数量","_Needs a gyroscope or accelerometer":"需要陀螺仪或者加速度计","_Sensing+":"侦测 +","_Tap to allow access to accelerometer and gyroscope.":"点击以允许访问加速度计和陀螺仪。","_To allow accelerometer and gyroscope access, open iOS settings > Apps > Safari > Advanced > Website Data > press Edit > Clear data for {domain}, then refresh this page.":"要允许访问加速度计和陀螺仪，请打开 iOS 设置> 应用程序> Safari >高级>网站数据>编辑>清除{domain}的数据，然后刷新此页面。","_[type] on the [axis] axis":"[axis]轴上的[type]","_acceleration":"加速度","_accelerometer":"加速度计","_current finger touching":"触碰到的手指ID","_finger [ID] [PositionType]":"第[ID]个手指的[PositionType]","_finger [ID] speed":"第[ID]个手指的速度","_gyroscope":"陀螺仪","_has a [device]?":"有[device]吗？","_is finger [ID] down?":"第[ID]个手指按下？","_rotation":"旋转","_supports touches?":"支持触碰？","_touching a finger?":"触碰到手指？","_touching finger [ID]?":"触碰到第[ID]个手指？"}});/* end generated l10n code */(function (Scratch) {
  "use strict";

  const physicalDeviceState = {
    accelerationX: 0,
    accelerationY: 0,
    accelerationZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  };
  const sensorStatus = {
    accelerometer: false,
    gyroscope: false,
  };

  /**
   * @returns {boolean}
   */
  const sensorAccessRequiresPermission = () =>
    typeof DeviceMotionEvent === "function" &&
    // @ts-expect-error
    typeof DeviceMotionEvent.requestPermission === "function";

  /**
   * Assumes you already checked sensorAccessRequiresPermission() === true.
   * @returns {Promise<'granted'|'denied'|'unknown'>} Will never reject.
   */
  const requestSensorPermission = () => {
    // @ts-expect-error
    return DeviceMotionEvent.requestPermission().catch((error) => {
      // Usually this means we weren't in a user gesture.
      console.error(error);
      return "unknown";
    });
  };

  /**
   * Assumes you already checked sensorAccessRequiresPermission() === true.
   * @returns {Promise<void>}
   */
  const askUserForSensorPermission = async () => {
    // Safari automatically denies any request not made directly in a user gesture handler,
    // so this request will almost certainly fail. We'll still try though, just in case.
    let status = await requestSensorPermission();

    if (status === "unknown") {
      status = await new Promise((resolve) => {
        const outer = document.createElement("div");
        outer.style.width = "100%";
        outer.style.height = "100%";
        outer.style.display = "flex";
        outer.style.alignItems = "center";
        outer.style.justifyContent = "center";
        outer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        outer.style.backdropFilter = "blur(10px)";
        outer.style.pointerEvents = "auto";
        outer.tabIndex = 0;

        const inner = document.createElement("div");
        inner.textContent = Scratch.translate(
          "Tap to allow access to accelerometer and gyroscope."
        );
        inner.style.maxWidth = "360px";
        inner.style.color = "white";
        inner.style.textAlign = "center";
        outer.appendChild(inner);

        outer.addEventListener("click", () => {
          resolve(requestSensorPermission());
          Scratch.renderer.removeOverlay(outer);
        });

        Scratch.renderer.addOverlay(outer, "scale");
      });
    }

    if (status === "denied") {
      // Requesting permission again will be ignored no matter what.
      // The flow for resetting this is awful, so let's at least tell the user how to do that.
      Scratch.vm.runtime.pmPage.alert(
        Scratch.translate(
          "To allow accelerometer and gyroscope access, open iOS settings > Apps > Safari > Advanced > Website Data > press Edit > Clear data for {domain}, then refresh this page.",
          {
            domain: location.hostname,
          }
        )
      );
    }

    const granted = status === "granted";
    sensorStatus.accelerometer = granted;
    sensorStatus.gyroscope = granted;
  };

  /** @type {null|Promise<void>} */
  let initializingSensorsPromise = null;
  /** @type {boolean} */
  let askedForSensorPermission = false;

  /**
   * @template T
   * @param {() => T} callback
   * @returns {T|Promise<T>}
   */
  const whenSensorsInitialized = (callback) => {
    if (!sensorAccessRequiresPermission() || askedForSensorPermission) {
      return callback();
    }

    if (!initializingSensorsPromise) {
      initializingSensorsPromise = askUserForSensorPermission().then(() => {
        // Whether we got permission or not, asking again won't change the result.
        askedForSensorPermission = true;
      });
    }

    return initializingSensorsPromise.then(callback);
  };

  Scratch.vm.runtime.pmPage.addEventListener("window", "devicemotion", (event) => {
    // On desktops, this event is fired with nulls.
    if (
      event.accelerationIncludingGravity.x !== null &&
      event.accelerationIncludingGravity.y !== null &&
      event.accelerationIncludingGravity.z !== null
    ) {
      askedForSensorPermission = true;
      sensorStatus.accelerometer = true;
      physicalDeviceState.accelerationX = event.accelerationIncludingGravity.x;
      physicalDeviceState.accelerationY = event.accelerationIncludingGravity.y;
      physicalDeviceState.accelerationZ = event.accelerationIncludingGravity.z;
    }
  });

  Scratch.vm.runtime.pmPage.addEventListener("window", "deviceorientation", (event) => {
    // On desktops, this event is fired with nulls.
    if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
      askedForSensorPermission = true;
      sensorStatus.gyroscope = true;
      physicalDeviceState.rotationX = event.beta;
      physicalDeviceState.rotationY = event.gamma;
      physicalDeviceState.rotationZ = event.alpha;
    }
  });

  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const canvas = runtime.renderer.canvas;

  const maxTouchPoints = navigator.maxTouchPoints;
  const supportsTouches = maxTouchPoints > 0;

  /**
   * Maps system Touch identifiers to the identifers we expose to projects.
   * This is necessary because Safari uses incremental IDs that only ever go up,
   * so they get very big and won't start from 0.
   * @type {Map<number, number>}
   */
  const nativeTouchIdToScratchId = new Map();

  /**
   * @typedef ScratchFinger
   * @property {number} x
   * @property {number} y
   * @property {number} lastX
   * @property {number} lastY
   */

  /**
   * Maps Scratch touch ID to internal object.
   * @type {Map<number, ScratchFinger>}
   */
  const scratchFingers = new Map();

  /**
   * @returns {number} A positive integer.
   */
  const getUnusedScratchId = () => {
    // This is slower than it could be but this doesn't run enough to matter.
    // IDs start from 1, like Scratch lists.
    let i = 1;
    while (scratchFingers.has(i)) {
      i++;
    }
    return i;
  };

  /** @param {TouchEvent} event */
  const handleTouchStart = (event) => {
    event.preventDefault();

    const canvasPos = canvas.getBoundingClientRect();
    for (const touch of event.changedTouches) {
      const nextAvailableScratchId = getUnusedScratchId();
      nativeTouchIdToScratchId.set(touch.identifier, nextAvailableScratchId);

      const x = touch.clientX - canvasPos.left;
      const y = touch.clientY - canvasPos.top;
      scratchFingers.set(nextAvailableScratchId, {
        x: x,
        y: y,
        lastX: x,
        lastY: y,
      });
    }
  };

  /** @param {TouchEvent} event */
  const handleTouchMove = (event) => {
    event.preventDefault();

    const canvasPos = canvas.getBoundingClientRect();
    for (const touch of event.changedTouches) {
      const scratchId = nativeTouchIdToScratchId.get(touch.identifier);
      const finger = scratchFingers.get(scratchId);
      finger.lastX = finger.x;
      finger.lastY = finger.y;
      finger.x = touch.clientX - canvasPos.left;
      finger.y = touch.clientY - canvasPos.top;
    }
  };

  /** @param {TouchEvent} event */
  const handleTouchEnd = (event) => {
    event.preventDefault();

    for (const touch of event.changedTouches) {
      const scratchId = nativeTouchIdToScratchId.get(touch.identifier);
      scratchFingers.delete(scratchId);
      nativeTouchIdToScratchId.delete(touch.identifier);
    }
  };

  /**
   * @param {VM.Target} target
   * @returns {number} -1 if not touching, else the Scratch ID
   */
  const findAnyTouchingFinger = (target) => {
    for (const [scratchId, finger] of scratchFingers.entries()) {
      const touching = target.isTouchingPoint(finger.x, finger.y);
      if (touching) {
        return scratchId;
      }
    }
    return -1;
  };

  /**
   * @param {VM.Target} target
   * @param {number} scratchId
   * @returns {boolean}
   */
  const isTouchingSpecificFinger = (target, scratchId) => {
    const finger = scratchFingers.get(scratchId);
    return !!finger && target.isTouchingPoint(finger.x, finger.y);
  };

  canvas.addEventListener("touchstart", handleTouchStart, {
    passive: false,
  });
  canvas.addEventListener("touchmove", handleTouchMove, {
    passive: false,
  });
  canvas.addEventListener("touchcancel", handleTouchEnd, {
    passive: false,
  });
  canvas.addEventListener("touchend", handleTouchEnd, {
    passive: false,
  });

  const fingersMenu = [];
  for (let i = 0; i < Math.max(maxTouchPoints, 10); i++) {
    fingersMenu.push((i + 1).toString());
  }

  const ico =
    "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIyOC44NjYwNyIgaGVpZ2h0PSIyOC44NjYwNyIgdmlld0JveD0iMCwwLDI4Ljg2NjA3LDI4Ljg2NjA3Ij48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMjI1LjA2Njk3LC0xNjUuMDY2OTcpIj48ZyBkYXRhLXBhcGVyLWRhdGE9InsmcXVvdDtpc1BhaW50aW5nTGF5ZXImcXVvdDs6dHJ1ZX0iIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBzdHJva2UtZGFzaGFycmF5PSIiIHN0cm9rZS1kYXNob2Zmc2V0PSIwIiBzdHlsZT0ibWl4LWJsZW5kLW1vZGU6IG5vcm1hbCI+PHBhdGggZD0iTTIyNS4wNjY5NywxNzkuNWMwLC03Ljk3MTE0IDYuNDYxODksLTE0LjQzMzAzIDE0LjQzMzAzLC0xNC40MzMwM2M3Ljk3MTE0LDAgMTQuNDMzMDMsNi40NjE4OSAxNC40MzMwMywxNC40MzMwM2MwLDcuOTcxMTQgLTYuNDYxODksMTQuNDMzMDMgLTE0LjQzMzAzLDE0LjQzMzAzYy03Ljk3MTE0LDAgLTE0LjQzMzAzLC02LjQ2MTg5IC0xNC40MzMwMywtMTQuNDMzMDN6IiBmaWxsPSIjNWNiMWQ2IiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMCIgc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiLz48cGF0aCBkPSJNMjM0LjUsMTc1YzAsLTIuNDkgMi4wMSwtNC41IDQuNSwtNC41YzIuNDksMCA0LjUsMi4wMSA0LjUsNC41YzAsMS41NiAtMC43OSwyLjkzIC0yLDMuNzR2LTMuNzRjMCwtMS4zODA3MSAtMS4xMTkyOSwtMi41IC0yLjUsLTIuNWMtMS4zODA3MSwwIC0yLjUsMS4xMTkyOSAtMi41LDIuNXYzLjc0Yy0xLjIxLC0wLjgxIC0yLC0yLjE4IC0yLC0zLjc0ek0yNDcuMjUsMTg0Ljc1YzAsMC4wNiAtMC4wMSwwLjEzIC0wLjAyLDAuMmwtMC43NSw1LjI3Yy0wLjExLDAuNzMgLTAuNjksMS4yOCAtMS40NCwxLjI4aC02Ljc5Yy0wLjQxLDAgLTAuNzksLTAuMTcgLTEuMDYsLTAuNDRsLTQuOTQsLTQuOTRsMC43OSwtMC44YzAuMiwtMC4yIDAuNDgsLTAuMzMgMC43OSwtMC4zM2MwLjEzLDAgMC4wNywtMC4wMSAzLjY3LDAuNzV2LTEwLjc0YzAsLTAuODMgMC42NywtMS41IDEuNSwtMS41YzAuODMsMCAxLjUsMC42NyAxLjUsMS41djZoMC43NmMwLjE5LDAgMC4zNywwLjA0IDAuNTQsMC4xMWw0LjU0LDIuMjZjMC41MywwLjIyIDAuOTEsMC43NiAwLjkxLDEuMzh6IiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiLz48cGF0aCBkPSJNMjI3LjUsMTY3LjVoMjR2MjRoLTI0eiIgZmlsbC1vcGFjaXR5PSIwIiBmaWxsPSIjMDAwMDAwIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiLz48ZyBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwYXRoIGQ9Ik0yNDQuNTAyMTEsMTc4LjgyNzU5aDUuNDk1NzkiLz48cGF0aCBkPSJNMjQ3LjI1LDE4MS41NzU0OGwwLC01LjQ5NTc4Ii8+PC9nPjwvZz48L2c+PC9zdmc+PCEtLXJvdGF0aW9uQ2VudGVyOjE0LjkzMzAzNDcxNTI2MTk4MjoxNC45MzMwMzQ3MTUyNjE5NTQtLT4=";
  const touchIco =
    "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIyNi4yMDU1MSIgaGVpZ2h0PSIyNi45NjQ5IiB2aWV3Qm94PSIwLDAsMjYuMjA1NTEsMjYuOTY0OSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTIyNi44OTcyNSwtMTY2LjEzNzg1KSI+PGcgZGF0YS1wYXBlci1kYXRhPSJ7JnF1b3Q7aXNQYWludGluZ0xheWVyJnF1b3Q7OnRydWV9IiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLWRhc2hhcnJheT0iIiBzdHJva2UtZGFzaG9mZnNldD0iMCIgc3R5bGU9Im1peC1ibGVuZC1tb2RlOiBub3JtYWwiPjxwYXRoIGQ9Ik0yMzkuMzA5OTgsMTg5Ljc3OTdjLTAuMDQ4MjMsMC4wMzU2OSAtMC4xMTA0NSwwLjA2OTI5IC0wLjE3MjY3LDAuMTAyODlsLTQuNjgyNDEsMi41MzE4OGMtMC42NTIyNCwwLjM0NTggLTEuNDM5MzYsMC4yMDY3MyAtMS44ODU0OSwtMC4zOTYxNmwtNC4wMzg5MiwtNS40NTgxNGMtMC4yNDM4OCwtMC4zMjk1OCAtMC4zMzMyNiwtMC43MzYxNiAtMC4yNzY4MywtMS4xMTM4MWwxLjAzMjU0LC02LjkwOTQ5bDEuMTEzLDAuMTU5MTdjMC4yNzk3NCwwLjA0MTggMC41NTA3OSwwLjE4OTU1IDAuNzM1MTksMC40Mzg3NWMwLjA3NzMzLDAuMTA0NSAwLjA0OTY4LDAuMDUwMzIgMS41ODAxNSwzLjM5NjI1bDguNjMzMzQsLTYuMzg4NTFjMC42NjcxOSwtMC40OTM3MSAxLjYwNDMxLC0wLjM1MzY3IDIuMDk4MDIsMC4zMTM1MmMwLjQ5MzcxLDAuNjY3MTkgMC4zNTM2NywxLjYwNDMxIC0wLjMxMzUyLDIuMDk4MDJsLTQuODIzMSwzLjU2OWwwLjQ1MjA3LDAuNjEwOTNjMC4xMTMwMiwwLjE1MjczIDAuMTg3OTMsMC4zMjEyMiAwLjIzMjc5LDAuNDk5NTFsMC44ODM4NCw0Ljk5MzhjMC4xMzg0MSwwLjU1NjkgLTAuMDY5NjMsMS4xODM1OCAtMC41NjgwMSwxLjU1MjM3eiIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJidXR0Ii8+PHBhdGggZD0iTTIyOC43MzMyMiwxNjYuMTM3ODVoMjR2MjRoLTI0eiIgZmlsbC1vcGFjaXR5PSIwIiBmaWxsPSIjMDAwMDAwIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiLz48cGF0aCBkPSJNMjQ0LjQ2NjgyLDE3NC44NzA0NGwyLjA3NDI4LC0yLjA3NDI4IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTIzNi44OTU5MSwxODIuNzMyNTJsMi4wNzQyOCwtMi4wNzQyOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik0yMzkuODUzNDcsMTc0Ljk1Nzc1bC0yLjA3NDI4LC0yLjA3NDI4IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTI0Ni40NTM4LDE4MS41NTgwOGwtMi4wNzQyOCwtMi4wNzQyOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik0yMjYuODk3MjUsMTkzLjEwMjc1di0yNi4yMDU1MWgyNi4yMDU1MXYyNi4yMDU1MXoiIGZpbGw9Im5vbmUiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSJub25lIiBzdHJva2UtbGluZWNhcD0iYnV0dCIvPjwvZz48L2c+PC9zdmc+PCEtLXJvdGF0aW9uQ2VudGVyOjEzLjEwMjc1NDg1NDYyMTI4MToxMy44NjIxNDc1NDY3MTM3NDMtLT4=";
  const deviceVelIco =
    "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSI3Mi44NjY0OCIgaGVpZ2h0PSI2MC43NDUyNSIgdmlld0JveD0iMCwwLDcyLjg2NjQ4LDYwLjc0NTI1Ij48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMjA0LjY0MTEzLC0xNDkuNjI3MzgpIj48ZyBkYXRhLXBhcGVyLWRhdGE9InsmcXVvdDtpc1BhaW50aW5nTGF5ZXImcXVvdDs6dHJ1ZX0iIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLWRhc2hhcnJheT0iIiBzdHJva2UtZGFzaG9mZnNldD0iMCIgc3R5bGU9Im1peC1ibGVuZC1tb2RlOiBub3JtYWwiPjxwYXRoIGQ9Ik0yMjMuNTMwMDgsMTk4LjI2ODZjLTAuNzcxMDEsLTAuMjEzNCAtMS4zNjU2MiwtMC42ODkyNSAtMS43ODM4MywtMS40Mjc1NmMtMC40MTgyMSwtMC43MzgzMSAtMC41MjA2MSwtMS40OTI5NyAtMC4zMDcyMSwtMi4yNjM5OGwxMC4xMzY0OSwtMzYuNjIzMWMwLjIxMzQsLTAuNzcxMDEgMC42ODkyNSwtMS4zNjU2MiAxLjQyNzU2LC0xLjc4MzgzYzAuNzM4MzEsLTAuNDE4MjEgMS40OTI5NywtMC41MjA2MSAyLjI2Mzk4LC0wLjMwNzIxbDIxLjIwMjg1LDUuODY4NWMwLjc3MTAxLDAuMjEzNCAxLjM2NTYyLDAuNjg5MjUgMS43ODM4MywxLjQyNzU2YzAuNDE4MjEsMC43MzgzMSAwLjUyMDYxLDEuNDkyOTcgMC4zMDcyMSwyLjI2Mzk4bC0xMC4xMzY0OSwzNi42MjMxYy0wLjIxMzQsMC43NzEwMSAtMC42ODkyNSwxLjM2NTYyIC0xLjQyNzU2LDEuNzgzODNjLTAuNzM4MzEsMC40MTgyMSAtMS40OTI5NywwLjUyMDYxIC0yLjI2Mzk4LDAuMzA3MjF6TTIyNC43MzA0NSwxOTMuOTMxNjVsLTAuNDAwMTIsMS40NDU2NWwyMS4yMDI4NSw1Ljg2ODVsMC40MDAxMiwtMS40NDU2NXpNMjI1LjUzMDcsMTkxLjA0MDM2bDIxLjIwMjg1LDUuODY4NWw3LjczNTc1LC0yNy45NDkyMWwtMjEuMjAyODUsLTUuODY4NXpNMjM0LjA2NjcsMTYwLjE5OTg1bDIxLjIwMjg1LDUuODY4NWwwLjQwMDEyLC0xLjQ0NTY1bC0yMS4yMDI4NSwtNS44Njg1ek0yMzQuMDY2NywxNjAuMTk5ODVsMC40MDAxMiwtMS40NDU2NXpNMjI0LjczMDQ1LDE5My45MzE2NWwtMC40MDAxMiwxLjQ0NTY1eiIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiLz48cGF0aCBkPSJNMjI2LjQ4NTU2LDE1NC40NzkwMWM0LjAzMjEsLTIuMTM5NiA4LjYzMTczLC0zLjM1MTYzIDEzLjUxNDQ0LC0zLjM1MTYzYzE1Ljk0NTkxLDAgMjguODcyNjIsMTIuOTI2NzEgMjguODcyNjIsMjguODcyNjJjMCwwLjg5Mjc3IC0wLjA0MDUyLDEuNzc2MDcgLTAuMTE5ODIsMi42NDgxNyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48cGF0aCBkPSJNMjYwLjI2NzExLDIwMC41NjM4N2MtNS4yMTI3Myw1LjEzNzk3IC0xMi4zNjk2Myw4LjMwODc1IC0yMC4yNjcxMSw4LjMwODc1Yy0xNS45NDU5MSwwIC0yOC44NzI2MiwtMTIuOTI2NzEgLTI4Ljg3MjYyLC0yOC44NzI2MmMwLC0zLjgzOTY1IDAuNzQ5NSwtNy41MDQyNSAyLjExMDE5LC0xMC44NTU0NiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48cGF0aCBkPSJNMjA0LjY0MTEzLDE2Ni4zNzdsMTEuNjQ1NjgsLTUuMzEyMDdsNS4zMTIwNywxMS42NDU2OHoiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIwIi8+PHBhdGggZD0iTTI3Ny41MDc2MSwxODIuNjQ0MDFsLTkuODAyNDMsOC4yMzExOGwtOC4yMzExOCwtOS44MDI0M3oiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIwIi8+PC9nPjwvZz48L3N2Zz48IS0tcm90YXRpb25DZW50ZXI6MzUuMzU4ODczODM5ODgwOTc6MzAuMzcyNjIzNTE2MTc0OTk3LS0+";

  class SensingPlus {
    getInfo() {
      return {
        menuIconURI: ico,
        color1: "#5cb1d6",
        color2: "#3ba2ce",
        color3: "#2e8eb8",
        id: "obviousalexsensing",
        name: Scratch.translate("Sensing+"),
        blocks: [
          {
            opcode: "supportsTouches",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("supports touches?"),
            blockIconURI: touchIco,
            arguments: {},
            extensions: ["colours_sensing"],
          },
          {
            opcode: "getMaxTouches",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("# of simultaneous possible"),
            blockIconURI: touchIco,
            arguments: {},
            extensions: ["colours_sensing"],
          },
          {
            opcode: "getFingersTouching",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("# of fingers down"),
            blockIconURI: touchIco,
            arguments: {},
            extensions: ["colours_sensing"],
          },
          {
            opcode: "isFingerDown",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("is finger [ID] down?"),
            blockIconURI: touchIco,
            arguments: {
              ID: {
                type: Scratch.ArgumentType.NUMBER,
                menu: "fingerIDMenu",
              },
            },
            extensions: ["colours_sensing"],
          },
          {
            opcode: "touchingFinger",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("touching a finger?"),
            blockIconURI: touchIco,
            filter: [Scratch.TargetType.SPRITE],
            arguments: {},
            disableMonitor: true,
            extensions: ["colours_sensing"],
          },
          {
            opcode: "touchingSpecificFinger",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("touching finger [ID]?"),
            blockIconURI: touchIco,
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              ID: {
                type: Scratch.ArgumentType.NUMBER,
                menu: "fingerIDMenu",
              },
            },
            extensions: ["colours_sensing"],
          },
          {
            opcode: "getTouchingFingerID",
            blockType: Scratch.BlockType.REPORTER,
            disableMonitor: true,
            text: Scratch.translate("current finger touching"),
            filter: [Scratch.TargetType.SPRITE],
            blockIconURI: touchIco,
            arguments: {},
            extensions: ["colours_sensing"],
          },
          {
            opcode: "fingerPosition",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("finger [ID] [PositionType]"),
            blockIconURI: touchIco,
            arguments: {
              ID: {
                type: Scratch.ArgumentType.NUMBER,
                menu: "fingerIDMenu",
              },
              PositionType: {
                type: Scratch.ArgumentType.STRING,
                menu: "coordmenu",
              },
            },
            extensions: ["colours_sensing"],
          },
          {
            opcode: "getFingerSpeed",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("finger [ID] speed"),
            blockIconURI: touchIco,
            arguments: {
              ID: {
                type: Scratch.ArgumentType.NUMBER,
                menu: "fingerIDMenu",
              },
            },
            extensions: ["colours_sensing"],
          },
          "---",
          {
            blockType: "label",
            text: Scratch.translate("Needs a gyroscope or accelerometer"),
          },
          {
            opcode: "hasDevice",
            blockIconURI: deviceVelIco,
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("has a [device]?"),
            arguments: {
              device: {
                type: Scratch.ArgumentType.STRING,
                menu: "deviceMenu",
              },
            },
            extensions: ["colours_sensing"],
          },
          {
            opcode: "getDeviceSpeed",
            blockIconURI: deviceVelIco,
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("[type] on the [axis] axis"),
            disableMonitor: true,
            arguments: {
              type: {
                type: Scratch.ArgumentType.STRING,
                menu: "velocitymenu", // velocitymenu is poorly named
              },
              axis: {
                type: Scratch.ArgumentType.STRING,
                menu: "axismenu",
              },
            },
            extensions: ["colours_sensing"],
          },
        ],
        menus: {
          fingerIDMenu: {
            acceptReporters: true,
            items: fingersMenu,
          },
          deviceMenu: {
            acceptReporters: true,
            items: [
              {
                text: Scratch.translate("gyroscope"),
                value: "gyroscope",
              },
              {
                text: Scratch.translate("accelerometer"),
                value: "accelerometer",
              },
            ],
          },
          coordmenu: {
            acceptReporters: true,
            items: ["x", "y"],
          },
          axismenu: {
            acceptReporters: true,
            items: ["x", "y", "z"],
          },
          // velocitymenu is poorly named.
          velocitymenu: {
            acceptReporters: true,
            items: [
              {
                text: Scratch.translate({
                  default: "acceleration",
                  description:
                    "Part of a block that tells you how fast the device is accelerating",
                }),
                value: "positional",
              },
              {
                text: Scratch.translate({
                  default: "rotation",
                  description:
                    "Part of a block that tells you what angle the device is being held at",
                }),
                value: "rotational",
              },
            ],
          },
        },
      };
    }

    supportsTouches() {
      return supportsTouches;
    }

    getMaxTouches() {
      return maxTouchPoints;
    }

    getFingerSpeed({ ID }) {
      const finger = scratchFingers.get(Scratch.Cast.toNumber(ID));
      if (!finger) {
        return 0;
      }
      const speed = Math.sqrt(
        Math.pow(finger.x - finger.lastX, 2) +
          Math.pow(finger.y - finger.lastY, 2)
      );
      finger.lastX = finger.x;
      finger.lastY = finger.y;
      return speed;
    }

    hasDevice({ device }) {
      return whenSensorsInitialized(() => {
        if (Object.prototype.hasOwnProperty.call(sensorStatus, device)) {
          return sensorStatus[device];
        }
        return false;
      });
    }

    getDeviceSpeed({ type, axis }) {
      return whenSensorsInitialized(() => {
        if (type === "positional") {
          if (axis === "x") {
            return physicalDeviceState.accelerationX;
          } else if (axis === "y") {
            return physicalDeviceState.accelerationY;
          } else if (axis === "z") {
            return physicalDeviceState.accelerationZ;
          }
        } else if (type === "rotational") {
          if (axis === "x") {
            return physicalDeviceState.rotationX;
          } else if (axis === "y") {
            return physicalDeviceState.rotationY;
          } else if (axis === "z") {
            return physicalDeviceState.rotationZ;
          }
        }
        // should never happen
        return 0;
      });
    }

    getFingersTouching() {
      return scratchFingers.size;
    }

    touchingFinger(args, util) {
      return findAnyTouchingFinger(util.target) !== -1;
    }

    touchingSpecificFinger({ ID }, util) {
      return isTouchingSpecificFinger(util.target, Scratch.Cast.toNumber(ID));
    }

    getTouchingFingerID(args, util) {
      const touching = findAnyTouchingFinger(util.target);
      if (touching === -1) {
        return 0;
      }
      return touching;
    }

    fingerPosition({ ID, PositionType }) {
      const finger = scratchFingers.get(Scratch.Cast.toNumber(ID));
      if (finger) {
        const canvasRect = canvas.getBoundingClientRect();
        if (Scratch.Cast.toString(PositionType) === "x") {
          const clientWidth = canvasRect.right - canvasRect.left;
          const toScratch = runtime.stageWidth / clientWidth;
          return finger.x * toScratch - runtime.stageWidth / 2;
        } else {
          const clientheight = canvasRect.bottom - canvasRect.top;
          const toScratch = runtime.stageHeight / clientheight;
          return runtime.stageHeight / 2 - finger.y * toScratch;
        }
      }
      return 0;
    }

    isFingerDown({ ID }) {
      return scratchFingers.has(Scratch.Cast.toNumber(ID));
    }

    // Desktop fork (section 125): list values through pmGetValue / pmIndexOf

  }
  Scratch.extensions.register(new SensingPlus());
})(Scratch);
});

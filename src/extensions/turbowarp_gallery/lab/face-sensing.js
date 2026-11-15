/* eslint-disable */
// Desktop fork (extension merges): one camera extension, ID videoSensing, in the place of TurboWarp's Face Sensing (its
// gallery address loads it; a chunk of its own like the other gallery extensions). It merges Scratch's Video Sensing
// (its motion part is scratch3_video_sensing/motion.js), SharkPool's Camera Sensing+ and Face Sensing; all three use the
// one camera of the Scratch video device (Camera Sensing+'s own second camera and its front / back camera blocks are gone).
// Face detection (face-detector.js, about 2 MB) is loaded and runs only while the camera is on and the project has face
// blocks. Sections 127 (hats checked only when their answer can change), 129 (sprite skins through the renderer), 154
// and 156 (the runtime's clock and timers) kept from the three extensions.
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
const VideoMotionSensing = require('../../scratch3_video_sensing/motion');
const initializeDetector = require('./face-detector');
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Camera Sensing
// ID: videoSensing
// Description: Turn the camera on, sense motion and faces, and use video frames as images.
// By: Scratch Foundation
// By: SharkPool
// By: GarboMuffin
// License: BSD-3-Clause AND MIT AND MPL-2.0

/* generated l10n code */Scratch.translate.setup({"de":{"_left":"Links","_right":"Rechts"},"fi":{"_left":"vasemmalle","_right":"oikealle"},"fr":{"_left":"gauche","_right":"droite"},"it":{"_Could not load face detection":"Impossibile caricare sensore volto","_a face is detected?":"volto presente","_between eyes":"tra gli occhi","_face size":"dimensione volto","_face tilt":"inclinazione volto","_go to [PART]":"vai a [PART]","_left":"sinistra","_left ear":"orecchio sinistro","_left eye":"occhio sinistro","_mouth":"bocca","_nose":"naso","_point in direction of face tilt":"punta in direzione inclinazione volto","_right":"destra","_right ear":"orecchio destro","_right eye":"occhio destro","_set size to face size":"porta dimensione a dimensione volto","_top of head":"parte superiore della testa","_when a face is detected":"quando è presente un volto","_when face tilts [DIRECTION]":"quando volto si inclina a [DIRECTION]","_when this sprite touches a [PART]":"quando questo sprite tocca [PART]"},"ja":{"_left":"左ボタン","_right":"右ボタン"},"ko":{"_left":"왼쪽","_right":"오른쪽"},"nb":{"_left":"venstre","_right":"høyre"},"nl":{"_Could not load face detection":"Gezichtsherkenning laden mislukt","_a face is detected?":"een gezicht wordt herkend?","_between eyes":"tussen ogen","_face size":"gezichtsgrootte","_face tilt":"gezichtskanteling","_go to [PART]":"ga naar [PART]","_left":"links","_left ear":"linkeroor","_left eye":"linkeroog","_mouth":"mond","_nose":"neus","_point in direction of face tilt":"richt naar richting van gezichtskanteling","_right":"rechts","_right ear":"rechteroor","_right eye":"rechteroog","_set size to face size":"maak grootte gelijk aan gezichtsgrootte","_top of head":"bovenkant hoofd","_when a face is detected":"wanneer een gezicht wordt herkend","_when face tilts [DIRECTION]":"wanneer gezicht kantelt naar [DIRECTION]","_when this sprite touches a [PART]":"wanneer deze sprite een [PART] raakt"},"ru":{"_Could not load face detection":"Не удалось загрузить распознавание лиц","_a face is detected?":"обнаружено лицо?","_between eyes":"между глазами","_face size":"размер лица","_face tilt":"наклон лица","_go to [PART]":"перейти на [PART]","_left":"левому краю","_left ear":"левое ухо","_left eye":"левый глаз","_mouth":"рот","_nose":"нос","_point in direction of face tilt":"указать на наклон лица","_right":"правому краю","_right ear":"правое ухо","_right eye":"правый глаз","_set size to face size":"задать размер на размер лица","_top of head":"вершина головы","_when a face is detected":"когда обнаружено лицо","_when face tilts [DIRECTION]":"когда лицо наклоняется на [DIRECTION]","_when this sprite touches a [PART]":"когда этот спрайт касается [PART]"},"uk":{"_left":"ліво","_right":"право"},"zh-cn":{"_Could not load face detection":"无法加载人脸侦测","_a face is detected?":"检测到人脸？","_between eyes":"双眼之间","_face size":"人脸大小","_face tilt":"人脸倾斜角度","_go to [PART]":"移到[PART]","_left":"左","_left ear":"左耳","_left eye":"左眼","_mouth":"嘴巴","_nose":"鼻子","_point in direction of face tilt":"朝向人脸倾斜方向","_right":"右","_right ear":"右耳","_right eye":"右眼","_set size to face size":"将大小设为人脸大小","_top of head":"头顶","_when a face is detected":"当检测到人脸","_when face tilts [DIRECTION]":"当脸向[DIRECTION]倾斜","_when this sprite touches a [PART]":"当角色碰到[PART]"}});/* end generated l10n code */
// Video Sensing's icons
const menuIconURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjBweCIgaGVpZ2h0PSIyMHB4IiB2aWV3Qm94PSIwIDAgMjAgMjAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjIgKDY3MTQ1KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5FeHRlbnNpb25zL1NvZnR3YXJlL1ZpZGVvLVNlbnNpbmctTWVudTwvdGl0bGU+CiAgICA8ZGVzYz5DcmVhdGVkIHdpdGggU2tldGNoLjwvZGVzYz4KICAgIDxnIGlkPSJFeHRlbnNpb25zL1NvZnR3YXJlL1ZpZGVvLVNlbnNpbmctTWVudSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgaWQ9InZpZGVvLW1vdGlvbiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsIDUuMDAwMDAwKSIgZmlsbC1ydWxlPSJub256ZXJvIj4KICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC1Db3B5IiBmaWxsPSIjMEVCRDhDIiBvcGFjaXR5PSIwLjI1IiBjeD0iMTYiIGN5PSI4IiByPSIyIj48L2NpcmNsZT4KICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC1Db3B5IiBmaWxsPSIjMEVCRDhDIiBvcGFjaXR5PSIwLjUiIGN4PSIxNiIgY3k9IjYiIHI9IjIiPjwvY2lyY2xlPgogICAgICAgICAgICA8Y2lyY2xlIGlkPSJPdmFsLUNvcHkiIGZpbGw9IiMwRUJEOEMiIG9wYWNpdHk9IjAuNzUiIGN4PSIxNiIgY3k9IjQiIHI9IjIiPjwvY2lyY2xlPgogICAgICAgICAgICA8Y2lyY2xlIGlkPSJPdmFsIiBmaWxsPSIjMEVCRDhDIiBjeD0iMTYiIGN5PSIyIiByPSIyIj48L2NpcmNsZT4KICAgICAgICAgICAgPHBhdGggZD0iTTExLjMzNTk3MzksMi4yMDk3ODgyNSBMOC4yNSw0LjIwOTk1NjQ5IEw4LjI1LDMuMDUgQzguMjUsMi4wNDQ4ODIyNyA3LjQ2ODU5MDMxLDEuMjUgNi41LDEuMjUgTDIuMDUsMS4yNSBDMS4wMzgwNzExOSwxLjI1IDAuMjUsMi4wMzgwNzExOSAwLjI1LDMuMDUgTDAuMjUsNyBDMC4yNSw3Ljk2MzY5OTM3IDEuMDQyMjQ5MTksOC43NTU5NDg1NiAyLjA1LDguOCBMNi41LDguOCBDNy40NTA4MzAwOSw4LjggOC4yNSw3Ljk3MzI3MjUgOC4yNSw3IEw4LjI1LDUuODU4NDUyNDEgTDguNjI4NjIzOTQsNi4wODU2MjY3NyBMMTEuNDI2Nzc2Nyw3Ljc3MzIyMzMgQzExLjQzNjg5NDMsNy43ODMzNDA5MSAxMS40NzU3NjU1LDcuOCAxMS41LDcuOCBDMTEuNjMzNDkzMiw3LjggMTEuNzUsNy42OTEyNjAzNCAxMS43NSw3LjU1IEwxMS43NSwyLjQgQzExLjc1LDIuNDE4MzgyNjkgMTEuNzIxOTAyOSwyLjM1MjgyMjgyIDExLjY4NTYyNjgsMi4yNzg2MjM5NCBDMTEuNjEyOTUyOCwyLjE1NzUwMDY5IDExLjQ3MDc5NjgsMi4xMjkwNjk1IDExLjMzNTk3MzksMi4yMDk3ODgyNSBaIiBpZD0idmlkZW9fMzdfIiBzdHJva2Utb3BhY2l0eT0iMC4xNSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjAuNSIgZmlsbD0iIzRENEQ0RCI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+';
const blockIconURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iNDBweCIgaGVpZ2h0PSI0MHB4IiB2aWV3Qm94PSIwIDAgNDAgNDAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjIgKDY3MTQ1KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5FeHRlbnNpb25zL1NvZnR3YXJlL1ZpZGVvLVNlbnNpbmctQmxvY2s8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZyBpZD0iRXh0ZW5zaW9ucy9Tb2Z0d2FyZS9WaWRlby1TZW5zaW5nLUJsb2NrIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2Utb3BhY2l0eT0iMC4xNSI+CiAgICAgICAgPGcgaWQ9InZpZGVvLW1vdGlvbiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsIDEwLjAwMDAwMCkiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMDAwMDAwIj4KICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC1Db3B5IiBmaWxsPSIjRkZGRkZGIiBvcGFjaXR5PSIwLjI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGN4PSIzMiIgY3k9IjE2IiByPSI0LjUiPjwvY2lyY2xlPgogICAgICAgICAgICA8Y2lyY2xlIGlkPSJPdmFsLUNvcHkiIGZpbGw9IiNGRkZGRkYiIG9wYWNpdHk9IjAuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjeD0iMzIiIGN5PSIxMiIgcj0iNC41Ij48L2NpcmNsZT4KICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC1Db3B5IiBmaWxsPSIjRkZGRkZGIiBvcGFjaXR5PSIwLjc1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGN4PSIzMiIgY3k9IjgiIHI9IjQuNSI+PC9jaXJjbGU+CiAgICAgICAgICAgIDxjaXJjbGUgaWQ9Ik92YWwiIGZpbGw9IiNGRkZGRkYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY3g9IjMyIiBjeT0iNCIgcj0iNC41Ij48L2NpcmNsZT4KICAgICAgICAgICAgPHBhdGggZD0iTTIyLjY3MTk0NzcsNC40MTk1NzY0OSBMMTYuNSw4LjQxOTkxMjk4IEwxNi41LDYuMSBDMTYuNSw0LjA4OTc2NDU0IDE0LjkzNzE4MDYsMi41IDEzLDIuNSBMNC4xLDIuNSBDMi4wNzYxNDIzNywyLjUgMC41LDQuMDc2MTQyMzcgMC41LDYuMSBMMC41LDE0IEMwLjUsMTUuOTI3Mzk4NyAyLjA4NDQ5ODM5LDE3LjUxMTg5NzEgNC4xLDE3LjYgTDEzLDE3LjYgQzE0LjkwMTY2MDIsMTcuNiAxNi41LDE1Ljk0NjU0NSAxNi41LDE0IEwxNi41LDExLjcxNjkwNDggTDIyLjc1NzI0NzksMTUuNDcxMjUzNSBMMjIuODUzNTUzNCwxNS41NDY0NDY2IEMyMi44NzM3ODg2LDE1LjU2NjY4MTggMjIuOTUxNTMxLDE1LjYgMjMsMTUuNiBDMjMuMjY2OTg2NSwxNS42IDIzLjUsMTUuMzgyNTIwNyAyMy41LDE1LjEgTDIzLjUsNC44IEMyMy41LDQuODM2NzY1MzggMjMuNDQzODA1OCw0LjcwNTY0NTYzIDIzLjM3MTI1MzUsNC41NTcyNDc4OCBDMjMuMjI1OTA1Niw0LjMxNTAwMTM5IDIyLjk0MTU5MzcsNC4yNTgxMzg5OSAyMi42NzE5NDc3LDQuNDE5NTc2NDkgWiIgaWQ9InZpZGVvXzM3XyIgZmlsbD0iIzRENEQ0RCI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+';

(function (Scratch) {
  "use strict";

  const runtime = Scratch.vm.runtime;
  const renderer = Scratch.vm.renderer;
  const videoDevice = runtime.ioDevices.video;

  /**
   * States the video can be set to.
   * @readonly
   * @enum {string}
   */
  const VideoState = {
    /** Video turned off. */
    OFF: "off",
    /** Video turned on with default y axis mirroring. */
    ON: "on",
    /** Video turned on without default y axis mirroring. */
    ON_FLIPPED: "on-flipped",
  };

  // ----- Faces (from Face Sensing) -----

  /**
   * @typedef {'rightEye'|'leftEye'|'noseTip'|'mouthCenter'|'rightEarTragion'|'leftEarTragion'} KeypointName
   */
  /**
   * @typedef Face
   * @property {number[]} nose Scratch coordinate
   * @property {number[]} mouth Scratch coordinate
   * @property {number[]} leftEye Scratch coordinate
   * @property {number[]} rightEye Scratch coordinate
   * @property {number[]} betweenEyes Scratch coordinate
   * @property {number[]} leftEar Scratch coordinate
   * @property {number[]} rightEar Scratch coordinate
   * @property {number[]} topOfHead Scratch coordinate
   * @property {number} size Scratch size
   * @property {number} tilt Scratch direction
   */

  /** @type {Face|null} */
  let lastFace = null;
  let isFaceCurrentlyDetected = false;

  /**
   * @param {number} x Coordinate in video space (horizontally flipped)
   * @param {number} y Coordinate in video space
   * @returns {number[]} x, y in Scratch space
   */
  const videoSpaceToScratchSpace = (x, y) => [240 - x, 180 - y];

  const updateFace = (blazefaceFace) => {
    const getKeyPointInScratchSpace = (name) => {
      const keypoint = blazefaceFace.keypoints.find((i) => i.name === name);
      return videoSpaceToScratchSpace(keypoint.x, keypoint.y);
    };
    const nose = getKeyPointInScratchSpace("noseTip");
    const mouth = getKeyPointInScratchSpace("mouthCenter");
    const rightEye = getKeyPointInScratchSpace("rightEye");
    const leftEye = getKeyPointInScratchSpace("leftEye");
    const betweenEyes = [
      (rightEye[0] + leftEye[0]) / 2,
      (rightEye[1] + leftEye[1]) / 2,
    ];
    const leftEar = getKeyPointInScratchSpace("leftEarTragion");
    const rightEar = getKeyPointInScratchSpace("rightEarTragion");
    // Using the width as the size seems to match what Scratch does.
    const size = Math.round(blazefaceFace.box.width);
    // The ears give the horizontal direction, and so the tilt.
    const horizontalDirection = [rightEar[0] - leftEar[0], rightEar[1] - leftEar[1]];
    const tiltRadians = Math.atan2(horizontalDirection[1], horizontalDirection[0]);
    const tilt = Math.round(90 - (tiltRadians * 180) / Math.PI);
    // From the horizontal direction we can compute the normalized up direction.
    const upDirection = [-horizontalDirection[1], horizontalDirection[0]];
    const upMagnitude = Math.sqrt(upDirection[0] ** 2 + upDirection[1] ** 2);
    upDirection[0] /= upMagnitude;
    upDirection[1] /= upMagnitude;
    // Approximate the top of the head by going up from the center of the eyes.
    const topOfHead = [
      betweenEyes[0] + upDirection[0] * size * 0.35,
      betweenEyes[1] + upDirection[1] * size * 0.35,
    ];
    lastFace = {
      nose,
      mouth,
      rightEar,
      leftEar,
      betweenEyes,
      leftEye,
      rightEye,
      topOfHead,
      size,
      tilt,
    };
  };

  const FACE_OPCODES = new Set([
    "videoSensing_goToPart",
    "videoSensing_pointInFaceTiltDirection",
    "videoSensing_setSizeToFaceSize",
    "videoSensing_whenTilted",
    "videoSensing_whenSpriteTouchesPart",
    "videoSensing_whenFaceDetected",
    "videoSensing_faceIsDetected",
    "videoSensing_faceTilt",
    "videoSensing_faceSize",
  ]);
  // Whether the project has face blocks (null: look again). The face detector (about 2 MB of libraries) is loaded,
  // and faces are looked for, only then and while the camera is on.
  let faceBlocksUsed = null;
  const projectUsesFaceBlocks = () => {
    if (faceBlocksUsed === null) {
      faceBlocksUsed = runtime.targets.some(
        (target) =>
          target.isOriginal &&
          Object.values(target.blocks._blocks).some((block) => FACE_OPCODES.has(block.opcode))
      );
    }
    return faceBlocksUsed;
  };
  runtime.on("PROJECT_LOADED", () => {
    faceBlocksUsed = null;
  });
  runtime.on("PROJECT_CHANGED", () => {
    if (!faceBlocksUsed) faceBlocksUsed = null;
  });

  let detector = null;
  let detectorLoading = false;
  let detectorFailed = false;
  const loadDetector = () => {
    if (detector || detectorLoading || detectorFailed) return;
    detectorLoading = true;
    initializeDetector()
      .then((loaded) => {
        detector = loaded;
      })
      .catch((e) => {
        console.error("Face sensing detector could not load", e);
        detectorFailed = true;
        // shows "Could not load face detection" in the palette
        Scratch.vm.extensionManager.refreshBlocks("videoSensing").catch(() => {});
      })
      .then(() => {
        detectorLoading = false;
      });
  };

  // Goal is 15 estimations per second, which seems to match Scratch. Going faster or slower makes the
  // "when touching x" blocks behave differently, so want to match if possible.
  const estimationLoop = () => {
    let timeoutFinished = false;
    let estimationFinished = false;
    runtime.pmSetTimeout(() => {
      timeoutFinished = true;
      if (estimationFinished) {
        estimationLoop();
      }
    }, 1000 / 15);
    const frame = projectUsesFaceBlocks()
      ? videoDevice.getFrame({
          format: "canvas",
        })
      : null;
    if (frame) loadDetector();
    if (!frame || !detector) {
      isFaceCurrentlyDetected = false;
      estimationFinished = true;
      return;
    }
    detector
      .estimateFaces(frame, {
        flipHorizontal: true,
      })
      .then((faces) => {
        if (faces.length > 0) {
          isFaceCurrentlyDetected = true;
          updateFace(faces[0]);
        } else {
          isFaceCurrentlyDetected = false;
        }
      })
      .catch((error) => {
        console.error(error);
        isFaceCurrentlyDetected = false;
      })
      .then(() => {
        estimationFinished = true;
        if (timeoutFinished) {
          estimationLoop();
        }
      });
  };
  estimationLoop();

  // Desktop fork (section 127): without a detected face every face hat answers false
  let pmWasDetected = false;
  runtime.on("RUNTIME_STEP_START", () => {
    if (isFaceCurrentlyDetected || pmWasDetected) runtime.pmEdgeHatsChanged("videoSensingFace");
    pmWasDetected = isFaceCurrentlyDetected;
  });

  /**
   * @param {unknown} part Part from Scratch blocks
   * @returns {number[]|null}
   */
  const getPart = (part) => {
    part = Scratch.Cast.toNumber(part);
    if (part === 0) {
      return lastFace.leftEye;
    } else if (part === 1) {
      return lastFace.rightEye;
    } else if (part === 2) {
      return lastFace.nose;
    } else if (part === 3) {
      return lastFace.mouth;
    } else if (part === 4) {
      return lastFace.leftEar;
    } else if (part === 5) {
      return lastFace.rightEar;
    } else if (part === 6) {
      return lastFace.betweenEyes;
    } else if (part === 7) {
      return lastFace.topOfHead;
    } else {
      return null;
    }
  };

  // a face block ran: the project uses faces (also for blocks the scan above did not see yet)
  const usingFaces = () => {
    faceBlocksUsed = true;
  };

  // ----- Video frames as images (from Camera Sensing+) -----

  const frameCanvas = document.createElement("canvas");

  class CameraSensing {
    constructor() {
      // Video Sensing's motion part (scratch3_video_sensing/motion.js)
      this.motion = new VideoMotionSensing(runtime);
      // the size of the images "video frame as data URL" answers; negative flips
      this._frameSize = [480, 360];
      // sprites showing the video instead of their costume: drawable ID -> their own skin ID
      this._spriteSkins = new Map();
      /**
       * A flag to determine if this extension has been installed in a project.
       * It is set to false the first time getInfo is run.
       * @type {boolean}
       */
      this.firstInstall = true;
      // Configure the video device with values from globally stored locations.
      runtime.on("PROJECT_LOADED", this.updateVideoDisplay.bind(this));
    }

    // The stage keeps the video state and transparency (saved in the project; also read by Scenes).
    get globalVideoTransparency() {
      const stage = runtime.getTargetForStage();
      if (stage) {
        return stage.videoTransparency;
      }
      return 50;
    }

    set globalVideoTransparency(transparency) {
      const stage = runtime.getTargetForStage();
      if (stage) {
        stage.videoTransparency = transparency;
      }
    }

    get globalVideoState() {
      const stage = runtime.getTargetForStage();
      if (stage) {
        return stage.videoState;
      }
      // Though the default value for the stage is normally 'on', we need to default
      // to 'off' here to prevent the video device from briefly activating
      // while waiting for stage targets to be installed that say it should be off
      return VideoState.OFF;
    }

    set globalVideoState(state) {
      const stage = runtime.getTargetForStage();
      if (stage) {
        stage.videoState = state;
      }
    }

    /**
     * Use the video state and transparency stored in the project.
     */
    updateVideoDisplay() {
      this.setVideoTransparency({
        TRANSPARENCY: this.globalVideoTransparency,
      });
      this.videoToggle({
        VIDEO_STATE: this.globalVideoState,
      });
    }

    getInfo() {
      // Set the video display properties to defaults the first time getInfo is run. This turns on the video
      // device when it is first added to a project, and is overwritten by a PROJECT_LOADED event listener that
      // later calls updateVideoDisplay
      if (this.firstInstall) {
        this.globalVideoState = VideoState.ON;
        this.globalVideoTransparency = 50;
        this.updateVideoDisplay();
        this.firstInstall = false;
      }

      return {
        id: "videoSensing",
        name: "Camera Sensing",
        blockIconURI,
        menuIconURI,
        blocks: [
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Camera",
          },
          {
            opcode: "videoToggle",
            blockType: Scratch.BlockType.COMMAND,
            text: "turn video [VIDEO_STATE]",
            arguments: {
              VIDEO_STATE: {
                type: Scratch.ArgumentType.STRING,
                menu: "VIDEO_STATE",
                defaultValue: VideoState.ON,
              },
            },
          },
          {
            opcode: "setVideoTransparency",
            blockType: Scratch.BlockType.COMMAND,
            text: "set video transparency to [TRANSPARENCY]",
            arguments: {
              TRANSPARENCY: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 50,
              },
            },
          },
          // from Camera Sensing+
          {
            opcode: "showVideoOn",
            blockType: Scratch.BlockType.COMMAND,
            text: "set video on [TARGET] to [ON_OFF]",
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              ON_OFF: {
                type: Scratch.ArgumentType.STRING,
                menu: "shownHidden",
                defaultValue: "on",
              },
            },
          },
          {
            opcode: "whenVideoTurns",
            blockType: Scratch.BlockType.EVENT,
            isEdgeActivated: false,
            text: "when video turns [ON_OFF]",
            arguments: {
              ON_OFF: {
                type: Scratch.ArgumentType.STRING,
                menu: "onOff",
                defaultValue: "on",
              },
            },
          },
          {
            opcode: "isVideoOn",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "video on?",
          },
          "---",
          {
            opcode: "videoFrame",
            blockType: Scratch.BlockType.REPORTER,
            text: "video frame as data URL",
            disableMonitor: true,
          },
          {
            opcode: "setFrameSize",
            blockType: Scratch.BlockType.COMMAND,
            text: "set video frame size to width [WIDTH] height [HEIGHT]",
            arguments: {
              WIDTH: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 480,
              },
              HEIGHT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 360,
              },
            },
          },
          {
            opcode: "frameSize",
            blockType: Scratch.BlockType.REPORTER,
            text: "video frame [W_H]",
            disableMonitor: true,
            arguments: {
              W_H: {
                type: Scratch.ArgumentType.STRING,
                menu: "widthHeight",
              },
            },
          },
          {
            opcode: "cameraSize",
            blockType: Scratch.BlockType.REPORTER,
            text: "camera [W_H]",
            disableMonitor: true,
            arguments: {
              W_H: {
                type: Scratch.ArgumentType.STRING,
                menu: "widthHeight",
              },
            },
          },
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Motion",
          },
          {
            opcode: "whenMotionGreaterThan",
            blockType: Scratch.BlockType.HAT,
            pmEdgeHat: { signals: ["videoSensing"] }, // PMDESKTOP_EDGEHATS (section 127)
            text: "when video motion > [REFERENCE]",
            arguments: {
              REFERENCE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10,
              },
            },
          },
          {
            opcode: "videoOn",
            blockType: Scratch.BlockType.REPORTER,
            text: "video [ATTRIBUTE] on [SUBJECT]",
            arguments: {
              ATTRIBUTE: {
                type: Scratch.ArgumentType.STRING,
                menu: "ATTRIBUTE",
                defaultValue: VideoMotionSensing.SensingAttribute.MOTION,
              },
              SUBJECT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SUBJECT",
                defaultValue: VideoMotionSensing.SensingSubject.SPRITE,
              },
            },
          },
          // from Face Sensing
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Face",
          },
          ...(detectorFailed
            ? [
                {
                  blockType: Scratch.BlockType.LABEL,
                  text: Scratch.translate({
                    default: "Could not load face detection",
                    description: "Error message that appears when using unsupported browser",
                  }),
                },
              ]
            : []),
          {
            opcode: "goToPart",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("go to [PART]"),
            arguments: {
              PART: {
                type: Scratch.ArgumentType.STRING,
                menu: "part",
              },
            },
          },
          {
            opcode: "pointInFaceTiltDirection",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("point in direction of face tilt"),
          },
          {
            opcode: "setSizeToFaceSize",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("set size to face size"),
          },
          "---",
          {
            opcode: "whenTilted",
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            pmEdgeHat: { signals: ["videoSensingFace"] }, // Desktop fork (section 127)
            text: Scratch.translate("when face tilts [DIRECTION]"),
            arguments: {
              DIRECTION: {
                type: Scratch.ArgumentType.STRING,
                menu: "direction",
              },
            },
          },
          {
            opcode: "whenSpriteTouchesPart",
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            pmEdgeHat: { signals: ["videoSensingFace"] }, // Desktop fork (section 127)
            text: Scratch.translate("when this sprite touches a [PART]"),
            arguments: {
              PART: {
                type: Scratch.ArgumentType.STRING,
                menu: "part",
              },
            },
          },
          {
            opcode: "whenFaceDetected",
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            pmEdgeHat: { signals: ["videoSensingFace"] }, // Desktop fork (section 127)
            text: Scratch.translate("when a face is detected"),
          },
          "---",
          {
            opcode: "faceIsDetected",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("a face is detected?"),
            disableMonitor: true,
          },
          {
            opcode: "faceTilt",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("face tilt"),
          },
          {
            opcode: "faceSize",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("face size"),
          },
        ],
        menus: {
          VIDEO_STATE: {
            acceptReporters: true,
            items: [
              { text: "off", value: VideoState.OFF },
              { text: "on", value: VideoState.ON },
              { text: "on flipped", value: VideoState.ON_FLIPPED },
            ],
          },
          ATTRIBUTE: {
            acceptReporters: true,
            items: [
              { text: "motion", value: VideoMotionSensing.SensingAttribute.MOTION },
              { text: "direction", value: VideoMotionSensing.SensingAttribute.DIRECTION },
            ],
          },
          SUBJECT: {
            acceptReporters: true,
            items: [
              { text: "sprite", value: VideoMotionSensing.SensingSubject.SPRITE },
              { text: "stage", value: VideoMotionSensing.SensingSubject.STAGE },
            ],
          },
          targets: { acceptReporters: true, items: "_getTargets" },
          onOff: { acceptReporters: true, items: ["on", "off"] },
          shownHidden: {
            acceptReporters: true,
            items: [
              { text: "shown", value: "on" },
              { text: "hidden", value: "off" },
            ],
          },
          widthHeight: { acceptReporters: true, items: ["width", "height"] },
          // These menus were all designed to be compatible with Scratch
          // That's why no reporters and why the values are somewhat arbitrary
          part: {
            acceptReporters: false,
            items: [
              { text: Scratch.translate("nose"), value: "2" },
              { text: Scratch.translate("mouth"), value: "3" },
              { text: Scratch.translate("left eye"), value: "0" },
              { text: Scratch.translate("right eye"), value: "1" },
              { text: Scratch.translate("between eyes"), value: "6" },
              { text: Scratch.translate("left ear"), value: "4" },
              { text: Scratch.translate("right ear"), value: "5" },
              { text: Scratch.translate("top of head"), value: "7" },
            ],
          },
          direction: {
            acceptReporters: false, // compatibility with Scratch
            items: [
              { text: Scratch.translate("left"), value: "left" },
              { text: Scratch.translate("right"), value: "right" },
            ],
          },
        },
      };
    }

    _getTargets() {
      const spriteNames = [
        { text: "myself", value: "_myself_" },
        { text: "Stage", value: "_stage_" },
      ];
      const targets = runtime.targets;
      for (let i = 1; i < targets.length; i++) {
        const target = targets[i];
        if (target.isOriginal) spriteNames.push({ text: target.getName(), value: target.getName() });
      }
      return spriteNames;
    }

    // ----- Camera -----

    videoToggle(args) {
      const state = Scratch.Cast.toString(args.VIDEO_STATE);
      const wasOn = !!(videoDevice.provider && videoDevice.provider.enabled);
      this.globalVideoState = state;
      if (state === VideoState.OFF) {
        videoDevice.disableVideo();
      } else {
        videoDevice.enableVideo();
        // Mirror if state is ON. Do not mirror if state is ON_FLIPPED.
        videoDevice.mirror = state === VideoState.ON;
      }
      const isOn = state !== VideoState.OFF;
      if (isOn !== wasOn) {
        runtime.startHats("videoSensing_whenVideoTurns", { ON_OFF: isOn ? "on" : "off" });
      }
    }

    setVideoTransparency(args) {
      const transparency = Scratch.Cast.toNumber(args.TRANSPARENCY);
      this.globalVideoTransparency = transparency;
      videoDevice.setPreviewGhost(transparency);
    }

    // The video in place of a sprite's costume, or the stage's video layer shown or hidden.
    showVideoOn(args, util) {
      const name = Scratch.Cast.toString(args.TARGET);
      const show = Scratch.Cast.toString(args.ON_OFF) === "on";
      if (name === "_stage_") {
        if (videoDevice._drawable !== -1) renderer.updateDrawableVisible(videoDevice._drawable, show);
        return;
      }
      const target = name === "_myself_" ? util.target : runtime.getSpriteTargetByName(name);
      if (!target || target.isStage) return;
      const drawableID = target.drawableID;
      if (show) {
        if (videoDevice._skinId === -1) return;
        if (!this._spriteSkins.has(drawableID)) {
          this._spriteSkins.set(drawableID, renderer._allDrawables[drawableID].skin.id);
        }
        // Desktop fork (section 129): the renderer's setter, so the touching cache and the transform are updated
        renderer.updateDrawableSkinId(drawableID, videoDevice._skinId);
      } else if (this._spriteSkins.has(drawableID)) {
        renderer.updateDrawableSkinId(drawableID, this._spriteSkins.get(drawableID));
        this._spriteSkins.delete(drawableID);
        target.updateAllDrawableProperties();
        // to avoid stretching issues
        const oldScale = target.size;
        target.setSize(-1);
        target.setSize(oldScale);
      }
    }

    isVideoOn() {
      return videoDevice.videoReady;
    }

    videoFrame() {
      const width = Math.round(Math.abs(this._frameSize[0]));
      const height = Math.round(Math.abs(this._frameSize[1]));
      if (!width || !height) return "";
      const frame = videoDevice.getFrame({ format: "canvas", dimensions: [width, height] });
      if (!frame) return "";
      frameCanvas.width = width;
      frameCanvas.height = height;
      const context = frameCanvas.getContext("2d");
      context.save();
      if (this._frameSize[0] < 0) {
        context.translate(width, 0);
        context.scale(-1, 1);
      }
      if (this._frameSize[1] < 0) {
        context.translate(0, height);
        context.scale(1, -1);
      }
      context.drawImage(frame, 0, 0, width, height);
      context.restore();
      return frameCanvas.toDataURL("image/png");
    }

    setFrameSize(args) {
      this._frameSize = [Scratch.Cast.toNumber(args.WIDTH), Scratch.Cast.toNumber(args.HEIGHT)];
    }

    frameSize(args) {
      return this._frameSize[Scratch.Cast.toString(args.W_H) === "height" ? 1 : 0];
    }

    // the camera's own resolution (0 while the video is off)
    cameraSize(args) {
      const video = videoDevice.videoReady && videoDevice.provider && videoDevice.provider.video;
      if (!video) return 0;
      return Scratch.Cast.toString(args.W_H) === "height" ? video.videoHeight : video.videoWidth;
    }

    // ----- Motion -----

    whenMotionGreaterThan(args, util) {
      return this.motion.whenMotionGreaterThan(args, util);
    }

    videoOn(args, util) {
      return this.motion.videoOn(args, util);
    }

    // ----- Face -----

    goToPart(args, util) {
      usingFaces();
      if (!isFaceCurrentlyDetected) {
        return;
      }
      const part = getPart(args.PART);
      if (!part) {
        return;
      }
      util.target.setXY(part[0], part[1]);
    }

    pointInFaceTiltDirection(args, util) {
      usingFaces();
      if (isFaceCurrentlyDetected) {
        util.target.setDirection(lastFace.tilt);
      }
    }

    setSizeToFaceSize(args, util) {
      usingFaces();
      if (isFaceCurrentlyDetected) {
        util.target.setSize(lastFace.size);
      }
    }

    whenTilted(args) {
      usingFaces();
      if (!isFaceCurrentlyDetected) {
        return false;
      }
      const direction = Scratch.Cast.toString(args.DIRECTION);
      if (direction === "left") {
        return lastFace.tilt < 80;
      } else if (direction === "right") {
        return lastFace.tilt > 100;
      } else {
        return false;
      }
    }

    whenSpriteTouchesPart(args, util) {
      usingFaces();
      if (!isFaceCurrentlyDetected) {
        return false;
      }
      const part = getPart(args.PART);
      if (!part) {
        return false;
      }
      const drawable = renderer._allDrawables[util.target.drawableID];
      if (!drawable) {
        return false;
      }
      drawable.updateCPURenderAttributes();
      return drawable.isTouching(part);
    }

    whenFaceDetected() {
      usingFaces();
      return isFaceCurrentlyDetected;
    }

    faceIsDetected() {
      usingFaces();
      return isFaceCurrentlyDetected;
    }

    faceTilt() {
      usingFaces();
      return lastFace ? lastFace.tilt : 0;
    }

    faceSize() {
      usingFaces();
      return lastFace ? lastFace.size : 0;
    }
  }

  Scratch.extensions.register(new CameraSensing());
})(Scratch);
});

const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const BlockShape = require('../../extension-support/block-shape');
const Cast = require('../../util/cast');

class TailgatingExtension {
  constructor(runtime) {
    /**
     * The runtime instantiating this block package.
     * @type {Runtime}
     */
    this.runtime = runtime;

    this.trackers = Object.create(null);
    this.maxSaving = Object.create(null);
    this.positions = Object.create(null);

    const shouldSaveNewPosition = (positionsList, tracker) => {
      const firstPos = positionsList[0];
      if (typeof firstPos !== "object") return true;
      if (firstPos.x !== tracker.x || firstPos.y !== tracker.y) {
        return true;
      }
      return false;
    };

    this.runtime.on('RUNTIME_STEP_START', () => {
      for (const trackerName in this.trackers) {
        const tracker = this.trackers[trackerName];
        // happens when sprite is deleted or clone is deleted
        if (tracker.isDisposed) {
          this.stopTrackingSprite({ NAME: trackerName });
          continue;
        }
        // 0 positions should be saved, so just dont make them at all
        const positions = this.positions[trackerName];
        const maxPositions = this.maxSaving[trackerName];
        if (maxPositions <= 0) continue;
        // only track new positions when they have changed
        // we have no reason to track the same position multiple times (that would make this ext useless)
        if (shouldSaveNewPosition(positions, tracker)) {
          // console.log('saved new pos for', trackerName);
          positions.unshift({ x: tracker.x, y: tracker.y });
        }
        this.positions[trackerName] = positions.slice(0, maxPositions);
      }
    });
  }

  getInfo() {
    return {
      id: "jgTailgating",
      name: "Tailgating",
      blocks: [
        {
          opcode: "startTrackingSprite",
          blockType: BlockType.COMMAND,
          text: "start tracking [SPRITE] as [NAME]",
          arguments: {
            SPRITE: {
              type: ArgumentType.STRING,
              menu: "spriteMenu",
            },
            NAME: {
              type: ArgumentType.STRING,
              defaultValue: "leader",
            }
          },
        },
        {
          opcode: "stopTrackingSprite",
          blockType: BlockType.COMMAND,
          text: "stop tracking [NAME]",
          arguments: {
            NAME: {
              type: ArgumentType.STRING,
              defaultValue: "leader",
            }
          },
        },
        '---',
        {
          opcode: "followSprite",
          blockType: BlockType.COMMAND,
          text: "follow [INDEX] positions behind [NAME]",
          arguments: {
            INDEX: {
              type: ArgumentType.NUMBER,
              defaultValue: 20,
            },
            NAME: {
              type: ArgumentType.STRING,
              defaultValue: "leader",
            }
          },
        },
        {
          opcode: "savePositionsBehindSprite",
          blockType: BlockType.COMMAND,
          text: "set max saved positions behind [NAME] to [MAX]",
          arguments: {
            MAX: {
              type: ArgumentType.NUMBER,
              defaultValue: 20,
            },
            NAME: {
              type: ArgumentType.STRING,
              defaultValue: "leader",
            }
          },
        },
        {
          opcode: "getSpriteFollowPos",
          blockShape: BlockShape.SQUARE, // Desktop fork (section 318): type shapes, its answer is always JSON text
          blockType: BlockType.REPORTER,
          disableMonitor: true,
          text: "get position [INDEX] behind [NAME]",
          arguments: {
            INDEX: {
              type: ArgumentType.NUMBER,
              defaultValue: 20,
            },
            NAME: {
              type: ArgumentType.STRING,
              defaultValue: "leader",
            }
          },
        },
      ],
      menus: {
        spriteMenu: '_getSpriteMenu'
      },
    };
  }

  // menus
  _getSpriteMenu() {
    const emptyMenu = [{ text: '', value: '' }];
    const sprites = [];
    if (this.runtime.vm.editingTarget && !this.runtime.vm.editingTarget.isStage) {
      sprites.push({ text: 'this sprite', value: '_myself_' });
    }
    const editing = this.runtime.vm.editingTarget;
    const editingName = editing && !editing.isStage ? editing.getName() : null;
    for (const name of this.runtime.getSpriteNames()) {
      if (name === editingName) continue;
      sprites.push({
        text: name,
        value: name
      });
    }
    return sprites.length > 0 ? sprites : emptyMenu;
  }

  // blocks
  startTrackingSprite(args, util) {
    const spriteName = Cast.toString(args.SPRITE);
    const trackerName = Cast.toString(args.NAME);
    const pickedSprite = this.runtime.getTargetFromMenu(spriteName, util.target);
    if (!pickedSprite) return;
    this.trackers[trackerName] = pickedSprite;
    this.positions[trackerName] = [];
    if (!(trackerName in this.maxSaving)) {
      this.maxSaving[trackerName] = 20;
    }
  }
  stopTrackingSprite(args) {
    const trackerName = Cast.toString(args.NAME);
    delete this.trackers[trackerName];
    this.positions[trackerName] = [];
  }

  followSprite(args, util) {
    const trackerName = Cast.toString(args.NAME);
    const index = Cast.toNumber(args.INDEX);
    const spritePositions = this.positions[trackerName];
    if (!spritePositions) return;
    let position = spritePositions[index];
    if (typeof position !== "object") {
      // this index position was not found
      // use the last one in the list instead

      // if there is nothing in the list, dont do anything
      if (spritePositions.length <= 0) return;
      position = spritePositions[spritePositions.length - 1];
    }
    util.target.setXY(position.x, position.y);
  }
  getSpriteFollowPos(args) {
    const trackerName = Cast.toString(args.NAME);
    const index = Cast.toNumber(args.INDEX);
    const spritePositions = this.positions[trackerName];
    if (!spritePositions) return '{}';
    let position = spritePositions[index];
    if (typeof position !== "object") {
      // this index position was not found
      // use the last one in the list instead

      // if there is nothing in the list, dont do anything
      if (spritePositions.length <= 0) return '{}';
      position = spritePositions[spritePositions.length - 1];
    }
    return JSON.stringify({
      x: position.x,
      y: position.y
    });
  }
  savePositionsBehindSprite(args, util) {
    const trackerName = Cast.toString(args.NAME);
    const maxPositions = Cast.toNumber(args.MAX);
    let max = Math.round(maxPositions);
    if (max <= 0) {
      max = 0;
    }
    if (max > 0) {
      max++;
    }
    this.maxSaving[trackerName] = max;
  }
}

module.exports = TailgatingExtension;
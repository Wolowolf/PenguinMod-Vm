/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the PenguinMod gallery's qxsck/big-decimal.js, moved into
// the VM as a built-in extension. The code is the gallery file, changed only where marked "Desktop fork" (round: no endless loop;
// section 259: whole numbers are added, subtracted, multiplied, raised to a power, divided with remainder and compared
// with native big integers directly, with the same answers, instead of going through the decimal text form).
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
// Desktop fork (section 154): random numbers and the clock come from the runtime: Math.random, Date.now,
// performance.now and new Date() are Scratch.vm.runtime.pmRandom / pmDateNow / pmPerfNow (new Date(pmDateNow())).
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
(function (Scratch) {
  "use strict";
  Scratch.translate.setup({
    zh: {
      "Big Decimal": "高精度运算",

      '🗂️Settings': '🗂️设置',
      "📏Arithmetic": "📏运算",
      "🔎Logic": "🔎逻辑",
      "🧪Math": "🧪数学",

      "set max precision to [NUM]": '设置最大精度为 [NUM]',

      "round [NUM] to [NUM2] decimal places": '四舍五入 [NUM] 到第 [NUM2] 位小数',
      "[OPER] of [NUM]": '[OPER] ( [NUM] )',
      '[OPER] of [NUM] and [NUM2]': '[OPER] ( [NUM] , [NUM2] )',
      "pick random [NUM] to [NUM2]": '获取从 [NUM] 到 [NUM2] 的随机数',
    },
  });
  // Desktop fork (section 259): a whole number written plainly ("-12", "007"), as text or as a number. For these the
  // blocks below answer exactly what the decimal code answers, but straight from native big integers.
  const WHOLE = /^-?\d+$/;
  const wholeOf = (value) => {
    const text = String(value);
    return WHOLE.test(text) ? BigInt(text) : null;
  };
  // Desktop fork (section 259): the patterns of removeLeft / removeRight, made once instead of on every call
  const edgePatterns = new Map();
  const edgePattern = (side, pattern) => {
    const key = side + pattern;
    let regex = edgePatterns.get(key);
    if (!regex) {
      regex = new RegExp(side === "left" ? "^" + pattern + "+" : pattern + "+$");
      edgePatterns.set(key, regex);
    }
    return regex;
  };
  class bigNumber {
    constructor() {
      this.maxPrecision = 100;

      this.tenTimes = function (val) {
        return 10n ** BigInt(val);
      };
      this.times = function (val, num) {
        return val.repeat(num);
      };
      this.toNum = function (val) {
        return isNaN(Number(val)) ? 0 : Number(val);
      };
      this.removeLeft = function (str, pattern) {
        return str.replace(edgePattern("left", pattern), ""); // Desktop fork (section 259)
      };
      this.removeRight = function (str, pattern) {
        return str.replace(edgePattern("right", pattern), ""); // Desktop fork (section 259)
      };
      this.formatNum = function (result, len) {
        result = String(result);
        let flag = 0;
        if (result.startsWith("-")) {
          result = result.replace("-", "");
          flag = 1;
        }
        result = this.times("0", len * 2) + result;
        let int = result.slice(0, result.length - len),
          dec = result.slice(result.length - len);
        int = this.removeLeft(int, '0');
        dec = this.removeRight(dec, '0');
        if (int === "") int = "0";
        dec = dec === "" ? "" : "." + dec;
        let result_ = int + dec;
        result_ = (flag ? "-" : "") + result_;
        return result_;
      };

      this.toBigNumber = function (num) {
        let str = String(num),
          P = str.indexOf(".");
        P = P === -1 ? str.length - 1 : P;
        let noDecNumber = str.replace(".", "");
        let try_ = Number(noDecNumber);
        let [str_, len_] = isNaN(try_)
          ? ["0", 0]
          : noDecNumber.indexOf(".") === -1
            ? [noDecNumber, str.length - P - 1]
            : ["0", 0];
        return {
          num: BigInt(str_),
          len: len_,
        };
      };
      this.toSamePer = function (num, num2) {
        let a = this.toBigNumber(num),
          b = this.toBigNumber(num2);
        let len = Math.max(a.len, b.len);
        if (len === a.len) b.num = b.num * this.tenTimes(len - b.len);
        else a.num = a.num * this.tenTimes(len - a.len);
        a.len = b.len = len;
        return {
          num: a,
          num2: b,
        };
      };

      this.addFunc = function (num, num2) {
        // Desktop fork (section 259): whole numbers directly
        const wa = wholeOf(num), wb = wa === null ? null : wholeOf(num2);
        if (wb !== null) return String(wa + wb);
        let { num: a, num2: b } = this.toSamePer(num, num2);
        let result = a.num + b.num;
        let num_ = this.formatNum(result, a.len);
        return this.roundFunc(num_, this.maxPrecision);
      };
      this.subFunc = function (num, num2) {
        const wa = wholeOf(num), wb = wa === null ? null : wholeOf(num2); // Desktop fork (section 259)
        if (wb !== null) return String(wa - wb);
        let { num: a, num2: b } = this.toSamePer(num, num2);
        let result = a.num - b.num;
        let num_ = this.formatNum(result, a.len);
        return this.roundFunc(num_, this.maxPrecision);
      };
      this.mulFunc = function (num, num2) {
        const wa = wholeOf(num), wb = wa === null ? null : wholeOf(num2); // Desktop fork (section 259)
        if (wb !== null) return String(wa * wb);
        let { num: a, num2: b } = this.toSamePer(num, num2);
        let result = a.num * b.num;
        let num_ = this.formatNum(result, a.len * 2);
        return this.roundFunc(num_, this.maxPrecision);
      };
      this.divFunc = function (num, num2) {
        let { num: a, num2: b } = this.toSamePer(num, num2);
        if (b.num === 0n) return Infinity;
        let result = (a.num * this.tenTimes(this.maxPrecision + 1)) / b.num;
        return this.formatNum(result, this.maxPrecision + 1);
      };
      this.powFunc = function (num, num2) {
        let a = this.toBigNumber(num),
          b = Math.trunc(this.toNum(num2)),
          flag = 0;
        if (a.num === 0n) return '0';
        else if (b.num === 0n) return '1';
        // Desktop fork (section 259): a whole number to a power of at least 0 directly (b is already a whole number)
        if (a.len === 0 && b >= 0) return String(a.num ** BigInt(b));
        if (b < 0) (flag = 1), (b = -b);
        let result = a.num ** BigInt(b);
        let num_;
        if (!flag) num_ = this.formatNum(result, a.len * b);
        else num_ = this.divFunc("1", this.formatNum(result, a.len * b));
        return this.roundFunc(num_, this.maxPrecision);
      };
      this.modFunc = function (num, num2) {
        const wa = wholeOf(num), wb = wa === null ? null : wholeOf(num2); // Desktop fork (section 259)
        if (wb !== null) return wb === 0n ? '0' : String(wa % wb);
        let { num: a, num2: b } = this.toSamePer(num, num2);
        if (b.num === 0n) return '0';
        let result = a.num % b.num;
        let num_ = this.formatNum(result, a.len);
        return this.roundFunc(num_, this.maxPrecision);
      };

      this.absFunc = function (num) {
        return num.replace('-', '');
      }
      this.maxMinFunc = function (oper, num, num2) {
        let a, b;
        switch (oper) {
          case 'max':
            ({ num: a, num2: b } = this.toSamePer(num, num2));
            return a.num < b.num ? num2 : num;
          case 'min':
            ({ num: a, num2: b } = this.toSamePer(num, num2));
            return a.num > b.num ? num2 : num;
        }
      };
      this.roundFunc = function (num, num2) {
        let a = this.toBigNumber(num),
          round = Math.trunc(this.toNum(num2)),
          flag = a.num >= 0n;
        if (round >= a.len) {
          return this.formatNum(a.num, a.len);
        }
        // Desktop fork: one division by a power of ten instead of one per place (the same result; a large
        // negative number of places looped for ages). Dividing by more places than the number has digits gives 0.
        const drop = a.len - round - 1;
        if (drop >= (a.num < 0n ? -a.num : a.num).toString().length) a.num = 0n;
        else if (drop > 0) a.num = a.num / 10n ** BigInt(drop);
        let lastNum = a.num % 10n, flag2;
        a.num = a.num / 10n;
        if (flag) {
          flag2 = lastNum % 10n >= 5n;
          a.num = a.num + BigInt(flag2);
        }
        else {
          flag2 = lastNum % 10n <= -5n;
          a.num = a.num - BigInt(flag2);
        }
        if (a.num !== 0n) for (let i = 0; i < a.len - round; i++) a.num = a.num * 10n;
        return this.formatNum(a.num, a.len);
      };
      this.randomFunc = function (num, num2) {
        let { num: a, num2: b } = this.toSamePer(num, num2);
        let aa = this.formatNum(a.num, a.len),
          bb = this.formatNum(b.num, b.len),
          temp1 = aa, temp2 = bb,
          per = a.len;
        aa = this.maxMinFunc('min', temp1, temp2);
        bb = this.maxMinFunc('max', temp1, temp2);
        let random_ = String(Scratch.vm.runtime.pmRandom());
        random_ = this.roundFunc(random_, 10);
        let nums = this.toSamePer(aa, random_),
          nums2 = this.toSamePer(bb, random_);
        a = nums.num, b = nums2.num, random_ = nums.num2;
        a = this.formatNum(a.num, a.len),
          b = this.formatNum(b.num, b.len),
          random_ = this.formatNum(random_.num, random_.len);
        let different = this.mulFunc(this.subFunc(b, a), random_),
          randomNum = this.addFunc(different, a);
        return this.roundFunc(randomNum, per);
      };
      this.sqrtFunc = function (x) {
        if (x <= '0') {
          return '0';
        }
        let last = '0';
        let res = '1';
        while (true) {
          last = res;
          res = this.divFunc(this.addFunc(res, this.divFunc(x, res)), '2');
          if (
            this.roundFunc(res, Math.trunc(this.maxPrecision / 2.5)) ===
            this.roundFunc(last, Math.trunc(this.maxPrecision / 2.5))
          ) break;
        }
        return res;
      }

      this.formatMessage = function (id) {
        return Scratch.translate({ id: id, default: id });
      };
    }

    getInfo() {
      return {
        id: "qxsckbignumber",
        name: this.formatMessage("Big Decimal"),
        color1: "#ff8c3b",
        blocks: [
          {
            blockType: "label",
            text: this.formatMessage("🗂️Settings"),
          },
          {
            opcode: "setPrecision",
            blockType: Scratch.BlockType.COMMAND,
            text: this.formatMessage("set max precision to [NUM]"),
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "100",
              },
            },
          },
          {
            blockType: "label",
            text: this.formatMessage("📏Arithmetic"),
          },
          {
            opcode: "add",
            blockType: Scratch.BlockType.REPORTER,
            text: "[NUM] + [NUM2]",
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.2",
              },
            },
          },
          {
            opcode: "sub",
            blockType: Scratch.BlockType.REPORTER,
            text: "[NUM] - [NUM2]",
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.2",
              },
            },
          },
          {
            opcode: "mul",
            blockType: Scratch.BlockType.REPORTER,
            text: "[NUM] * [NUM2]",
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.2",
              },
            },
          },
          {
            opcode: "div",
            blockType: Scratch.BlockType.REPORTER,
            text: "[NUM] / [NUM2]",
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.3",
              },
            },
          },
          {
            opcode: "pow",
            blockType: Scratch.BlockType.REPORTER,
            text: "[NUM] ** [NUM2]",
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "2",
              },
            },
          },
          {
            opcode: "mod",
            blockType: Scratch.BlockType.REPORTER,
            text: "[NUM] % [NUM2]",
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.3",
              },
            },
          },
          {
            blockType: "label",
            text: this.formatMessage("🔎Logic"),
          },
          {
            opcode: "lt",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[NUM] < [NUM2]",
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.2",
              },
            },
          },
          {
            opcode: "le",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[NUM] ≤ [NUM2]",
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.2",
              },
            },
          },
          {
            opcode: "gt",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[NUM] > [NUM2]",
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.2",
              },
            },
          },
          {
            opcode: "ge",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[NUM] ≥ [NUM2]",
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.2",
              },
            },
          },
          {
            opcode: "eq",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[NUM] = [NUM2]",
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.2",
              },
            },
          },
          {
            opcode: "neq",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[NUM] ≠ [NUM2]",
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.2",
              },
            },
          },
          {
            blockType: "label",
            text: this.formatMessage("🧪Math"),
          },
          {
            opcode: "unaryOper",
            blockType: Scratch.BlockType.REPORTER,
            text: this.formatMessage("[OPER] of [NUM]"),
            arguments: {
              OPER: {
                type: Scratch.ArgumentType.STRING,
                menu: "unaryOper.List",
              },
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "-0.1",
              },
            },
          },
          {
            opcode: "binaryOper",
            blockType: Scratch.BlockType.REPORTER,
            text: this.formatMessage("[OPER] of [NUM] and [NUM2]"),
            arguments: {
              OPER: {
                type: Scratch.ArgumentType.STRING,
                menu: "binaryOper.List",
              },
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "-0.1",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.1",
              },
            },
          },
          {
            opcode: "round",
            blockType: Scratch.BlockType.REPORTER,
            text: this.formatMessage("round [NUM] to [NUM2] decimal places"),
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "123.45",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "1",
              },
            },
          },
          {
            opcode: "random",
            blockType: Scratch.BlockType.REPORTER,
            text: this.formatMessage("pick random [NUM] to [NUM2]"),
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0.999",
              },
              NUM2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "1.001",
              },
            },
          },
        ],
        menus: {
          "unaryOper.List": {
            items: ["abs", "ceil", "floor", 'trunc', 'sqrt',],
          },
          "binaryOper.List": {
            items: ["max", "min",],
          },
        },
      };
    }

    replaceString(str, str2, index) {
      return str.slice(0, index) + str2 + str.slice(index + 1);
    }

    setPrecision(args) {
      let num = Number(args.NUM);
      num = Math.trunc(num);
      if (num < 0) num = 0;
      this.maxPrecision = num;
    }

    add(args) {
      return this.addFunc(args.NUM, args.NUM2);
    }
    sub(args) {
      return this.subFunc(args.NUM, args.NUM2);
    }
    mul(args) {
      return this.mulFunc(args.NUM, args.NUM2);
    }
    div(args) {
      return this.divFunc(args.NUM, args.NUM2);
    }
    pow(args) {
      return this.powFunc(args.NUM, args.NUM2);
    }
    mod(args) {
      return this.modFunc(args.NUM, args.NUM2);
    }

    // Desktop fork (section 259): the comparisons compare two whole numbers directly
    compareOf(args) {
      const wa = wholeOf(args.NUM), wb = wa === null ? null : wholeOf(args.NUM2);
      if (wb !== null) return { a: wa, b: wb };
      let { num: a, num2: b } = this.toSamePer(args.NUM, args.NUM2);
      return { a: a.num, b: b.num };
    }
    lt(args) {
      const { a, b } = this.compareOf(args);
      return a < b;
    }
    le(args) {
      const { a, b } = this.compareOf(args);
      return a <= b;
    }
    gt(args) {
      const { a, b } = this.compareOf(args);
      return a > b;
    }
    ge(args) {
      const { a, b } = this.compareOf(args);
      return a >= b;
    }
    eq(args) {
      const { a, b } = this.compareOf(args);
      return a === b;
    }
    neq(args) {
      const { a, b } = this.compareOf(args);
      return a !== b;
    }

    unaryOper(args) {
      let oper = args.OPER,
        str = String(args.NUM);
      switch (oper) {
        case 'abs':
          return this.absFunc(str);
        case 'ceil':
          if (str.indexOf('-') !== -1) {
            if (str.indexOf('.') !== -1)
              str = this.replaceString(str, '0', str.indexOf('.') + 1);
            return this.roundFunc(str, 0);
          } else {
            if (str.indexOf('.') !== -1)
              str = this.replaceString(str, '9', str.indexOf('.') + 1);
            return this.roundFunc(str, 0);
          }
        case 'floor':
          if (str.indexOf('-') !== -1) {
            if (str.indexOf('.') !== -1)
              str = this.replaceString(str, '9', str.indexOf('.') + 1);
            return this.roundFunc(str, 0);
          } else {
            if (str.indexOf('.') !== -1)
              str = this.replaceString(str, '0', str.indexOf('.') + 1);
            return this.roundFunc(str, 0);
          }
        case 'trunc':
          if (str.indexOf('.') !== -1)
            str = this.replaceString(str, '0', str.indexOf('.') + 1);
          return this.roundFunc(str, 0);
        case 'sqrt':
          return this.sqrtFunc(str);
      }
    }
    binaryOper(args) {
      let oper = args.OPER,
        str = String(args.NUM),
        str2 = String(args.NUM2);
      switch (oper) {
        case 'max':
          return this.maxMinFunc('max', str, str2);
        case 'min':
          return this.maxMinFunc('min', str, str2);
      }
    }
    round(args) {
      return this.roundFunc(args.NUM, args.NUM2);
    }
    random(args) {
      return this.randomFunc(args.NUM, args.NUM2);
    }
  }
  Scratch.extensions.register(new bigNumber());
})(Scratch);
});

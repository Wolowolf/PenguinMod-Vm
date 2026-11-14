/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the TurboWarp gallery's true-fantom/math.js as its build makes it, moved into
// the VM as a built-in extension. The code is the gallery file unchanged.
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Math
// ID: truefantommath
// Description: A lot of operators blocks, from exponentiation to trigonometric functions.
// By: TrueFantom <https://scratch.mit.edu/users/TrueFantom/>
// License: MIT

/* generated l10n code */Scratch.translate.setup({"de":{"_Math":"Mathe"},"fi":{"_Math":"Matematiikka","_[A] exactly contains [B]?":"[A] sisältää tarkalleen [B]?","_is float [A]?":"onko [A] liukuluku?","_is safe number [A]?":"onko luku [A] turvallinen?","_map [A] from range [m1] - [M1] to range [m2] - [M2]":"muunna [A] väliltä [m1] – [M1] välille [m2] – [M2]","_sign of [A]":"luvun [A] etumerkki","_true [OPERATOR] [NUM]":"tosi [OPERATOR] [NUM]"},"it":{"_Math":"Matematica","_[A] exactly contains [B]?":"[A] contiene sequenza [B]","_is float [A]?":"[A] virgola mobile","_is safe number [A]?":"[A] numero primo sicuro","_map [A] from range [m1] - [M1] to range [m2] - [M2]":"mappa [A] da range [m1] - [M1] a range [m2] - [M2]","_sign of [A]":"segno di [A]","_true [OPERATOR] [NUM]":"valore reale di [OPERATOR] di [NUM]"},"ja":{"_Math":"数学","_[A] exactly contains [B]?":"[A]が確かに[B]を含んでいる","_is float [A]?":"[A]が小数","_is safe number [A]?":"[A]が安全な数字","_map [A] from range [m1] - [M1] to range [m2] - [M2]":"[A]の[m1]から[M1]までの範囲を[m2]から[M2]までの範囲にする"},"ko":{"_Math":"수학","_[A] exactly contains [B]?":"[A]이(가) [B]을(를) 정확히 포함하는가?","_is float [A]?":"[A]이(가) 부동소수점인가?","_is safe number [A]?":"[A]이(가) 안전한 숫자인가?","_map [A] from range [m1] - [M1] to range [m2] - [M2]":"[A] 값의 [m1] - [M1] 범위를 [m2] - [M2] 범위에 대응"},"nb":{"_Math":"Matte"},"nl":{"_Math":"Wiskunde"},"ru":{"_Math":"Математика","_[A] exactly contains [B]?":"[A] содержит именно [B]?","_is float [A]?":"[A] число?","_is safe number [A]?":"[A] безопасное число?","_map [A] from range [m1] - [M1] to range [m2] - [M2]":"карта [A] из расстояния [m1] - [M1] до расстояния [m2] - [M2]","_sign of [A]":"знак [A]","_true [OPERATOR] [NUM]":"правда [OPERATOR] [NUM] "},"uk":{"_Math":"Математика"},"zh-cn":{"_Math":"数学","_[A] exactly contains [B]?":"[A]真的包含 [B]？","_is float [A]?":"[A]是小数？","_is safe number [A]?":"[A]可被精确表示？","_map [A] from range [m1] - [M1] to range [m2] - [M2]":"将[A]从范围[m1]-[M1]映射到范围[m2]-[M2]","_sign of [A]":"[A]的函数符号","_true [OPERATOR] [NUM]":"精确[OPERATOR][NUM]"}});/* end generated l10n code */((Scratch) => {
  "use strict";

  const icon =
    "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIyMjUuMzU0OCIgaGVpZ2h0PSIyMjUuMzU0OCIgdmlld0JveD0iMCwwLDIyNS4zNTQ4LDIyNS4zNTQ4Ij48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMjA3LjMyMjgsLTY3LjMyMjYpIj48ZyBkYXRhLXBhcGVyLWRhdGE9InsmcXVvdDtpc1BhaW50aW5nTGF5ZXImcXVvdDs6dHJ1ZX0iIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLWRhc2hhcnJheT0iIiBzdHJva2UtZGFzaG9mZnNldD0iMCIgc3R5bGU9Im1peC1ibGVuZC1tb2RlOiBub3JtYWwiPjxwYXRoIGQ9Ik0yMDcuMzIyODEsMTgwYzAsLTYyLjIzMDAxIDUwLjQ0NzM5LC0xMTIuNjc3NCAxMTIuNjc3NCwtMTEyLjY3NzRjNjIuMjMwMDEsMCAxMTIuNjc3NCw1MC40NDczOSAxMTIuNjc3NCwxMTIuNjc3NGMwLDYyLjIzMDAxIC01MC40NDczOSwxMTIuNjc3NCAtMTEyLjY3NzQsMTEyLjY3NzRjLTYyLjIzMDAxLDAgLTExMi42Nzc0LC01MC40NDczOSAtMTEyLjY3NzQsLTExMi42Nzc0eiIgZmlsbD0iIzU5YzA1OSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJNMzk0LjEzMDk3LDEzMi41MDkyN2wtMzUuMjQ3NTIsLTAuMDQ5MjNjLTAuOTQyMDgsNDEuNDQ4ODkgLTIxLjE1OTAxLDk0LjU5NzU0IDcuNDYwMzgsOTQuMjEzMzljMTAuNTAwMTgsLTAuNDQ4MTggMTEuMDYzNDgsLTE2LjA2MTEgMTAuODI1NjgsLTI2LjMwNTE4bDE5LjIyODE0LDEzLjM2NjY3YzAsMTIuNDIwOTQgLTEwLjE0MTgxLDM0Ljg1MjU0IC0zNS4xMTE3NCwzNC4wMjAyYy0xNS4xNzQwMywtMC4xMjgwNSAtMjkuNDQ4NjIsLTExLjI0NDA4IC0yOS44MzI3OCwtMzAuMTk1NjJjMC41MTIyLC0yOC40OTEzMyA2LjMwODAyLC01Ni4zMDg4OSA3Ljk3MjY3LC04NS4zNzY0NWwtMjYuMDA4NDUsLTAuNTY0MjhjLTcuNTU1LDgyLjQ2NDggLTEwLjI2NjU3LDExNS40OTYxIC0zNC41MzIyMiwxMTYuMzI4NDNjLTcuNjgzMDYsLTAuMzIwMTIgLTE0Ljc4OTg4LC01LjgyNjMyIC0xNS41NTgxOSwtMTQuNzg5ODhjLTIuMTEyODQsLTE1LjgxNDI5IDMwLjY5MjYxLC0yNS4xNTk4MSAzMS44NDUwNiwtMTAyLjI0NjQ3Yy0zMS42OTI2MSwtMy41MjE0IC0zMS44MDU0NSwxNS42ODQwMyAtMzcuMTgzNTgsMjEuNzY2NDVsLTE0LjM4NjA2LC0xLjU4NDE1YzE4Ljc2NTU4LC00NC45NDMyNiA5LjQ1ODI5LC0zOS4xMTU4NCAxNTAuNzY1MTIsLTM4LjQzMTM1eiIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjNTljMDU5IiBzdHJva2Utd2lkdGg9IjIuNSIvPjwvZz48L2c+PC9zdmc+PCEtLXJvdGF0aW9uQ2VudGVyOjExMi42NzcxOTQ5OTk5OTk5ODoxMTIuNjc3NDA1LS0+";

  const cast = Scratch.Cast;

  const toNaNNumber = (value) => {
    // If value is already a number we don't need to coerce it with
    // Number().
    if (typeof value === "number") {
      // Scratch treats NaN as 0, when needed as a number, but it shouldn't be here
      // E.g., 0 + NaN -> 0.
      return value;
    }
    const n = Number(value);
    // Scratch treats NaN as 0, when needed as a number, but it shouldn't be here
    // E.g., 0 + NaN -> 0.
    return n;
  };

  const isTrueInt = (val) => {
    // Values that are already numbers.
    if (typeof val === "number") {
      if (isNaN(val)) {
        // NaN is considered an integer.
        return true;
      }
      // True if it's "round" (e.g., 2.0 and 2).
      return val === Math.floor(val);
    } else if (typeof val === "boolean") {
      // `True` and `false` always represent integer after Scratch cast.
      return true;
    } else if (typeof val === "string") {
      // If it contains a decimal point, don't consider it an int, but it shouldn't be here
      const n = Number(val);
      if (isNaN(n)) {
        // NaN is considered an integer.
        return true;
      }
      // True if it's "round" (e.g., 2.0 and 2).
      return n === Math.floor(n);
    }
    return false;
  };

  class ScratchMath {
    getInfo() {
      return {
        id: "truefantommath",
        name: Scratch.translate("Math"),

        color1: "#59c059",

        menuIconURI: icon,

        blocks: [
          {
            opcode: "negative_block",
            blockType: Scratch.BlockType.REPORTER,
            text: "- [A]",
            arguments: {
              A: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
            extensions: ["colours_operators"],
          },
          "---",
          {
            opcode: "almost_equal_block",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[A] ≈ [B]",
            arguments: {
              A: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              B: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 50,
              },
            },
            extensions: ["colours_operators"],
          },
          {
            opcode: "not_almost_equal_block",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[A] ≉ [B]",
            arguments: {
              A: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              B: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 50,
              },
            },
            extensions: ["colours_operators"],
          },
          "---",
          {
            opcode: "exactly_cont_block",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("[A] exactly contains [B]?"),
            arguments: {
              A: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "apple",
              },
              B: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "a",
              },
            },
            extensions: ["colours_operators"],
          },
          "---",
          {
            opcode: "sign_of",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("sign of [A]"),
            arguments: {
              A: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0.1,
              },
            },
            extensions: ["colours_operators"],
          },
          {
            opcode: "scale_block",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate(
              "map [A] from range [m1] - [M1] to range [m2] - [M2]"
            ),
            arguments: {
              A: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              m1: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "0",
              },
              M1: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "100",
              },
              m2: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "0",
              },
              M2: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "1",
              },
            },
            extensions: ["colours_operators"],
          },
          "---",
          {
            opcode: "true_math_op",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("true [OPERATOR] [NUM]"),
            arguments: {
              OPERATOR: {
                type: Scratch.ArgumentType.STRING,
                menu: "OPERATOR",
              },
              NUM: {
                type: Scratch.ArgumentType.NUMBER,
              },
            },
            extensions: ["colours_operators"],
          },
          "---",
          {
            opcode: "is_safe_number_block",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("is safe number [A]?"),
            arguments: {
              A: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
            extensions: ["colours_operators"],
          },
          "---",
          {
            opcode: "is_float_block",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("is float [A]?"),
            arguments: {
              A: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
            extensions: ["colours_operators"],
          },
        ],
        menus: {
          OPERATOR: {
            acceptReporters: true,
            items: ["sin", "cos", "tan", "asin", "acos", "atan"],
          },
        },
      };
    }

    negative_block({ A }) {
      return 0 - cast.toNumber(A);
    }
    almost_equal_block({ A, B }) {
      const c = cast.compare(A, B);
      return c <= 0.5 && c >= -0.5;
    }
    not_almost_equal_block({ A, B }) {
      const c = cast.compare(A, B);
      return !(c <= 0.5 && c >= -0.5);
    }
    exactly_cont_block({ A, B }) {
      return cast.toString(A).includes(cast.toString(B));
    }
    sign_of({ A }) {
      return Math.sign(cast.toNumber(A));
    }
    scale_block({ A, m1, M1, m2, M2 }) {
      return (
        ((cast.toNumber(A) - cast.toNumber(m1)) *
          (cast.toNumber(M2) - cast.toNumber(m2))) /
          (cast.toNumber(M1) - cast.toNumber(m1)) +
        cast.toNumber(m2)
      );
    }
    true_math_op(args) {
      const operator = cast.toString(args.OPERATOR).toLowerCase();
      const n = cast.toNumber(args.NUM);
      switch (operator) {
        case "sin":
          return Math.sin(n);
        case "cos":
          return Math.cos(n);
        case "tan":
          return Math.tan(n);
        case "asin":
          return Math.asin(n);
        case "acos":
          return Math.acos(n);
        case "atan":
          return Math.atan(n);
        default:
          return 0;
      }
    }
    is_safe_number_block({ A }) {
      return Number.isSafeInteger(cast.toNumber(A));
    }
    is_float_block({ A }) {
      return !isTrueInt(A) && !Number.isNaN(toNaNNumber(A));
    }
  }

  Scratch.extensions.register(new ScratchMath());
})(Scratch);
});

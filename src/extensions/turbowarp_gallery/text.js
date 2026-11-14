/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the TurboWarp gallery's text.js as its build makes it, moved into
// the VM as a built-in extension. The code is the gallery file, changed only where marked "Desktop fork" (count regex: an invalid pattern counts 0;
// section 259: the blocks that duplicate built-in ones are removed and Text Case's extra cases are added to the case menu).
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
// Desktop fork (section 154): random numbers and the clock come from the runtime: Math.random, Date.now,
// performance.now and new Date() are Scratch.vm.runtime.pmRandom / pmDateNow / pmPerfNow (new Date(pmDateNow())).
module.exports = require('../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Text
// ID: strings
// Description: Manipulate characters and text.
// By: CST1229 <https://scratch.mit.edu/users/CST1229/>
// By: BludIsAnLemon <https://scratch.mit.edu/users/BludIsAnLemon/>
// By: Man-o-Valor <https://scratch.mit.edu/users/man-o-valor/>
// License: MIT AND MPL-2.0

/* generated l10n code */Scratch.translate.setup({"es":{"_Text":"Texto"},"fi":{"_Exactly Title Case":"Alkukirjaimet Tarkasti Isolla","_MiXeD CaSe":"IsOt jA PiEnEt kIrJaImEt sEkAiSiN","_RAndoMCaSe":"SATuNnaiNEn KirJaInKoKO","_Sentence case":"Virkkeen alkukirjain isolla","_Text":"Teksti","_Title Case":"Alkukirjaimet Isolla","_UPPERCASE":"ISOT KIRJAIMET","_apple":"omena","_both sides":"molemmilta puolilta","_camelCase":"karavaaniTyyli","_convert [STRING] to [TEXTCASE]":"muunna [STRING] muotoon [TEXTCASE]","_count regex /[REGEX]/[FLAGS] in [STRING]":"laske säännöllinen lauseke /[REGEX]/[FLAGS] merkkijonossa [STRING]","_is [STRING] [TEXTCASE]?":"onko [STRING] muodossa [TEXTCASE]?","_item [ITEM] of [STRING] matched by regex /[REGEX]/[FLAGS]":"merkkijonon [STRING] [ITEM]. kohde, joka vastaa säännöllistä lauseketta /[REGEX]/[FLAGS]","_item [ITEM] of [STRING] split by [SPLIT]":"[ITEM]. kohde merkkijonosta [STRING] jaettuna merkillä [SPLIT]","_lowercase":"pienet kirjaimet","_repeat [STRING] [REPEAT] times":"toista [STRING] [REPEAT] kertaa","_replace regex /[REGEX]/[FLAGS] in [STRING] with [REPLACE]":"korvaa säännöllinen lauseke /[REGEX]/[FLAGS] merkkijonossa [STRING] lausekkeella [REPLACE]","_reverse text [STRING]":"teksti [STRING] käänteisenä","_the end":"lopusta","_the start":"alusta","_trim whitespace [STRING] from [METHOD]":"poista turhat sanavälit merkkijonon [STRING] [METHOD]"},"he":{"_Text":"טקסט"},"hu":{"_Text":"Szöveg"},"it":{"_Exactly Title Case":"Maiuscolo stile Titolo Esatto","_MiXeD CaSe":"MaIuScOlO MiSto","_RAndoMCaSe":"MaiUSCoLoCaSUaLe","_Sentence case":"Maiuscolo come frase","_Text":"Testo","_Title Case":"Maiuscolo stile TItolo","_UPPERCASE":"MAIUSCOLO","_apple":"mela","_both sides":"entrambi i lati","_camelCase":"maiuscoleInterne","_convert [STRING] to [TEXTCASE]":"converti [STRING] in [TEXTCASE]","_count regex /[REGEX]/[FLAGS] in [STRING]":"numero occorrenze di regex /[REGEX]/[FLAGS] in [STRING]","_is [STRING] [TEXTCASE]?":"[STRING] è [TEXTCASE]","_item [ITEM] of [STRING] matched by regex /[REGEX]/[FLAGS]":"elemento [ITEM] di [STRING] corrispondente a regex /[REGEX]/[FLAGS]","_item [ITEM] of [STRING] split by [SPLIT]":"elemento [ITEM] di [STRING] spezzata da [SPLIT]","_lowercase":"minuscolo","_repeat [STRING] [REPEAT] times":"ripeti [STRING] [REPEAT] volte","_replace regex /[REGEX]/[FLAGS] in [STRING] with [REPLACE]":"sostituisci regex /[REGEX]/[FLAGS] in [STRING] con [REPLACE]","_reverse text [STRING]":"inverti testo [STRING]","_the end":"la fine","_the start":"l'inizio","_trim whitespace [STRING] from [METHOD]":"Rimuovi spazi bianchi di [STRING] da [METHOD]"},"ja":{"_Exactly Title Case":"正確なタイトルケース","_MiXeD CaSe":"ミックスケース","_RAndoMCaSe":"ランダムケース","_Sentence case":"センテンスケース","_Text":"テキスト","_Title Case":"タイトルケース","_UPPERCASE":"大文字","_apple":"りんご","_camelCase":"キャメルケース","_convert [STRING] to [TEXTCASE]":"[STRING]を[TEXTCASE]に変換する","_is [STRING] [TEXTCASE]?":"[STRING]が[TEXTCASE]","_item [ITEM] of [STRING] split by [SPLIT]":"[STRING]を[SPLIT]で区切ったときの[ITEM]番目","_lowercase":"小文字","_repeat [STRING] [REPEAT] times":"[STRING]を[REPEAT]回繰り返す"},"ko":{"_Exactly Title Case":"정확한 제목 표기법 (Abc Abc)","_MiXeD CaSe":"섞인 표기법 (AbC AbCd)","_Text":"텍스트","_Title Case":"제목 표기법 (Abc Abc)","_UPPERCASE":"대문자 표기법 (ABC)","_convert [STRING] to [TEXTCASE]":"[STRING]을(를) [TEXTCASE](으)로 변환하기","_count regex /[REGEX]/[FLAGS] in [STRING]":"[STRING]에서 정규표현식 /[REGEX]/[FLAGS] 의 결과 개수","_is [STRING] [TEXTCASE]?":"[STRING]이(가) [TEXTCASE]인가?","_item [ITEM] of [STRING] matched by regex /[REGEX]/[FLAGS]":"[STRING]에서 정규표현식 /[REGEX]/[FLAGS] 의 [ITEM]번째 결과","_item [ITEM] of [STRING] split by [SPLIT]":"[STRING]을(를) [SPLIT](으)로 나눈 것의 [ITEM]번째","_lowercase":"소문자 표기법 (abc)","_repeat [STRING] [REPEAT] times":"[STRING] 문자열 [REPEAT]번 반복","_replace regex /[REGEX]/[FLAGS] in [STRING] with [REPLACE]":"정규표현식 /[REGEX]/[FLAGS] (으)로 [STRING]을(를) [REPLACE](으)로 바꾸기"},"nb":{"_Text":"Tekst"},"nl":{"_Exactly Title Case":"Alleen Beginhoofdletters","_MiXeD CaSe":"DoOr eLkAaR","_Text":"Tekst","_Title Case":"Alles Met Beginhoofdletter","_UPPERCASE":"HOOFDLETTERS","_apple":"appel","_convert [STRING] to [TEXTCASE]":"zet [STRING] om naar [TEXTCASE]","_count regex /[REGEX]/[FLAGS] in [STRING]":"aantal overeenkomsten van regex /[REGEX]/[FLAGS] met [STRING]","_item [ITEM] of [STRING] matched by regex /[REGEX]/[FLAGS]":"item [ITEM] van [STRING] waarmee regex /[REGEX]/[FLAGS] overeenkomt","_item [ITEM] of [STRING] split by [SPLIT]":"item [ITEM] van [STRING] gesplitst door [SPLIT]","_lowercase":"kleine letters","_repeat [STRING] [REPEAT] times":"herhaal [STRING] [REPEAT] keer","_replace regex /[REGEX]/[FLAGS] in [STRING] with [REPLACE]":"vervang regex /[REGEX]/[FLAGS] in [STRING] door [REPLACE]"},"pl":{"_Text":"Tekst"},"pt-br":{"_Text":"Texto"},"ru":{"_Exactly Title Case":"Настоящий Тайтл Кейс","_MiXeD CaSe":"СмЕшАнНыЙ КеЙс","_RAndoMCaSe":"СЛуЧайнЫЙРеГисТР","_Sentence case":"Смысловой регистр","_Text":"Текст","_Title Case":"Тайтл Кейс","_UPPERCASE":"ВЕРХНИЙ РЕГИСТР","_apple":"яблоко","_both sides":"обе стороны","_camelCase":"Регистр верблюда","_convert [STRING] to [TEXTCASE]":"сконвертировать строку [STRING] в [TEXTCASE]","_count regex /[REGEX]/[FLAGS] in [STRING]":"посчитать regex /[REGEX]/[FLAGS] в [STRING]","_is [STRING] [TEXTCASE]?":"строка [STRING] это [TEXTCASE]?","_item [ITEM] of [STRING] matched by regex /[REGEX]/[FLAGS]":"предмет [ITEM] строки [STRING] совпадающий regex'ом /[REGEX]/[FLAGS]","_item [ITEM] of [STRING] split by [SPLIT]":"предмет [ITEM] строки [STRING] распределённый [SPLIT]","_lowercase":"нижний регистр","_repeat [STRING] [REPEAT] times":"повторить [STRING] [REPEAT] раз","_replace regex /[REGEX]/[FLAGS] in [STRING] with [REPLACE]":"заменить regex /[REGEX]/[FLAGS] в [STRING] на [REPLACE]","_reverse text [STRING]":"перевернуть текст [STRING]","_the end":"конца","_the start":"начала","_trim whitespace [STRING] from [METHOD]":"обрезать пробелы [STRING] из [METHOD]"},"sl":{"_Text":"Besedilo"},"tr":{"_Text":"Metin"},"uk":{"_Exactly Title Case":"Точно Заголовком","_MiXeD CaSe":"МіШаНиМи","_RAndoMCaSe":"ВИпадКоВИМи","_Sentence case":"Речення","_Text":"Текст","_Title Case":"Заголовком","_UPPERCASE":"ВЕЛИКИМИ БУКВАМИ","_both sides":"обох сторін","_convert [STRING] to [TEXTCASE]":"зробити [STRING] [TEXTCASE]","_is [STRING] [TEXTCASE]?":"[STRING] є [TEXTCASE]?","_item [ITEM] of [STRING] split by [SPLIT]":"елемент [ITEM] у [STRING] розділеного через [SPLIT]","_lowercase":"малими буквами","_repeat [STRING] [REPEAT] times":"повторити [STRING] [REPEAT] рази","_reverse text [STRING]":"розвернути [STRING]","_the end":"початку","_the start":"кінця","_trim whitespace [STRING] from [METHOD]":"очистити пробіли у [STRING] з [METHOD]"},"zh-cn":{"_Exactly Title Case":"精确标题","_MiXeD CaSe":"混合大小写","_RAndoMCaSe":"随机大小写","_Sentence case":"句首大写","_Text":"文本","_Title Case":"标题","_UPPERCASE":"大写","_apple":"苹果","_both sides":"两边","_camelCase":"驼峰式命名","_convert [STRING] to [TEXTCASE]":"转换[STRING]为[TEXTCASE]","_count regex /[REGEX]/[FLAGS] in [STRING]":"[STRING]中匹配正则 /[REGEX]/[FLAGS]的次数","_is [STRING] [TEXTCASE]?":"[STRING]是[TEXTCASE]？","_item [ITEM] of [STRING] matched by regex /[REGEX]/[FLAGS]":"[STRING]中匹配正则 /[REGEX]/[FLAGS]的第[ITEM]个部分","_item [ITEM] of [STRING] split by [SPLIT]":"以[SPLIT]分割[STRING]后的第[ITEM]项","_lowercase":"小写","_repeat [STRING] [REPEAT] times":"重复[REPEAT]个[STRING]","_replace regex /[REGEX]/[FLAGS] in [STRING] with [REPLACE]":"将[STRING]中匹配正则 /[REGEX]/[FLAGS]的部分替换为[REPLACE]","_reverse text [STRING]":"反转文本[STRING]","_the end":"末尾","_the start":"开头","_trim whitespace [STRING] from [METHOD]":"去除[STRING]中[METHOD]的空格"}});/* end generated l10n code */(function (Scratch) {
  "use strict";

  const Cast = Scratch.Cast;

  const CaseParam = {
    LOWERCASE: "lowercase",
    UPPERCASE: "uppercase",
    MIXEDCASE: "mixedcase",
    TITLECASE: "titlecase",
    EXACTTITLECASE: "exacttitlecase",
    RANDOMCASE: "randomcase",
    SENTENCECASE: "sentencecase",
    CAMELCASE: "camelcase",
    // Desktop fork (section 259): the cases of Text Case's removed "convert to case" block that Text had not
    CAPITALIZED: "capitalized",
    FIRSTCAPITAL: "firstcapital",
    SENTENCESTARTS: "sentencestarts",
    MIXEDCASELOW: "mixedcaselow",
    MIXEDLETTERS: "mixedletters",
    MIXEDLETTERSLOW: "mixedletterslow",
    INVERTCASE: "invertcase",
  };

  let splitCache;
  let matchCache;

  class StringsExt {
    constructor() {}

    _initCaseMenu() {
      return [
        {
          text: Scratch.translate({
            default: "lowercase",
            description: "If your language has lowercase, style it accordingly",
          }),
          value: CaseParam.LOWERCASE,
        },
        {
          text: Scratch.translate({
            default: "UPPERCASE",
            description: "If your language has uppercase, style it accordingly",
          }),
          value: CaseParam.UPPERCASE,
        },
        // Desktop fork (section 259): from Text Case
        {
          text: Scratch.translate({
            default: "Capitalized",
            description: "First letter capital, all others small",
          }),
          value: CaseParam.CAPITALIZED,
        },
        {
          text: Scratch.translate({
            default: "First letter capital",
            description: "First letter capital, the others unchanged",
          }),
          value: CaseParam.FIRSTCAPITAL,
        },
        {
          text: Scratch.translate({
            default: "Sentence case",
            description:
              "Starts words after ., !, and ? with captialized letters",
          }),
          value: CaseParam.SENTENCECASE,
        },
        // Desktop fork (section 259): from Text Case
        {
          text: Scratch.translate({
            default: "Sentence starts capital",
            description: "First letter of each sentence capital, the others unchanged",
          }),
          value: CaseParam.SENTENCESTARTS,
        },
        {
          text: Scratch.translate({
            default: "Title Case",
            description:
              "If your language has Title Case, style it accordingly. 'Abc' is title case and exactly title case but 'ABC' is only title case.",
          }),
          value: CaseParam.TITLECASE,
        },
        {
          text: Scratch.translate({
            default: "Exactly Title Case",
            description:
              "If your language has Title Case, style it accordingly. 'Abc' is title case and exactly title case but 'ABC' is only title case.",
          }),
          value: CaseParam.EXACTTITLECASE,
        },
        {
          text: Scratch.translate({
            default: "MiXeD CaSe",
            description:
              "If your language has mixed case, style it accordingly",
          }),
          value: CaseParam.MIXEDCASE,
        },
        // Desktop fork (section 259): from Text Case
        {
          text: Scratch.translate({
            default: "mIxEd cAsE",
            description: "Alternating case starting small",
          }),
          value: CaseParam.MIXEDCASELOW,
        },
        {
          text: Scratch.translate({
            default: "MiXeD lEtTeRs",
            description: "Alternating case counting letters only, starting capital",
          }),
          value: CaseParam.MIXEDLETTERS,
        },
        {
          text: Scratch.translate({
            default: "mIxEd LeTtErS",
            description: "Alternating case counting letters only, starting small",
          }),
          value: CaseParam.MIXEDLETTERSLOW,
        },
        {
          text: Scratch.translate({
            default: "RAndoMCaSe",
            description:
              "If your language has randomcase, style it accordingly",
          }),
          value: CaseParam.RANDOMCASE,
        },
        // Desktop fork (section 259): from Text Case
        {
          text: Scratch.translate({
            default: "iNVERTED cASE",
            description: "Capital letters become small and small ones capital",
          }),
          value: CaseParam.INVERTCASE,
        },
        {
          text: Scratch.translate({
            default: "camelCase",
            description:
              "Removes all spaces and capitalizes all words after the first",
          }),
          value: CaseParam.CAMELCASE,
        },
      ];
    }

    getInfo() {
      return {
        // id "text" would conflict with Scratch Lab's Animated Text (lab/text.js)
        id: "strings",
        name: Scratch.translate("Text"),
        blocks: [
          {
            opcode: "split",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("item [ITEM] of [STRING] split by [SPLIT]"),
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 3,
              },
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "apple",
              },
              SPLIT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "p",
              },
            },
          },

          "---",

          {
            opcode: "repeat",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("repeat [STRING] [REPEAT] times"),
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "apple ",
              },
              REPEAT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 3,
              },
            },
          },

          "---",
          {
            opcode: "replaceRegex",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate(
              "replace regex /[REGEX]/[FLAGS] in [STRING] with [REPLACE]"
            ),
            arguments: {
              REGEX: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: ".",
              },
              FLAGS: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "g",
              },
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Hello world!",
              },
              REPLACE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "$&$&",
              },
            },
          },
          {
            opcode: "matchRegex",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate({
              default:
                "item [ITEM] of [STRING] matched by regex /[REGEX]/[FLAGS]",
              description:
                "/[REGEX]/ is supposed to match the syntax that some actual programming languages used for regular expressions.",
            }),
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1,
              },
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Hello world!",
              },
              REGEX: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "(.) (.{2})",
              },
              FLAGS: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "g",
              },
            },
          },
          {
            opcode: "countRegex",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate({
              default: "count regex /[REGEX]/[FLAGS] in [STRING]",
              description:
                "/[REGEX]/ is supposed to match the syntax that some actual programming languages used for regular expressions.",
            }),
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Hello world!",
              },
              REGEX: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "[AEIOU]",
              },
              FLAGS: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "i",
              },
            },
          },

          "---",

          {
            opcode: "isCase",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate({
              default: "is [STRING] [TEXTCASE]?",
              description: "Example block context: <is [hello] [lowercase] ?>",
            }),
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "apple",
              },
              TEXTCASE: {
                type: Scratch.ArgumentType.STRING,
                menu: "textCase",
                defaultValue: CaseParam.LOWERCASE,
              },
            },
          },
          {
            opcode: "toCase",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate({
              default: "convert [STRING] to [TEXTCASE]",
              description:
                "Example block context: (convert [HELLO] to [lowercase])",
            }),
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "apple",
              },
              TEXTCASE: {
                type: Scratch.ArgumentType.STRING,
                menu: "textCase",
                defaultValue: CaseParam.UPPERCASE,
              },
            },
          },

          "---",

          {
            opcode: "reverse",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("reverse text [STRING]"),
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("apple"),
              },
            },
          },

          "---",

          {
            opcode: "trim",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("trim whitespace [STRING] from [METHOD]"),
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: `    ${Scratch.translate("apple")}    `,
              },
              METHOD: {
                type: Scratch.ArgumentType.STRING,
                menu: "trimMethod",
              },
            },
          },
        ],
        menus: {
          textCase: {
            acceptReporters: true,
            items: this._initCaseMenu(),
          },
          trimMethod: {
            acceptReporters: true,
            items: [
              {
                text: Scratch.translate("both sides"),
                value: "both",
              },
              {
                text: Scratch.translate("the end"),
                value: "end",
              },
              {
                text: Scratch.translate("the start"),
                value: "start",
              },
            ],
          },
        },
      };
    }

    _caseInsensitiveRegex(str) {
      return new RegExp(str.replaceAll(/[^a-zA-Z0-9]/g, "\\$&"), "gi");
    }

    split(args, util) {
      const string = Cast.toString(args.STRING);
      const split = Cast.toString(args.SPLIT);
      const item = Cast.toNumber(args.ITEM);

      // Cache the last split
      if (
        !(
          splitCache &&
          splitCache.string === string &&
          splitCache.split === split
        )
      ) {
        const regex = this._caseInsensitiveRegex(split);

        splitCache = {
          string,
          split,
          arr: string.split(regex),
        };
      }
      return splitCache.arr[item - 1] || "";
    }

    repeat(args, util) {
      const string = Cast.toString(args.STRING);
      const repeat = Math.floor(Cast.toNumber(args.REPEAT));
      if (repeat < 0 || !Number.isFinite(repeat)) {
        return "";
      }
      return string.repeat(repeat);
    }

    replaceRegex(args, util) {
      try {
        const string = Cast.toString(args.STRING);
        const replacer = Cast.toString(args.REPLACE);
        const regex = Cast.toString(args.REGEX);
        const flags = Cast.toString(args.FLAGS);

        return string.replace(new RegExp(regex, flags), replacer);
      } catch (e) {
        console.error(e);
        return "";
      }
    }

    matchRegex(args, util) {
      try {
        const string = Cast.toString(args.STRING);
        const uncleanRegex = Cast.toString(args.REGEX);
        const flags = Cast.toString(args.FLAGS);
        const item = Cast.toNumber(args.ITEM);

        // Cache the last matched string
        if (
          !(
            matchCache &&
            matchCache.string === string &&
            matchCache.regex === uncleanRegex &&
            matchCache.flags === flags
          )
        ) {
          const newFlags = flags.includes("g") ? flags : flags + "g";
          const regex = new RegExp(uncleanRegex, newFlags);

          matchCache = {
            string,
            regex: uncleanRegex,
            flags,
            arr: string.match(regex) || [],
          };
        }
        return matchCache.arr[item - 1] || "";
      } catch (e) {
        console.error(e);
        // Desktop fork: forget the last match (count regex answered its count for an invalid pattern)
        matchCache = null;
        return "";
      }
    }

    countRegex(args, util) {
      // Fill cache
      // (ITEM is casted into 0,
      // but we don't care about the return value)
      this.matchRegex(args, util);
      return (matchCache && matchCache.arr.length) || 0;
    }

    isCase(args, util) {
      const string = Cast.toString(args.STRING);
      const textCase = Cast.toString(args.TEXTCASE);
      switch (textCase) {
        case CaseParam.LOWERCASE:
          return string.toLowerCase() === string;
        case CaseParam.UPPERCASE:
          return string.toUpperCase() === string;
        case CaseParam.MIXEDCASE:
          return !(
            string.toUpperCase() === string || string.toLowerCase() === string
          );
        case CaseParam.TITLECASE:
          return string.split(/\b/g).every((word) => {
            if (!word) return true;
            const titleCased = word[0].toUpperCase() + word.substring(1);
            return word === titleCased;
          });
        case CaseParam.EXACTTITLECASE:
          return string.split(/\b/g).every((word) => {
            if (!word) return true;
            const titleCased =
              word[0].toUpperCase() + word.substring(1).toLowerCase();
            return word === titleCased;
          });
        case CaseParam.CAMELCASE:
          return /^[^A-Z\s][^\s]*$/.test(string);
        case CaseParam.RANDOMCASE:
          return true;
        case CaseParam.SENTENCECASE:
          return /^[A-Z][^?.!]*(?:[?.!]\s+[A-Z][^?.!]*)*$/.test(string);
        // Desktop fork (section 259): the cases from Text Case: the text is in that case when converting it changes nothing
        case CaseParam.CAPITALIZED:
        case CaseParam.FIRSTCAPITAL:
        case CaseParam.SENTENCESTARTS:
        case CaseParam.MIXEDCASELOW:
        case CaseParam.MIXEDLETTERS:
        case CaseParam.MIXEDLETTERSLOW:
        case CaseParam.INVERTCASE:
          return string === this.toCase({ STRING: string, TEXTCASE: textCase });
        default:
          return false;
      }
    }

    toCase(args, util) {
      const string = Cast.toString(args.STRING);
      const textCase = Cast.toString(args.TEXTCASE);
      let workingText = "";
      let sentenceCapitalFlag = false;
      switch (textCase) {
        case CaseParam.LOWERCASE:
          return string.toLowerCase();
        case CaseParam.UPPERCASE:
          return string.toUpperCase();
        case CaseParam.MIXEDCASE:
          return Array.from(string)
            .map((char, index) =>
              index % 2 === 0 ? char.toUpperCase() : char.toLowerCase()
            )
            .join("");
        case CaseParam.TITLECASE:
          return string
            .split(/\b/g)
            .map((word) => {
              if (!word) return "";
              return word[0].toUpperCase() + word.substring(1);
            })
            .join("");
        case CaseParam.EXACTTITLECASE:
          return string
            .split(/\b/g)
            .map((word) => {
              if (!word) return "";
              return word[0].toUpperCase() + word.substring(1).toLowerCase();
            })
            .join("");
        case CaseParam.SENTENCECASE:
          for (let i = 0; i < string.length; i++) {
            if (
              /^\s*$/.test(string[i - 1] ?? " ") &&
              !sentenceCapitalFlag &&
              string[i].toUpperCase() != string[i].toLowerCase()
            ) {
              workingText += string[i].toUpperCase();
              sentenceCapitalFlag = true;
            } else {
              if (string[i] == "." || string[i] == "!" || string[i] == "?") {
                sentenceCapitalFlag = false;
              }
              workingText += string[i].toLowerCase();
            }
          }
          return workingText;
        case CaseParam.RANDOMCASE:
          for (let i = 0; i < string.length; i++) {
            if (Scratch.vm.runtime.pmRandom() > 0.5) {
              workingText += string[i].toUpperCase();
            } else {
              workingText += string[i].toLowerCase();
            }
          }
          return workingText;
        case CaseParam.CAMELCASE:
          for (let i = 0; i < string.length; i++) {
            if (/^\s*$/.test(string[i - 1] ?? "x")) {
              workingText += string[i].toUpperCase();
            } else {
              workingText += string[i].toLowerCase();
            }
          }
          return workingText.replace(/\s/g, "");
        // Desktop fork (section 259): the cases from Text Case (a letter is a character with a capital and a small form)
        case CaseParam.CAPITALIZED:
          return Array.from(string)
            .map((char, index) => (index === 0 ? char.toUpperCase() : char.toLowerCase()))
            .join("");
        case CaseParam.FIRSTCAPITAL:
          return Array.from(string)
            .map((char, index) => (index === 0 ? char.toUpperCase() : char))
            .join("");
        case CaseParam.SENTENCESTARTS: {
          let startOfSentence = true;
          for (const char of string) {
            if (startOfSentence) {
              workingText += char.toUpperCase();
              if (char.toUpperCase() !== char.toLowerCase()) startOfSentence = false;
            } else {
              workingText += char;
              if (char === "." || char === "!" || char === "?") startOfSentence = true;
            }
          }
          return workingText;
        }
        case CaseParam.MIXEDCASELOW:
          return Array.from(string)
            .map((char, index) => (index % 2 === 1 ? char.toUpperCase() : char.toLowerCase()))
            .join("");
        case CaseParam.MIXEDLETTERS:
        case CaseParam.MIXEDLETTERSLOW: {
          const firstUp = textCase === CaseParam.MIXEDLETTERS;
          let letters = 0;
          for (const char of string) {
            if (char.toUpperCase() === char.toLowerCase()) {
              workingText += char;
            } else {
              workingText += (letters % 2 === 0) === firstUp ? char.toUpperCase() : char.toLowerCase();
              letters++;
            }
          }
          return workingText;
        }
        case CaseParam.INVERTCASE:
          return Array.from(string)
            .map((char) => (char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase()))
            .join("");
        default:
          return string;
      }
    }
    reverse(args) {
      return Array.from(Cast.toString(args.STRING)).reverse().join("");
    }
    trim(args) {
      const STRING = Cast.toString(args.STRING);
      switch (Cast.toString(args.METHOD)) {
        case "start":
          return STRING.trimStart();
        case "end":
          return STRING.trimEnd();
        case "both":
        default:
          return STRING.trim();
      }
    }
  }

  Scratch.extensions.register(new StringsExt());
})(Scratch);
});

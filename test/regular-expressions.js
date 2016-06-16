import assert from 'assert';
import {getSubstitutionRegExp, getSmartQuotesRegExp} from '../src/regular-expressions';

describe('the getSubstitutionRegExp method', () => {
  it('should only match a word with a trailing boundary', () => {
    let {regExp} = getSubstitutionRegExp('banana');
    let shouldMatch = [
      'banana ',
      'banana-',
      'banana.',
      '-banana ',
      'banana\n',
      'banana\r.',
      '\nbanana\t',
      '‹banana›',
      '«banana»',
      '’banana–'
    ];

    let shouldNotMatch = [
      'banana',
      ' banana',
      'bananabanana',
      'helpimtrappedina-bananafactory '
    ];

    for (let candidate of shouldMatch) assert(candidate.match(regExp));
    for (let candidate of shouldNotMatch) assert(!candidate.match(regExp));
  });

  it('should match extended Unicode characters', () => {
    let candidates = [
      { match: "Čemšeniško", input: "Gospod Čižmek je odšel na Čemšeniško planino po smrekove vršičke." },
      { match: "програмни", input: "Как ми се иска всички програмни езици поддържат UTF-8."},
      { match: "救命啊", input: "救命啊! 我的气垫船装满了鳝鱼" }
    ];

    for (let {match, input} of candidates) {
      let {regExp} = getSubstitutionRegExp(match);
      assert(input.match(regExp));
    }
  });

  it('should preserve whitespace around a match', () => {
    let input = "\n\n\tshrug   \n";
    let {regExp} = getSubstitutionRegExp('shrug');
    let result = input.replace(regExp, `$1¯\\_(ツ)_/¯$2`);

    assert.equal(result, "\n\n\t¯\\_(ツ)_/¯   \n");
  });
});

describe('the getSmartQuotesRegExp method', () => {
  it('should replace straight quotes with curly quotes', () => {
    let testCases = [
      { input: `\"`, output: `\"` },
      { input: `\"\"`, output: `“\"` },
      { input: `“\"\"`, output: `“”\"` },
      { input: `“”\" `, output: `“”” ` },
      { input: `“ \" `, output: `“ “ ` },
      { input: `a\"b`, output: `a”b` },
      { input: `\"a\" `, output: `“a” ` },
      { input: `\n\"\n`, output: `\n“\n` },

      { input: `\'`, output: `\'` },
      { input: `\'\'`, output: `\'\'` },
      { input: `\'a`, output: `‘a` },
      { input: `\'a\' `, output: `‘a’ ` },
      { input: `can\'t`, output: `can\'t` },
      { input: `can\'t `, output: `can’t ` },

      { input: `\"\'who?`, output: `“‘who?` },
      { input: `here it is,\' `, output: `here it is,’ ` },
      { input: `\"O\'Doyle rules!\" `, output: `“O’Doyle rules!” ` },
      { input: `\"\'what\'s that,\' she said\" `, output: `“‘what’s that,’ she said” ` },
      { input: `end of one\" \"start of another`, output: `end of one” “start of another` }
    ];

    let replacements = getSmartQuotesRegExp();

    for (let {input, output} of testCases) {

      for (let {regExp, replacement} of replacements) {
        input = input.replace(regExp, `$1${replacement}$2`);
      }

      assert.equal(input, output);
    }
  });
});

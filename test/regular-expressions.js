import assert from 'assert';
import {getSubstitutionRegExp, getSmartQuotesRegExp, getSmartDashesRegExp} from '../src/regular-expressions';

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
    assertRegExReplacements([getSubstitutionRegExp('shrug', '¯\\_(ツ)_/¯')], [
      { input: `\n\n\tshrug   \n`, output: `\n\n\t¯\\_(ツ)_/¯   \n` }
    ]);
  });

  it('should handle subsitutions that contain RegExp special characters', () => {
    assertRegExReplacements([getSubstitutionRegExp('(c)', '©')], [
      { input: `Copyright (c) `, output: `Copyright © ` }
    ]);
  });

  it('should handle substitutions that start or end with boundary characters', () => {
    assertRegExReplacements([
      getSubstitutionRegExp('(tm)', '™'),
      getSubstitutionRegExp('-tt', '+:+1:'),
      getSubstitutionRegExp('<br>', '&nbsp;'),
      getSubstitutionRegExp('||', '║'),
      getSubstitutionRegExp('{one}', '¹'),
      getSubstitutionRegExp(':thumbsup:', '👍')
    ], [
      { input: `Trademark(tm) `, output: `Trademark™ ` },
      { input: `cool-tt!`, output: `cool+:+1:!` },
      { input: `block<br>block`, output: `block&nbsp;block` },
      { input: `cat||file`, output: `cat║file` },
      { input: `source{one} `, output: `source¹ ` },
      { input: `good job:thumbsup: `, output: `good job👍 ` }
    ]);
  });
});

describe('the getSmartQuotesRegExp method', () => {
  it('should replace straight quotes with curly quotes', () => {
    assertRegExReplacements(getSmartQuotesRegExp(), [
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
      { input: `O\'Doyle`, output: `O\'Doyle` },
      { input: `O\'Doyle.`, output: `O’Doyle.` },
      { input: `\"O\'Doyle rules!\" `, output: `“O’Doyle rules!” ` },
      { input: `\"\'what\'s that,\' she said\" `, output: `“‘what’s that,’ she said” ` },
      { input: `end of one\" \"start of another`, output: `end of one” “start of another` },
      { input: `\"\'nested\'\" `, output: `“‘nested’” ` }
    ]);
  });
});

describe('the getSmartDashesRegExp method', () => {
  it('should replace consecutive hypens with an em-dash', () => {
    assertRegExReplacements(getSmartDashesRegExp(), [
      { input: `- `, output: `- ` },
      { input: `--`, output: `--` },
      { input: `-- `, output: `— ` },
      { input: `---`, output: `---` },
      { input: `--- `, output: `— ` },
      { input: `\n---\n`, output: `\n—\n` }
    ]);
  });

  it('should replace consecutive periods with an ellipsis', () => {
    assertRegExReplacements(getSmartDashesRegExp(), [
      { input: `...`, output: `...` },
      { input: `....`, output: `....` },
      { input: `... `, output: `… ` },
      { input: `some text...more text`, output: `some text…more text` }
    ]);
  });
});

function assertRegExReplacements(replacementItems, testCases) {
  for (let {input, output} of testCases) {

    for (let {regExp, replacement} of replacementItems) {
      input = input.replace(regExp, `$1${replacement}$2`);
    }

    assert.equal(input, output);
  }
}

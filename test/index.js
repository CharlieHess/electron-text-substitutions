import assert from 'assert';
import {substituteText, getSubstitutionRegex} from '../src/text-substitution';

describe('the getSubstitutionRegex method', () => {
  it('should only match a word with a trailing boundary', () => {
    let regex = getSubstitutionRegex('banana');
    let shouldMatch = [
      'banana ',
      'banana-',
      'banana.',
      '-banana ',
      'banana\n',
      'banana\r.',
      '\nbanana\t'
    ];

    let shouldNotMatch = [
      'banana',
      ' banana',
      'bananabanana',
      'helpimtrappedina-bananafactory '
    ];

    for (let candidate of shouldMatch) assert(candidate.match(regex));
    for (let candidate of shouldNotMatch) assert(!candidate.match(regex));
  });

  it('should match extended Unicode characters', () => {
    let candidates = [
      { match: "Čemšeniško", input: "Gospod Čižmek je odšel na Čemšeniško planino po smrekove vršičke." },
      { match: "програмни", input: "Как ми се иска всички програмни езици поддържат UTF-8."},
      { match: "救命啊", input: "救命啊! 我的气垫船装满了鳝鱼" }
    ];

    for (let {match, input} of candidates) {
      let regex = getSubstitutionRegex(match);
      assert(input.match(regex));
    }
  });
});

describe('the substituteText method', () => {
  it('should only replace a word with a trailing boundary', () => {
    let input = "orange you glad I didn't say banana";
    let toReplace = 'banana';
    let result = substituteText(input, toReplace, 'orange');

    assert.equal(result, input);

    input += '.';
    result = substituteText(input, toReplace, 'orange');

    assert.equal(result, "orange you glad I didn't say orange.");
  });

  it('should accept a regex or an input string', () => {
    let input = "knock knock. who's there?";
    let firstReplacement = 'knock knock';
    let secondReplacement = getSubstitutionRegex("who's there");

    let result = substituteText(input, firstReplacement, 'knick knack');
    assert.equal(result, "knick knack. who's there?");

    result = substituteText(result, secondReplacement, 'paddywack');
    assert.equal(result, "knick knack. paddywack?");
  });

  it('should preserve whitespace around a match', () => {
    let input = "\n\n\tshrug   \n";
    let result = substituteText(input, 'shrug', '¯\\_(ツ)_/¯');

    assert.equal(result, "\n\n\t¯\\_(ツ)_/¯   \n");
  });
});

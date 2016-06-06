import assert from 'assert';
import {getSubstitutionRegex} from '../src/text-substitution';

describe('the Text Substitution regex', () => {
  it('should only match a word with boundaries', () => {
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
});

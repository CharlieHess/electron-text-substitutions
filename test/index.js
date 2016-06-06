import assert from 'assert';
import {getSubstitutionRegex} from '../src/text-substitution';

describe('the Text Substitution regex', () => {
  it('should not match a word without boundaries', () => {
    let re = getSubstitutionRegex('banana');
    assert(!'banana'.match(re));
  });
});

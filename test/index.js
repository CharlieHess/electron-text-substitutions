import assert from 'assert';
import performTextSubstitution from '../src';

describe('the performTextSubstitution method', () => {
  it('should error when not given an EventTarget', () => {
    assert.throws(performTextSubstitution);
  });
});

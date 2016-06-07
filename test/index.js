import assert from 'assert';
import performTextSubstitution from '../src';
import MockInput from './mock-input';

describe('the performTextSubstitution method', () => {
  it('should error when not given an EventTarget', () => {
    assert.throws(performTextSubstitution);
  });

  it('should replace text after an input event', () => {
    let input = new MockInput('something, something');
    let substitutions = [{ replace: 'shrug', with: '¯\\_(ツ)_/¯' }];

    performTextSubstitution(input, substitutions);
    input.type(' shrug ');

    assert.equal(input.value, 'something, something ¯\\_(ツ)_/¯ ');
  });

  it('should stop replacing when unsubscribed', () => {
    let input = new MockInput('everything I do deserves… ');
    let substitutions = [{ replace: 'disapproval', with: 'ಠ_ಠ' }];
    let disposable = performTextSubstitution(input, substitutions);

    input.type('disapproval ');
    assert.equal(input.value, 'everything I do deserves… ಠ_ಠ ');
    disposable.dispose();

    input.type('and more disapproval.');
    assert.equal(input.value, 'everything I do deserves… ಠ_ಠ and more disapproval.');
  });
});

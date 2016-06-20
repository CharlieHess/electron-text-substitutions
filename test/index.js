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
    input.inputText(' shrug ');

    assert.equal(input.value, 'something, something ¯\\_(ツ)_/¯ ');
  });

  it('should stop replacing when unsubscribed', () => {
    let input = new MockInput('everything I do deserves… ');
    let substitutions = [{ replace: 'disapproval', with: 'ಠ_ಠ' }];
    let disposable = performTextSubstitution(input, substitutions);

    input.inputText('disapproval ');
    assert.equal(input.value, 'everything I do deserves… ಠ_ಠ ');
    disposable.dispose();

    input.inputText('and more disapproval.');
    assert.equal(input.value, 'everything I do deserves… ಠ_ಠ and more disapproval.');
  });

  it('should handle multiple substitutions at once', () => {
    let input = new MockInput('');
    let substitutions = [
      { replace: 'disapproval', with: 'ಠ_ಠ' },
      { replace: 'shrug', with: '¯\\_(ツ)_/¯' }
    ];

    performTextSubstitution(input, substitutions);

    input.inputText('here is a shrug, and a gaze of disapproval.');
    assert.equal(input.value, 'here is a ¯\\_(ツ)_/¯, and a gaze of ಠ_ಠ.');
  });

  it('should only substitute the first if multiple matches occur', () => {
    let input = new MockInput('');
    let substitutions = [{ replace: 'shrug', with: '¯\\_(ツ)_/¯' }];

    performTextSubstitution(input, substitutions);

    input.inputText('multiple shrug shrug shrug ');
    assert.equal(input.value, 'multiple ¯\\_(ツ)_/¯ shrug shrug ');
  });
});

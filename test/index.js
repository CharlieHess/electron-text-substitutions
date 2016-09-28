import assert from 'assert';
import performTextSubstitution from '../src';
import MockInput from './mock-input';
import MockContenteditable from './mock-contenteditable';

describe('the performTextSubstitution method', () => {
  it('should error when not given an EventTarget', () => {
    assert.throws(performTextSubstitution);
  });

  it('should replace text after an input event', () => {
    let text = 'something, something';
    let targets = [new MockInput(text), new MockContenteditable(text)];

    targets.forEach(input => {
      performTextSubstitution(input, {
        substitutions: [{ replace: 'shrug', with: '¯\\_(ツ)_/¯' }]
      });

      input.inputText(' shrug ');
      assert.equal(input.value, 'something, something ¯\\_(ツ)_/¯ ');
    });
  });

  it('should stop replacing when unsubscribed', () => {
    let input = new MockInput('everything I do deserves… ');
    let disposable = performTextSubstitution(input, {
      substitutions: [{ replace: 'disapproval', with: 'ಠ_ಠ' }]
    });

    input.inputText('disapproval ');
    assert.equal(input.value, 'everything I do deserves… ಠ_ಠ ');
    disposable.unsubscribe();

    input.inputText('and more disapproval.');
    assert.equal(input.value, 'everything I do deserves… ಠ_ಠ and more disapproval.');
  });

  it('should handle multiple substitutions', () => {
    let input = new MockInput('');
    performTextSubstitution(input, {
      substitutions: [
        { replace: 'disapproval', with: 'ಠ_ಠ' },
        { replace: 'shrug', with: '¯\\_(ツ)_/¯' }
      ]
    });

    input.inputText('here is a shrug,');
    assert.equal(input.value, 'here is a ¯\\_(ツ)_/¯,');

    input.inputText(' and a gaze of disapproval.');
    assert.equal(input.value, 'here is a ¯\\_(ツ)_/¯, and a gaze of ಠ_ಠ.');
  });

  it('should only substitute word preceding the cursor', () => {
    let input = new MockInput('');
    performTextSubstitution(input, {
      substitutions: [{ replace: 'shrug', with: '¯\\_(ツ)_/¯' }]
    });

    input.inputText('multiple shrug shrug shrug ');
    assert.equal(input.value, 'multiple shrug shrug ¯\\_(ツ)_/¯ ');
  });

  it('should handle the man known as shinypb', () => {
    let input = new MockInput('');
    performTextSubstitution(input, {
      substitutions: [
        { replace: "(tm)",  with: "\u2122" },
        { replace: "....",  with: "\u2026" },
        { replace: "->",    with: "\u2192" },
        { replace: "<-",    with: "\u2190" },
        { replace: "(1/2)", with: "\u00bd" },
        { replace: "(c)",   with: "\u00a9" },
        { replace: "(1/4)", with: "\u00bc" },
        { replace: "(r)",   with: "\u00ae" },
        { replace: "(3/4)", with: "\u00be" },
        { replace: "(2/3)", with: "\u2154" },
        { replace: "(1/3)", with: "\u2153" }
      ],
      useSmartDashes: true
    });

    input.typeText('Hello (c) . look here -> or there <- (1/2) is less than (3/4) (r) .... (1/3) (tm)... ');
    assert.equal(input.value, 'Hello © . look here → or there ← ½ is less than ¾ ® … ⅓ ™… ');
  });

  it('should handle the infamous lbo', () => {
    let input = new MockInput('');
    performTextSubstitution(input, {
      substitutions: [
        { replace: "->", with: "→" },
        { replace: "<-", with: "←" },
        { replace: "|->", with: "↳" },
        { replace: "<-|", with: "↵" }
      ]
    });

    input.typeText('<-| is ←|, |-> is |→');
    assert.equal(input.value, '↵ is ←|, ↳ is |→');
  });

  it('should replace quotes & dashes, if enabled', () => {
    let input = new MockInput('');
    performTextSubstitution(input, {
      substitutions: [],
      useSmartQuotes: true,
      useSmartDashes: true
    });

    input.typeText('\'This is a single quote,\' she said--- \"And this is a double\" ');
    assert.equal(input.value, '‘This is a single quote,’ she said— “And this is a double” ');
  });

  it('should replace quotes & dashes within user dictionary replacements, if enabled', () => {
    let input = new MockInput('');
    let disposable = performTextSubstitution(input, {
      substitutions: [{ replace: 'greetings', with: 'Hello-- my name is \'Milo,\' how do you do?' }]
    });

    input.inputText('greetings ');
    assert.equal(input.value, 'Hello-- my name is \'Milo,\' how do you do? ');
    disposable.unsubscribe();
    input.clearText();

    performTextSubstitution(input, {
      substitutions: [{ replace: 'greetings', with: 'Hello-- my name is \'Milo,\' how do you do?' }],
      useSmartQuotes: true,
      useSmartDashes: true
    });

    input.inputText('greetings ');
    assert.equal(input.value, 'Hello— my name is ‘Milo,’ how do you do? ');
  });
});

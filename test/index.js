import assert from 'assert';
import {ipcRenderer} from 'electron';
import {Observable} from 'rxjs';

import performTextSubstitution, {preferenceChangedIpcMessage} from '../src';

function inputText(inputElement, text) {
  let textEvent = document.createEvent('TextEvent');
  textEvent.initTextEvent('textInput', true, true, null, text);
  inputElement.dispatchEvent(textEvent);
}

function typeText(inputElement, text) {
  return Observable.from(text)
    .subscribe((character) => inputText(inputElement, character));
}

describe('the performTextSubstitution method', () => {
  let input, subscription;

  beforeEach(() => {
    input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
  });

  afterEach(() => {
    if (subscription) subscription.unsubscribe();
    document.body.removeChild(input);
    input = null;
  });

  it('should error when not given an EventTarget', () => {
    assert.throws(performTextSubstitution);
  });

  it('should replace text after an input event', () => {
    subscription = performTextSubstitution(input, {
      substitutions: [{ replace: 'shrug', with: '¯\\_(ツ)_/¯' }]
    });

    inputText(input, 'shrug ');
    assert.equal(input.value, '¯\\_(ツ)_/¯ ');
  });

  it('should stop replacing when unsubscribed', () => {
    subscription = performTextSubstitution(input, {
      substitutions: [{ replace: 'disapproval', with: 'ಠ_ಠ' }]
    });

    inputText(input, 'everything I do deserves… ');
    assert.equal(input.value, 'everything I do deserves… ');

    inputText(input, 'disapproval ');
    assert.equal(input.value, 'everything I do deserves… ಠ_ಠ ');
    subscription.unsubscribe();

    inputText(input, 'and more disapproval.');
    assert.equal(input.value, 'everything I do deserves… ಠ_ಠ and more disapproval.');
  });

  it('should handle multiple substitutions', () => {
    subscription = performTextSubstitution(input, {
      substitutions: [
        { replace: 'disapproval', with: 'ಠ_ಠ' },
        { replace: 'shrug', with: '¯\\_(ツ)_/¯' }
      ]
    });

    inputText(input, 'here is a shrug,');
    assert.equal(input.value, 'here is a ¯\\_(ツ)_/¯,');

    inputText(input, ' and a gaze of disapproval.');
    assert.equal(input.value, 'here is a ¯\\_(ツ)_/¯, and a gaze of ಠ_ಠ.');
  });

  it('should only substitute word preceding the cursor', () => {
    subscription = performTextSubstitution(input, {
      substitutions: [{ replace: 'shrug', with: '¯\\_(ツ)_/¯' }]
    });

    inputText(input, 'multiple shrug shrug shrug ');
    assert.equal(input.value, 'multiple shrug shrug ¯\\_(ツ)_/¯ ');
  });

  it('should handle the man known as shinypb', () => {
    subscription = performTextSubstitution(input, {
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

    typeText(input, 'Hello (c) . look here -> or there <- (1/2) is less than (3/4) (r) .... (1/3) (tm)... ');
    assert.equal(input.value, 'Hello © . look here → or there ← ½ is less than ¾ ® … ⅓ ™… ');
  });

  it('should handle the infamous lbo', () => {
    subscription = performTextSubstitution(input, {
      substitutions: [
        { replace: "->", with: "→" },
        { replace: "<-", with: "←" },
        { replace: "|->", with: "↳" },
        { replace: "<-|", with: "↵" }
      ]
    });

    typeText(input, '<-| is ←|, |-> is |→');
    assert.equal(input.value, '↵ is ←|, ↳ is |→');
  });

  it('should replace quotes & dashes, if enabled', () => {
    subscription = performTextSubstitution(input, {
      substitutions: [],
      useSmartQuotes: true,
      useSmartDashes: true
    });

    typeText(input, '\'This is a single quote,\' she said--- \"And this is a double\" ');
    assert.equal(input.value, '‘This is a single quote,’ she said— “And this is a double” ');
  });

  it('should replace quotes & dashes within user dictionary replacements, if enabled', () => {
    subscription = performTextSubstitution(input, {
      substitutions: [{ replace: 'greetings', with: 'Hello-- my name is \'Milo,\' how do you do?' }]
    });

    inputText(input, 'greetings ');
    assert.equal(input.value, 'Hello-- my name is \'Milo,\' how do you do? ');
    subscription.unsubscribe();

    input.value = '';
    input.selectionStart = 0;
    input.selectionEnd = 0;

    performTextSubstitution(input, {
      substitutions: [{ replace: 'greetings', with: 'Hello-- my name is \'Milo,\' how do you do?' }],
      useSmartQuotes: true,
      useSmartDashes: true
    });

    inputText(input, 'greetings ');
    assert.equal(input.value, 'Hello— my name is ‘Milo,’ how do you do? ');
  });

  it('should unhook the preference changed message when unsubscribed', () => {
    const sub1 = performTextSubstitution(input, { substitutions: [] });
    const sub2 = performTextSubstitution(input, { substitutions: [] });
    const sub3 = performTextSubstitution(input, { substitutions: [] });

    assert.equal(ipcRenderer.listenerCount(preferenceChangedIpcMessage), 3);

    sub1.unsubscribe();
    sub2.unsubscribe();
    sub3.unsubscribe();

    assert.equal(ipcRenderer.listenerCount(preferenceChangedIpcMessage), 0);
  });
});

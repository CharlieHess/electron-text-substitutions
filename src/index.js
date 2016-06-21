import {isEqual} from 'lodash';
import {remote} from 'electron';
import {Disposable, SerialDisposable, CompositeDisposable} from 'rx-lite';
import {getSubstitutionRegExp, getSmartQuotesRegExp, getSmartDashesRegExp,
  scrubInputString, formatReplacement} from './regular-expressions';
import {isUndoRedoEvent} from './undo-redo-event';

const d = require('debug-electron')('electron-text-substitutions');
const userDefaultsTextSubstitutionsKey = 'NSUserDictionaryReplacementItems';
const userDefaultsSmartQuotesKey = 'NSAutomaticQuoteSubstitutionEnabled';
const userDefaultsSmartDashesKey = 'NSAutomaticDashSubstitutionEnabled';
const userDefaultsChangedKey = 'NSUserDefaultsDidChangeNotification';

let systemPreferences;

/**
 * Adds an `input` event listener to the given element (an <input> or
 * <textarea>) that will substitute text based on the user's replacements in
 * `NSUserDefaults`.
 *
 * In addition, this method will listen for changes to `NSUserDefaults` and
 * update accordingly.
 *
 * @param  {EventTarget} element          The DOM node to listen to; should fire the `input` event
 * @param  {Object} preferenceOverrides   Used to override text preferences in testing
 *
 * @return {Disposable}                   A `Disposable` that will clean up everything this method did
 */
export default function performTextSubstitution(element, preferenceOverrides = null) {
  if (!element || !element.addEventListener) throw new Error(`Element is null or not an EventTarget`);
  if (!process || !process.type === 'renderer') throw new Error(`Not in an Electron renderer context`);
  if (process.platform !== 'darwin') throw new Error(`Only supported on OS X`);

  systemPreferences = systemPreferences || remote.systemPreferences;

  if (!systemPreferences || !systemPreferences.getUserDefault) {
    throw new Error(`Electron ${process.versions.electron} is not supported`);
  }

  let textPreferences = preferenceOverrides || readSystemTextPreferences();
  let replacementItems = getReplacementItems(textPreferences);

  let inputEvent = new SerialDisposable();
  inputEvent.setDisposable(addInputListener(element, replacementItems));

  let changeHandlerId = systemPreferences.subscribeNotification(userDefaultsChangedKey, () => {
    d(`Got an ${userDefaultsChangedKey}`);
    let newTextPreferences = preferenceOverrides || readSystemTextPreferences();

    if (didTextPreferencesChange(textPreferences, newTextPreferences)) {
      d(`User modified text preferences, reattaching listener`);

      let newReplacementItems = getReplacementItems(newTextPreferences);
      inputEvent.setDisposable(addInputListener(element, newReplacementItems));
    }
  });

  let changeHandlerDisposable = new Disposable(() => {
    systemPreferences.unsubscribeNotification(changeHandlerId);
    d(`Cleaned up all listeners`);
  });

  return new CompositeDisposable(inputEvent, changeHandlerDisposable);
}

function readSystemTextPreferences() {
  return {
    substitutions: systemPreferences.getUserDefault(userDefaultsTextSubstitutionsKey, 'array') || [],
    useSmartQuotes: systemPreferences.getUserDefault(userDefaultsSmartQuotesKey, 'boolean') || [],
    useSmartDashes: systemPreferences.getUserDefault(userDefaultsSmartDashesKey, 'boolean') || []
  };
}

function didTextPreferencesChange(prev, current) {
  return !isEqual(prev.substitutions, current.substitutions) ||
    prev.useSmartQuotes !== current.useSmartQuotes ||
    prev.useSmartDashes !== current.useSmartDashes;
}

/**
 * @typedef {Object} TextSubstitution
 * @property {String} replace The text to replace
 * @property {String} with    The replacement text
 * @property {Bool}   on      True if this substitution is enabled
 */

 /**
  * Creates a regular expression for each text substitution entry, in addition
  * to expressions for smart quotes and dashes (if they're enabled).
  *
  * @param  {Array<TextSubstitution>} {substitutions  An array of text substitution entries
  * @param  {Bool} useSmartQuotes                     True if smart quotes is on
  * @param  {Bool} useSmartDashes}                    True if smart dashes is on
  * @return {Array<ReplacementItem>}                  An array of replacement items
  */
function getReplacementItems({substitutions, useSmartQuotes, useSmartDashes}) {
  d(`Smart quotes are ${useSmartQuotes ? 'on' : 'off'}`);
  d(`Smart dashes are ${useSmartDashes ? 'on' : 'off'}`);

  let additionalReplacements = [
    ...(useSmartQuotes ? getSmartQuotesRegExp() : []),
    ...(useSmartDashes ? getSmartDashesRegExp() : [])
  ];

  d(`Found ${substitutions.length} substitutions in NSUserDictionaryReplacementItems`);

  // NB: Run each replacement string through our smart quotes & dashes regex,
  // so that an input event doesn't cause chained substitutions.
  let userDictionaryReplacements = substitutions
    .filter((substitution) => substitution.on !== false)
    .map((substitution) => getSubstitutionRegExp(substitution.replace,
      scrubInputString(substitution.with, additionalReplacements)));

  return [
    ...userDictionaryReplacements,
    ...additionalReplacements
  ];
}

/**
 * Subscribes to the `input` event and performs text substitution.
 *
 * @param  {EventTarget} element                      The DOM node to listen to
 * @param  {Array<ReplacementItem>} replacementItems  An array of replacement items
 * @return {Disposable}                               A `Disposable` that will remove the listener
 */
function addInputListener(element, replacementItems) {
  let ignoreEvent = false;

  let inputListener = () => {
    if (ignoreEvent) {
      d(`In a substitution or an undo / redo, ignore this event`);
      return;
    }

    ignoreEvent = true;

    for (let {regExp, replacement} of replacementItems) {
      let match = element.value.match(regExp);
      if (match && match.length === 3) {
        d(`Got a match of length ${match[0].length} at index ${match.index}: ${JSON.stringify(match)}`);

        let selection = {
          startIndex: match.index,
          endIndex: match.index + match[0].length
        };

        // Are we inserting characters before the end of input (vs appending?)
        let isInserting = element.selectionEnd !== element.value.length;

        replaceText(element, selection, formatReplacement(match, replacement));

        // Our regex includes trailing whitespace / word boundaries, which,
        // when inserting text, cause the caret position to jump to the end of
        // the match. We subtract everything to the right of the match
        // to preserve the caret position.
        if (isInserting) element.selectionEnd -= match[2].length;
      }
    }

    ignoreEvent = false;
  };

  let keyDownListener = (e) => {
    ignoreEvent = isUndoRedoEvent(e);
  };

  let keyUpListener = () => {
    ignoreEvent = false;
  };

  element.addEventListener('keydown', keyDownListener, true);
  element.addEventListener('keyup', keyUpListener, true);
  element.addEventListener('input', inputListener);

  d(`Added input listener matching against ${replacementItems.length} replacements`);

  return new Disposable(() => {
    element.removeEventListener('keydown', keyDownListener);
    element.removeEventListener('keyup', keyUpListener);
    element.removeEventListener('input', inputListener);

    d(`Removed input listener`);
  });
}

/**
 * Performs the actual text replacement using `dispatchEvent`. We use events to
 * preserve the user's cursor index and make the substitution undoable.
 *
 * @param  {EventTarget} element  The DOM node where text is being substituted
 * @param  {Number} {startIndex   Start index of the text to replace
 * @param  {Number} endIndex}     End index of the text to replace
 * @param  {String} newText       The text being inserted
 */
function replaceText(element, {startIndex, endIndex}, newText) {
  let textEvent = document.createEvent('TextEvent');
  textEvent.initTextEvent('textInput', true, true, null, newText);

  element.selectionStart = startIndex;
  element.selectionEnd = endIndex;

  d(`Replacing ${element.value.substring(startIndex, endIndex)} with ${newText}`);
  element.dispatchEvent(textEvent);
}

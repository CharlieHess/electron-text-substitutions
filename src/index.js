import {isEqual, reduce} from 'lodash';
import {remote} from 'electron';
import {Disposable, SerialDisposable, CompositeDisposable} from 'rx-lite';
import {substituteText, getSubstitutionRegExp} from './text-substitution';
import {replaceQuotes} from './smart-quotes';
import {replaceDashes} from './smart-dashes';

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
 * @param  {Array} substitutionOverrides  Used to supply substitutions in testing
 *
 * @return {Disposable}                   A `Disposable` that will clean up everything this method did
 */
export default function performTextSubstitution(element, substitutionOverrides = null) {
  if (!element || !element.addEventListener) throw new Error(`Element is null or not an EventTarget`);
  if (!process || !process.type === 'renderer') throw new Error(`Not in an Electron renderer context`);
  if (process.platform !== 'darwin') throw new Error(`Only supported on OS X`);

  systemPreferences = systemPreferences || remote.systemPreferences;

  if (!systemPreferences || !systemPreferences.getUserDefault) {
    throw new Error(`Electron ${process.versions.electron} is not supported`);
  }

  let substitutions = systemPreferences.getUserDefault(userDefaultsTextSubstitutionsKey, 'array');
  let replacementItems = getReplacementItems(substitutionOverrides || substitutions || []);

  let inputEvent = new SerialDisposable();
  inputEvent.setDisposable(addInputListener(element, replacementItems));

  let changeHandlerId = systemPreferences.subscribeNotification(userDefaultsChangedKey, () => {
    d(`Got an ${userDefaultsChangedKey}`);
    let newSubstitutions = systemPreferences.getUserDefault(userDefaultsTextSubstitutionsKey, 'array');

    if (!isEqual(substitutions, newSubstitutions)) {
      d(`User modified ${userDefaultsTextSubstitutionsKey}, reattaching listener`);

      let newReplacementItems = getReplacementItems(substitutionOverrides || substitutions || []);
      inputEvent.setDisposable(addInputListener(element, newReplacementItems));
    }
  });

  let changeHandlerDisposable = new Disposable(() => {
    d(`Cleaning up all listeners`);
    systemPreferences.unsubscribeNotification(changeHandlerId);
  });

  return new CompositeDisposable(inputEvent, changeHandlerDisposable);
}

/**
 * @typedef {Object} TextSubstitution
 * @property {String} replace The text to replace
 * @property {String} with    The replacement text
 * @property {Bool}   on      True if this substitution is enabled
 */

 /**
  * @typedef {Object} ReplacementItem
  * @property {String} regExp       A regular expression that matches the text to replace
  * @property {String} replacement  The replacement text
  */

/**
 * Gets the user's text substitutions on OS X, and creates a regular expression
 * for each entry.
 *
 * @param  {Array<TextSubstitution>}  An array of text substitution entries
 * @return {Array<ReplacementItem>}   An array of replacement items
 */
function getReplacementItems(substitutions) {
  d(`Found ${substitutions.length} substitutions in NSUserDictionaryReplacementItems`);

  return substitutions
    .filter((substitution) => substitution.on !== false)
    .map((substitution) => {
      return {
        regExp: getSubstitutionRegExp(substitution.replace),
        replacement: substitution.with
      };
    });
}

/**
 * Subscribes to the `input` event and performs text substitution.
 *
 * @param  {EventTarget} element                      The DOM node to listen to
 * @param  {Array<ReplacementItem>} replacementItems  An array of replacement items
 * @return {Disposable}                               A `Disposable` that will remove the listener
 */
function addInputListener(element, replacementItems) {
  let useSmartQuotes = systemPreferences.getUserDefault(userDefaultsSmartQuotesKey, 'boolean');
  let useSmartDashes = systemPreferences.getUserDefault(userDefaultsSmartDashesKey, 'boolean');

  let listener = () => {
    for (let {regExp, replacement} of replacementItems) {
      let match = element.value.match(regExp);
      if (match) {
        let selection = {
          start: match.index,
          end: match.index + match[0].length
        };

        d(`Replacing ${match[0]} with ${replacement}`);
        replaceText(element, selection, `${match[1]}${replacement}${match[2]}`);
      }
    }
  };

  element.addEventListener('input', listener);

  d(`Added input listener matching against ${replacementItems.length} replacements`);
  d(`Smart quotes are ${useSmartQuotes ? 'on' : 'off'}`);
  d(`Smart dashes are ${useSmartDashes ? 'on' : 'off'}`);

  return new Disposable(() => {
    element.removeEventListener('input', listener);
    d(`Removed input listener`);
  });
}

function replaceText(element, {start, end}, newText) {
  let textEvent = document.createEvent('TextEvent');
  textEvent.initTextEvent('textInput', true, true, null, newText);

  element.selectionStart = start;
  element.selectionEnd = end;

  element.dispatchEvent(textEvent);
}

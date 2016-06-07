import {reduce} from 'lodash';
import {remote} from 'electron';
import {substituteText, getSubstitutionRegex} from './text-substitution';

const d = require('debug')('electron-text-substitutions');
const userDefaultsTextSubstitutionsKey = 'NSUserDictionaryReplacementItems';

/**
 * Adds an `input` event listener to the given element (an <input> or
 * <textarea>) that will substitute text based on the user's replacements in
 * `NSUserDefaults`.
 *
 * @param  {EventTarget} element        The DOM node to listen to; should fire the `input` event
 * @param  {Array} replacementOverrides Used to supply substitutions in testing
 * @return {Function}                   A method that will unsubscribe the listener
 */
export default function performTextSubstitution(element, replacementOverrides = null) {
  if (!element || !element.addEventListener) throw new Error(`Element is null or not an EventTarget`);

  let replacementItems = replacementOverrides || getDictionaryReplacementItems() || [];
  d(`Found ${replacementItems.length} items in NSUserDictionaryReplacementItems`);

  let substitutions = replacementItems
    .filter((substitution) => substitution.on !== false)
    .map((substitution) => {
      return {
        regex: getSubstitutionRegex(substitution.replace),
        replacement: substitution.with
      };
    });

  d(`Matching against ${substitutions.length} regular expressions`);

  if (substitutions.length === 0) return () => { };

  let listener = () => {
    element.value = reduce(substitutions, (output, {regex, replacement}) => {
      return substituteText(output, regex, replacement);
    }, element.value);
  };

  element.addEventListener('input', listener);

  return () => {
    element.removeEventListener('input', listener);
    d(`Removed input event listener`);
  };
}

/**
 * Gets the user's text substitutions on OS X, after some error checking.
 *
 * @return {Array}  An array of replacement items
 */
function getDictionaryReplacementItems() {
  if (!process || !process.type === 'renderer') throw new Error(`Not in an Electron renderer context`);
  if (process.platform !== 'darwin') throw new Error(`Only supported on OS X`);

  const {systemPreferences} = remote;

  if (!systemPreferences || !systemPreferences.getUserDefault) {
    throw new Error(`Electron ${process.versions.electron} is not supported`);
  }

  return systemPreferences.getUserDefault(userDefaultsTextSubstitutionsKey, 'array');
}

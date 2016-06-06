import {reduce} from 'lodash';
import {remote} from 'electron';
import {substituteText, getSubstitutionRegex} from './text-substitution';

const d = require('debug')('electron-text-substitutions');
const userDefaultsTextSubstitutionKey = 'NSUserDictionaryReplacementItems';

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

  d(`Created ${substitutions.length} regular expressions to match against`);

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

function getDictionaryReplacementItems() {
  if (!process || !process.type === 'renderer') throw new Error(`Not in an Electron renderer context`);
  if (process.platform !== 'darwin') throw new Error(`Only supported on OS X`);

  const {systemPreferences} = remote;

  if (!systemPreferences || !systemPreferences.getUserDefault) {
    throw new Error(`Electron ${process.versions.electron} is not supported`);
  }

  return systemPreferences.getUserDefault(userDefaultsTextSubstitutionKey, 'array');
}

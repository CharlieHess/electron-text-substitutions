import electron from 'electron';
import values from 'lodash.values';
import forEach from 'lodash.foreach';
import some from 'lodash.some';

import 'rxjs/add/observable/from';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/debounceTime';
import {Subscription} from 'rxjs/Subscription';
import SerialSubscription from 'rxjs-serial-subscription';
import {readSystemTextPreferences, onPreferenceChanged} from './preference-helpers';
import {getSubstitutionRegExp, getSmartQuotesRegExp, getSmartDashesRegExp,
  scrubInputString, formatReplacement, regExpReplacer, regExpReviver} from './regular-expressions';
import {isUndoRedoEvent, isBackspaceEvent} from './keyboard-utils';

const packageName = 'electron-text-substitutions';
const d = require('debug')(packageName);

const registerForPreferenceChangedIpcMessage = `${packageName}-register-renderer`;
const unregisterForPreferenceChangedIpcMessage = `${packageName}-unregister-renderer`;
export const preferenceChangedIpcMessage = `${packageName}-preference-changed`;

let ipcMain, ipcRenderer, systemPreferences;
let replacementItems = null;
let registeredWebContents = {};

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
 * @return {Subscription}                   A `Subscription` that will clean up everything this method did
 */
export default function performTextSubstitution(element, preferenceOverrides = null) {
  if (!element || !element.addEventListener) throw new Error(`Element is null or not an EventTarget`);
  if (!process || process.type !== 'renderer') throw new Error(`Not in an Electron renderer context`);
  if (process.platform !== 'darwin') throw new Error(`Only supported on macOS`);

  ipcRenderer = ipcRenderer || electron.ipcRenderer;
  systemPreferences = systemPreferences || electron.remote.systemPreferences;

  if (!systemPreferences || !systemPreferences.getUserDefault) {
    throw new Error(`Electron ${process.versions.electron} is not supported`);
  }

  ipcRenderer.send(registerForPreferenceChangedIpcMessage);

  window.addEventListener('beforeunload', () => {
    d(`Window unloading, unregister any listeners`);
    ipcRenderer.send(unregisterForPreferenceChangedIpcMessage);
  });

  if (preferenceOverrides) {
    replacementItems = getReplacementItems(preferenceOverrides);
  } else if (!replacementItems) {
    replacementItems = getReplacementItems(readSystemTextPreferences());
  }

  let currentAttach = assignDisposableToListener(element, replacementItems);

  ipcRenderer.on(preferenceChangedIpcMessage, (e, serializedItems) => {
    d(`User modified text preferences, reattaching listener`);
    replacementItems = JSON.parse(serializedItems, regExpReviver);
    assignDisposableToListener(element, replacementItems, currentAttach);
  });

  return currentAttach;
}

/**
 * Subscribes to text preference changed notifications and notifies listeners
 * in renderer processes. This method must be called from the main process, and
 * should be called before any renderer process calls `performTextSubstitution`.
 *
 * @return {Subscription}  A `Subscription` that will clean up everything this method did
 */
export function listenForPreferenceChanges() {
  if (!process || process.type !== 'browser') throw new Error(`Not in an Electron browser context`);
  if (process.platform !== 'darwin') throw new Error(`Only supported on macOS`);

  ipcMain = ipcMain || electron.ipcMain;
  systemPreferences = systemPreferences || electron.systemPreferences;

  ipcMain.on(registerForPreferenceChangedIpcMessage, ({sender}) => {
    let id = sender.getId();
    d(`Registering webContents ${id} for preference changes`);
    registeredWebContents[id] = { id, sender };
  });

  ipcMain.on(unregisterForPreferenceChangedIpcMessage, ({sender}) => {
    d(`Unregistering webContents ${sender.getId()}`);
    delete registeredWebContents[sender.getId()];
  });

  const ret = new Subscription();
  ret.add(onPreferenceChanged(notifyAllListeners));
  ret.add(new Subscription(() => ipcMain.removeAllListeners(registerForPreferenceChangedIpcMessage)));
  ret.add(new Subscription(() => ipcMain.removeAllListeners(unregisterForPreferenceChangedIpcMessage)));
  return ret;
}

/**
 * Sends an IPC message to each `WebContents` that is doing text substitution,
 * unless it has been destroyed, in which case remove it from our list.
 */
function notifyAllListeners() {
  let textPreferences = readSystemTextPreferences();
  let replacementItems = getReplacementItems(textPreferences);
  let serializedItems = JSON.stringify(replacementItems, regExpReplacer);

  forEach(values(registeredWebContents), ({id, sender}) => {
    if (sender.isDestroyed() || sender.isCrashed()) {
      d(`WebContents ${id} is gone, removing it`);
      delete registeredWebContents[id];
    } else {
      sender.send(preferenceChangedIpcMessage, serializedItems);
    }
  });
}

function assignDisposableToListener(element, replacementItems, currentAttach = null) {
  currentAttach = currentAttach || new SerialSubscription();
  currentAttach.add(addInputListener(element, replacementItems));
  return currentAttach;
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
  // so that an input event doesn't cause chained substitutions. Also sort
  // replacements by length, to handle nested substitutions.
  let userDictionaryReplacements = substitutions
    .filter((substitution) => substitution.on !== false &&
      substitution.replace !== substitution.with)
    .sort((a, b) => b.replace.length - a.replace.length)
    .map((substitution) => getSubstitutionRegExp(substitution.replace,
      scrubInputString(substitution.with, additionalReplacements)));

  return [
    ...userDictionaryReplacements,
    ...additionalReplacements
  ];
}

/**
 * Get the string value of Text, Elements, and form elements
 *
 * @param  {Element} element  The element whose text will be retrieved
 * @return {String}           The text value of the element
 */
function getElementText(element) {
  if (!element) return '';
  if (element.value) return element.value;
  if (element.textContent.endsWith('\n')) return element.textContent.slice(0, -1);
  return element.textContent;
}

/**
 * Subscribes to the `input` event and performs text substitution.
 *
 * @param  {EventTarget} element                      The DOM node to listen to
 * @param  {Array<ReplacementItem>} replacementItems  An array of replacement items
 * @return {Subscription}                               A `Subscription` that will remove the listener
 */
function addInputListener(element, replacementItems) {
  let ignoreEvent = false;
  let composition = false;

  let inputListener = () => {
    if (composition) {
      d(`composition event is not completed, do not try substitution`);
      return;
    }

    if (ignoreEvent) return;
    ignoreEvent = true;

    for (let {regExp, replacement} of replacementItems) {
      // Rather than search the entire input, we're just going to check the word
      // immediately before the caret (along with its surrounding whitespace).
      // This is to avoid substitutions after, say, a paste or an undo.
      let value = getElementText(element);
      let searchStartIndex = lastIndexOfWhitespace(value, element.selectionEnd);
      let lastWordBlock = value.substring(searchStartIndex, element.selectionEnd);
      let match = lastWordBlock.match(regExp);

      if (match && match.length === 3) {
        d(`Got a match of length ${match[0].length} at index ${match.index}: ${JSON.stringify(match)}`);

        if (some(replacementItems, (item) => item.match === match[0])) {
          d(`The match is a prefix of another replacement item (${match[0]}), skip it`);
          continue;
        }

        let selection = {
          startIndex: searchStartIndex + match.index,
          endIndex: searchStartIndex + match.index + match[0].length
        };

        replaceText(element, selection, formatReplacement(match, replacement));
      }
    }

    ignoreEvent = false;
  };

  let keyDownListener = (e) => {
    if (isUndoRedoEvent(e) || isBackspaceEvent(e) || composition) {
      d(`Ignoring keydown event from ${e.target.value}`);
      ignoreEvent = true;
    }
  };

  let pasteListener = () => {
    ignoreEvent = true;
  };

  let keyUpListener = () => {
    if (!composition) {
      ignoreEvent = false;
    }
  };

  const compositionStartListener = () => composition = true;
  const compositionEndListener = () => {
    composition = false;

    //force validate substitution state after composition completes.
    //in case of some IME (KR for example) compositon end event won't be triggered unless
    //final consonant are typed, while char itself can written without final consonant.
    //This'll makes initial substitution doesn't replace text since it's suppressed then
    //next substitution try to attempt replace first char which haven't triggered at those moment.
    //to avoid those, force trigger input validation as soon as composition end event fires
    ignoreEvent = false;
    inputListener();
  };

  element.addEventListener('compositionstart', compositionStartListener, true);
  element.addEventListener('compositionend', compositionEndListener, true);
  element.addEventListener('keydown', keyDownListener, true);
  element.addEventListener('paste', pasteListener, true);
  element.addEventListener('keyup', keyUpListener, true);
  element.addEventListener('input', inputListener);

  d(`Added input listener to ${element.id} matching against ${replacementItems.length} replacements`);

  return new Subscription(() => {
    element.removeEventListener('compositionstart', compositionStartListener, true);
    element.removeEventListener('compositionend', compositionEndListener, true);
    element.removeEventListener('keydown', keyDownListener);
    element.removeEventListener('paste', pasteListener);
    element.removeEventListener('keyup', keyUpListener);
    element.removeEventListener('input', inputListener);

    d(`Removed input listener from ${element.id}`);
  });
}

function lastIndexOfWhitespace(value, fromIndex) {
  let lastIndex = 0;
  let whitespace = /\s/g;
  let textToCaret = value.substring(0, fromIndex).trimRight();

  while (whitespace.exec(textToCaret) !== null) {
    lastIndex = whitespace.lastIndex;
  }
  return lastIndex;
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
  setSelectionRange(element, startIndex, endIndex);

  d(`Replacing ${getElementText(element).substring(startIndex, endIndex)} with ${newText}`);
  document.execCommand('insertText', false, newText);
}

/**
 * Sets the selection range of a given input element. If the element is not an
 * `input` or `textarea`, we need to get into the `Range` game.
 *
 * @param  {type} element    The DOM node where text will be selected
 * @param  {type} startIndex Start index of the selection
 * @param  {type} endIndex   End index of the selection
 */
function setSelectionRange(element, startIndex, endIndex) {
  if (element.value) {
    element.selectionStart = startIndex;
    element.selectionEnd = endIndex;
  } else {
    let charIndex = 0;
    let range = document.createRange();
    range.setStart(element, 0);
    range.collapse(true);

    let nodeStack = [element], node, foundStart = false, stop = false;

    while (!stop && (node = nodeStack.pop())) {
      if (node.nodeType == Node.TEXT_NODE) {
        let nextCharIndex = charIndex + node.length;
        if (!foundStart && startIndex >= charIndex && startIndex <= nextCharIndex) {
          range.setStart(node, startIndex - charIndex);
          foundStart = true;
        }
        if (foundStart && endIndex >= charIndex && endIndex <= nextCharIndex) {
          range.setEnd(node, endIndex - charIndex);
          stop = true;
        }
        charIndex = nextCharIndex;
      } else {
        var i = node.childNodes.length;
        while (i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    let selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

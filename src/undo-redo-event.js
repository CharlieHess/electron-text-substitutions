const keyCodes = {
  y: 89,
  z: 90,
  Z: 122
};

/**
 * Returns true if this `keydown` event will trigger an undo or redo operation.
 *
 * @param  {Number} {keyCode  The key code from the event
 * @param  {Bool} metaKey     True if the `meta` key was pressed
 * @param  {Bool} ctrlKey     True if the `ctrl` key was pressed
 * @param  {Bool} shiftKey    True if the `shift` key was pressed
 * @param  {Bool} altKey}     True if the `alt` key was pressed
 * @return {Bool}             Whether or not this event will trigger an undo or redo
 */
export function isUndoRedoEvent({keyCode, metaKey, ctrlKey, shiftKey, altKey}) {
  if (process.platform === 'darwin') {
    return metaKey && !ctrlKey && !altKey &&
      (keyCode === keyCodes.z || keyCode === keyCodes.Z);
  } else {
    return ctrlKey && !metaKey && !shiftKey && !altKey &&
      (keyCode === keyCodes.z || keyCode === keyCodes.y);
  }
}

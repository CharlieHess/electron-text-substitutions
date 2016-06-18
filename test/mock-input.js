import EventTarget from 'event-target-shim';

export default class MockInput extends EventTarget {
  constructor(initialText = "") {
    super();

    this.value = initialText;
    this.selectionStart = initialText.length;
    this.selectionEnd = initialText.length;
  }

  inputText(text, dispatch = true) {
    let before = this.value.substring(0, this.selectionStart);
    let after = this.value.substring(this.selectionEnd, this.value.length);

    this.value = `${before}${text}${after}`;
    this.selectionStart = this.selectionEnd = this.value.length;

    if (dispatch) this.dispatchEvent({type: 'input'});
  }

  /**
   * Catch `textInput` events and change our underlying text.
   */
  dispatchEvent(evt) {
    if (evt.type === 'textInput') {
      this.inputText(evt.data, false);
    } else {
      super.dispatchEvent(evt);
    }
  }
}

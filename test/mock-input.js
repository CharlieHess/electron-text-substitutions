import EventTarget from 'event-target-shim';

export default class MockInput extends EventTarget {
  constructor(initialText = "") {
    super();

    this.value = initialText;
    this.selectionStart = 0;
    this.selectionEnd = initialText.length;
  }

  type(something) {
    this.value += something;
    this.dispatchEvent({type: 'input'});
  }

  /**
   * Catch `textInput` events and change our underlying text.
   */
  dispatchEvent(evt) {
    if (evt.type === 'textInput') {
      let before = this.value.substring(0, this.selectionStart);
      let after = this.value.substring(this.selectionEnd, this.value.length);
      this.value = `${before}${evt.data}${after}`;
    } else {
      super.dispatchEvent(evt);
    }
  }
}

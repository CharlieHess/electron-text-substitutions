import EventTarget from 'event-target-shim';
import {Observable} from 'rx-lite';

export default class MockContenteditable extends EventTarget {
  constructor(initialText = "") {
    super();

    this.textContent = initialText;
    this.selectionStart = initialText.length;
    this.selectionEnd = initialText.length;
  }

  inputText(text, dispatch = true) {
    let before = this.textContent.substring(0, this.selectionStart);
    let after = this.textContent.substring(this.selectionEnd, this.textContent.length);

    this.textContent = `${before}${text}${after}`;
    this.selectionStart = this.selectionEnd = this.textContent.length;

    if (dispatch) this.dispatchEvent({type: 'input'});
  }

  typeText(text) {
    return Observable.fromArray(text)
      .subscribe((character) => this.inputText(character));
  }

  clearText() {
    this.textContent = "";
    this.selectionStart = 0;
    this.selectionEnd = 0;
  }

  get value() {
    return this.textContent;
  }
  set value(value) {
    this.textContent = value;
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

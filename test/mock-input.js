import EventTarget from 'event-target-shim';
import {Observable} from 'rxjs';

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

  typeText(text) {
    return Observable.from(text)
      .subscribe((character) => this.inputText(character));
  }

  clearText() {
    this.value = "";
    this.selectionStart = 0;
    this.selectionEnd = 0;
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

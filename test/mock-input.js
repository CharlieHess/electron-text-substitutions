import EventTarget from 'event-target-shim';

export default class MockInput extends EventTarget {
  constructor(initialText = "") {
    super();
    this.value = initialText;
  }

  type(something) {
    this.value += something;
    this.dispatchEvent({type: 'input'});
  }
}

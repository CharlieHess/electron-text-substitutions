import assert from 'assert';
import {replaceQuotes} from '../src/smart-quotes';

describe('the replaceQuotes method', () => {
  it('should replace straight quotes with curly quotes', () => {

    let testCases = [
      { input: `\"`, output: `\"` },
      { input: `\"\"`, output: `“”` },
      { input: `\'`, output: `\'` },
      { input: `\'\'`, output: `‘’` },
      { input: `\'some text\'`, output: `‘some text’` },
      { input: `\"more text\"`, output: `“more text”` },
      { input: `\"\'inner quote\'`, output: `“‘inner quote’` },
      { input: `\"\'what\'s that,\' she said\"`, output: `“‘what’s that,’ she said”` },
      { input: `Hot Since \'86`, output: `Hot Since ’86` }
    ];

    for (let {input, output} of testCases) {
      assert.equal(replaceQuotes(input), output);
    }
  });
});

import assert from 'assert';
import {replaceQuotes} from '../src/smart-quotes';

describe('the replaceQuotes method', () => {
  it('should replace straight quotes with curly quotes', () => {
    let testCases = [
      { input: `\"`, output: `\"` },
      { input: `\"\"`, output: `“\"` },
      { input: `“\"\"`, output: `“”\"` },
      { input: `“”\" `, output: `“”” ` },
      { input: `“ \" `, output: `“ “ ` },
      { input: `a\"b`, output: `a”b` },
      { input: `\"a\" `, output: `“a” ` },
      { input: `\n\"\n`, output: `\n“\n` },

      { input: `\'`, output: `\'` },
      { input: `\'\'`, output: `\'\'` },
      { input: `\'a`, output: `‘a` },
      { input: `\'a\' `, output: `‘a’ ` },
      { input: `can\'t`, output: `can\'t` },
      { input: `can\'t `, output: `can’t ` },

      { input: `\"\'who?`, output: `“‘who?` },
      { input: `here it is,\' `, output: `here it is,’ ` },
      { input: `\"O\'Doyle rules!\" `, output: `“O’Doyle rules!” ` },
      { input: `\"\'what\'s that,\' she said\" `, output: `“‘what’s that,’ she said” ` },
      { input: `end of one\" \"start of another`, output: `end of one” “start of another` }
    ];

    for (let {input, output} of testCases) {
      assert.equal(replaceQuotes(input), output);
    }
  });
});

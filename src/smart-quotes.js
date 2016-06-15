/**
 * replaceQuotes - description
 *
 * @param  {type} input description
 * @return {type}       description
 */
export function replaceQuotes(input) {
  return input
    .replace(/(\W|^)"(\S)/g, '$1\u201c$2')                                       // beginning "
    .replace(/(\u201c[^"]*)"([^"]*$|[^\u201c"]*\u201c)/g, '$1\u201d$2')          // ending "
    .replace(/([^0-9])"/g,'$1\u201d')                                            // remaining " at end of word
    .replace(/(\W|^)'(\S)/g, '$1\u2018$2')                                       // beginning '
    .replace(/([a-z])'([a-z])/ig, '$1\u2019$2')                                  // conjunction's possession
    .replace(/((\u2018[^']*)|[a-z])'([^0-9]|$)/ig, '$1\u2019$3')                 // ending '
    .replace(/(\u2018)([0-9]{2}[^\u2019]*)(\u2018([^0-9]|$)|$|\u2019[a-z])/ig, '\u2019$2$3'); // abbrev. years like '93
}

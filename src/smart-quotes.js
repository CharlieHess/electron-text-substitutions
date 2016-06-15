/**
 * Used on input to progressively replace straight quotes with curly quotes.
 *
 * @param  {String} input The input string
 * @return {String}       The output string
 */
export function replaceQuotes(input) {
  return input
    .replace(/(\S)"([\S\s])/, '$1”$2')   // closing doubles
    .replace(/"([\S\s])/, '“$1')         // opening doubles
    .replace(/(\W|^)'([\w\s])/, '$1‘$2') // opening singles
    .replace(/([\S\s])'(\s)/, '$1’$2')   // closing singles
    .replace(/(\w)'(\w+\s)/, '$1’$2');   // contractions
}

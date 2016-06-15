/**
 * Creates a regular expression that will match a word and its boundaries– that
 * is, some surrounding whitespace or separator character.
 *
 * @param  {String} toReplace The string being replaced
 * @return {RegExp}           A regular expression that will match `toReplace`
 */
export function getSubstitutionRegExp(toReplace) {
  // Recreate something like \b; we don't want to use \b because no Unicode
  // support.
  let wordBoundary = `[ \n\r\t.,'\"\`\+!?«»“”„’‹›—–−-]+`;

  // Capture the word boundaries along with the word to replace, so that we
  // can preserve existing whitespace when we do the replacement.
  let atWordBoundary = `(^\|${wordBoundary})${toReplace}(${wordBoundary})`;

  return new RegExp(atWordBoundary);
}

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
    .replace(/([\S\s])'(\s)/, '$1’$2')   // closing singles
    .replace(/(\W|^)'([\w\s])/, '$1‘$2') // opening singles
    .replace(/(\w)'(\w+\s)/, '$1’$2');   // contractions
}

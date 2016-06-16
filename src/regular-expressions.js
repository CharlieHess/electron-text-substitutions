export const openingSingleQuote = '\u2018'; // ‘
export const closingSingleQuote = '\u2019'; // ’

export const openingDoubleQuote = '\u201c'; // “
export const closingDoubleQuote = '\u201d'; // ”

/**
 * @typedef {Object} ReplacementItem
 * @property {String} regExp       A regular expression that matches the text to replace
 * @property {String} replacement  The replacement text
 */

/**
 * Creates a regular expression that will match a word and its boundaries– that
 * is, some surrounding whitespace or separator character.
 *
 * @param  {String} match     The string to match
 * @return {ReplacementItem}  A replacement item; contains a `RegExp` and its replacement
 */
export function getSubstitutionRegExp(match, replacement) {
  // Recreate something like \b; we don't want to use \b because no Unicode
  // support.
  let wordBoundary = `[ \n\r\t.,'\"\`\+!?«»“”„’‹›—–−-]+`;

  // Capture the word boundaries to align with `formatReplacement`
  let regExp = new RegExp(`(^\|${wordBoundary})${match}(${wordBoundary})`);

  return { regExp, replacement };
}

/**
 * Returns an array of regular expressions that will progressively replace
 * straight quotes with curly quotes.
 *
 * @return {Array<ReplacementItem>}  An array of replacement items
 */
export function getSmartQuotesRegExp() {
  return [
    { regExp: /(\S)"([\S\s])/, replacement: closingDoubleQuote },
    { regExp: /()"([\S\s])/, replacement: openingDoubleQuote },
    { regExp: /([\S\s])'(\s)/, replacement: closingSingleQuote },
    { regExp: /(\W|^)'([\w\s])/, replacement: openingSingleQuote },
    { regExp: /(\w)'(\w+\s)/, replacement: closingSingleQuote }
  ];
}

export function getSmartDashesRegExp() {
  return [];
}

/**
 * Preserves whitespace around the match. These expressions match the text
 * being substituted along with boundaries on the left ($1) and right ($2).
 */
export function formatReplacement(match, replacement) {
  let [, left, right] = match;
  return `${left}${replacement}${right}`;
}

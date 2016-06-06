import {isRegExp} from 'lodash';

/**
 * Substitutes a text string for another in a given input string, preserving
 * whitespace around the string being replaced.
 *
 * @param  {String}         input         The input string
 * @param  {String|RegExp}  toReplace     The string being replaced, or a regex that will match it
 * @param  {String}         replacement   The replacement
 * @return {String}                       The output string
 */
export function substituteText(input, toReplace, replacement) {
  let regex = isRegExp(toReplace) ?
    toReplace :
    getSubstitutionRegex(toReplace);

  let replacementFormat = `$1${replacement}$3`;

  return input.replace(regex, replacementFormat);
}

/**
 * Creates a regular expression that will match a word and its boundaries– that
 * is, some surrounding whitespace or separator character.
 *
 * @param  {String} toReplace The string being replaced
 * @return {RegExp}           A regular expression that will match `toReplace`
 */
export function getSubstitutionRegex(toReplace) {
  // Recreate something like \b; we don't want to use \b because no Unicode
  // support.
  let wordBoundary = `[ \n\r\t.,'\"\+!?-]+`;

  // Capture the word boundaries along with the word to replace, so that we
  // can preserve existing whitespace when we do the replacement.
  let atWordBoundary = `(^\|${wordBoundary})(${toReplace})(${wordBoundary})`;

  return new RegExp(atWordBoundary);
}

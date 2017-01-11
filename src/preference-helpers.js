import electron from 'electron';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';

const systemPreferences = process.type === 'browser' ?
  electron.systemPreferences :
  electron.remote.systemPreferences;

const userDefaultsTextSubstitutionsKey = 'NSUserDictionaryReplacementItems';
const userDefaultsSmartQuotesKey = 'NSAutomaticQuoteSubstitutionEnabled';
const userDefaultsSmartDashesKey = 'NSAutomaticDashSubstitutionEnabled';

const textPreferenceChangedKeys = [
  'IMKTextReplacementDidChangeNotification',
  'NSAutomaticQuoteSubstitutionEnabledChanged',
  'NSAutomaticDashSubstitutionEnabledChanged'
];

/**
 * Returns the current text substitution preferences.
 *
 * @return {Object}
 * @return {Object}.substitutions   An array of text substitutions
 * @return {Object}.useSmartQuotes  True if smart quotes are enabled
 * @return {Object}.useSmartDashes  True if smart dashes are enabled
 */
export function readSystemTextPreferences() {
  return {
    substitutions: systemPreferences.getUserDefault(userDefaultsTextSubstitutionsKey, 'array') || [],
    useSmartQuotes: systemPreferences.getUserDefault(userDefaultsSmartQuotesKey, 'boolean'),
    useSmartDashes: systemPreferences.getUserDefault(userDefaultsSmartDashesKey, 'boolean')
  };
}

/**
 * Calls the provided method whenever text substitutions change.
 *
 * @param  {Function} callback  The method to call
 * @return {Subscription}       Manages the event listener
 */
export function onPreferenceChanged(callback) {
  if (!process || process.type !== 'browser') throw new Error(`Not in an Electron browser context`);
  if (process.platform !== 'darwin') throw new Error(`Only supported on macOS`);

  return Observable.from(textPreferenceChangedKeys)
    .mergeMap((key) => observableForPreferenceChanged(key))
    .debounceTime(100)
    .subscribe(callback);
}

/**
 * Create an Observable that will emit when the given macOS system
 * notification fires.
 *
 * @param  {String} preferenceChangedKey  The key to listen for
 * @return {Observable}                   The cold Observable
 */
function observableForPreferenceChanged(preferenceChangedKey) {
  return Observable.create((subj) => {
    const subscriberId = systemPreferences.subscribeNotification(preferenceChangedKey, () => {
      subj.next(preferenceChangedKey);
    });

    return new Subscription(() => systemPreferences.unsubscribeNotification(subscriberId));
  });
}
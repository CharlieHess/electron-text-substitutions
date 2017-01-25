import assert from 'assert';
import {readSystemTextPreferences} from '../src/preference-helpers';
import {containsRemoteObject} from './contains-remote-object';

describe('the readSystemTextPreferences method', () => {
  it('should not return remote objects', () => {
    assert(!containsRemoteObject(readSystemTextPreferences()));
  });
});
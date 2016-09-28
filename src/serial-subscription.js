import {Subscription} from 'rxjs/Subscription';

/**
 * @export
 * @class SerialSubscription
 * Mimics behavior of SerialDisposable in RxJS v4,
 * allows to add only single subscription. If new subscription's added,
 * existing subscription will be unsubscribed.
 *
 * By design of RxJS v5 it is no longer recommended to manage subscription
 * imperatively vis various kind of subscription, reason it only have single
 * kind of composite subscription. This implementation is for interop between
 * existing codebases.
 * @extends {Subscription}
 */
export class SerialSubscription extends Subscription {
  _currentSubscription = null;

  /**
   * Adds a tear down to be called during the unsubscribe() of this
   * Subscription.
   *
   * If there's existing subscription, it'll be unsubscribed and
   * removed.
   *
   * @param {TeardownLogic} teardown The additional logic to execute on
   * teardown.
   * @return {Subscription} Returns the Subscription used or created to be
   * added to the inner subscriptions list. This Subscription can be used with
   * `remove()` to remove the passed teardown logic from the inner subscriptions
   * list.
   */
  add(teardown) {
    if (this._currentSubscription) {
      this.remove(this._currentSubscription);
      this._currentSubscription.unsubscribe();
      this._currentSubscription = null;
    }

    super.add(this._currentSubscription = teardown);
  }
}
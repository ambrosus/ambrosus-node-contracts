/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {utils} from 'web3';

export class AmbrosusError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InsufficientFundsToUploadBundleError extends AmbrosusError {
  constructor(fee, balance) {
    super(`Insufficient funds: need at least ${utils.fromWei(fee, 'ether')} to upload the bundle. Balance: ${utils.fromWei(balance, 'ether')}`);
  }
}

export class InsufficientFundsToStartChallengeError extends AmbrosusError {
  constructor(fee, balance) {
    super(`Insufficient funds: need at least ${utils.fromWei(fee, 'ether')} to start a challenge. Balance: ${utils.fromWei(balance, 'ether')}`);
  }
}

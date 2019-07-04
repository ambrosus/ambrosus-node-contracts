/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import {utils} from '../utils/web3_tools';

export default class ChallengeTask extends TaskBase {
  constructor(challengeActions) {
    super();
    this.challengeActions = challengeActions;
  }


  async execute([command, ...options]) {
    if (command === 'start') {
      return this.start(options[0], options[1]);
    }
    if (command === 'resolve') {
      return this.resolve(options[0]);
    }
    if (command === 'expire') {
      return this.expire(options[0]);
    }
    if (command === 'status') {
      return this.status(options[0]);
    }
    if (command === 'nextPenalty') {
      return this.nextPenalty(options[0]);
    }
    if (command === 'help') {
      this.printUsage();
    } else {
      console.error('Unknown sub-command, see yarn task challenges help');
      process.exit(1);
    }
  }

  is64DigitsHexString(value) {
    return /^0x[0-9a-f]{64}$/i.exec(value) !== null;
  }

  validateAddress(address) {
    if (!utils.isAddress(address)) {
      throw `Invalid address: ${address}`;
    }
  }

  validateId(validatedId) {
    if (!this.is64DigitsHexString(validatedId)) {
      throw `Invalid Id: ${validatedId}`;
    }
  }

  printUsage() {
    console.log(`
Usage: yarn task challenges [start/expire/status]
Options:
  - start [sheltererAddress bundleId]
  - resolve [challengeId]
  - expire [challengeId]
  - status [challengeId]
  - nextPenalty [sheltererAddress]`);
  }

  async start(sheltererId, bundleId) {
    this.validateAddress(sheltererId);
    this.validateId(bundleId);
    const {transactionHash, challengeId} = await this.challengeActions.startChallenge(sheltererId, bundleId);
    console.log(`Challenge with ID = ${challengeId} has been created. 
Transaction ID - ${transactionHash}`);
  }

  async resolve(challengeId) {
    this.validateId(challengeId);
    await this.challengeActions.challengeWrapper.resolve(challengeId);
    console.log('Challenge resolved');
  }

  async expire(challengeId) {
    this.validateId(challengeId);
    const {transactionHash} = await this.challengeActions.markAsExpired(challengeId);
    console.log(`Challenge successfully marked as expired.
Transaction ID - ${transactionHash}`);
  }

  async status(challengeId) {
    this.validateId(challengeId);
    const status = await this.challengeActions.challengeStatus(challengeId);
    if (!status.isInProgress) {
      console.log(`There is no challenge with ID = ${challengeId} being in progress right now`);
      return;
    }
    console.log(`Challenge with ID = ${challengeId} is in progress.`);
    if (status.canResolve) {
      console.log('And it can be resolved by you.');
    } else {
      console.log('However, it cannot be resolved by you at the moment.');
    }
    if (status.isTimedOut) {
      console.log(`This challenge is past its expiration date and has not been resolved. 
You can now mark it as expired.`);
    }
  }

  async nextPenalty(sheltererId) {
    this.validateAddress(sheltererId);
    const penalty = await this.challengeActions.nextPenalty(sheltererId);
    console.log(`Potential penalty for ${sheltererId} is ${utils.fromWei(penalty, 'ether')} AMB`);
  }

  help() {
    return {
      options: '[start sheltererAddress bundleId], [resolve/expire/status challengeId], [nextPenalty sheltererAddress]',
      description: 'creates and manages challenges'
    };
  }
}

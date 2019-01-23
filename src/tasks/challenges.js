/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import {utils} from '../utils/web3_tools';

export default class ChallengesTask extends TaskBase {
  constructor(challengesActions) {
    super();
    this.challengesActions = challengesActions;
  }


  async execute([command, ...options]) {
    if (command === 'start') {
      await this.start(options[0], options[1]);
    } else if (command === 'expire') {
      await this.expire(options[0]);
    } else if (command === 'status') {
      await this.status(options[0]);
    } else if (command === 'help') {
      this.printUsage();
    } else {
      console.error('Unknown sub-command, see yarn task challenges help');
      process.exit(1);
    }
  }

  validateAddress(address) {
    if (!utils.isAddress(address)) {
      throw `Invalid address: ${address}`;
    }
  }

  validateId(validatedId) {
    if (!/^0x[0-9a-f]{64}$/i.exec(validatedId)) {
      throw `Invalid Id: ${validatedId}`;
    }
  }

  printUsage() {
    console.log(`
Usage: yarn task challenges [start/expire/status]
Options:
  - start [sheltererAddress bundleId]
  - expire [challengeId]
  - status [challengeId]`);
  }

  async start(sheltererId, bundleId) {
    this.validateAddress(sheltererId);
    this.validateId(bundleId);
    const {transactionHash, challengeId} = await this.challengesActions.startChallenge(sheltererId, bundleId);
    console.log(`Challenge with ID = ${challengeId} has been created. 
Transaction ID - ${transactionHash}`);
  }

  async expire(challengeId) {
    this.validateId(challengeId);
    const {transactionHash} = await this.challengesActions.markAsExpired(challengeId);
    console.log(`Challenge successfully marked as expired.
Transaction ID - ${transactionHash}`);
  }

  async status(challengeId) {
    this.validateId(challengeId);
    const status = await this.challengesActions.challengeStatus(challengeId);
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
      console.log(`This challenge is past its expiration date and has not been resolved :(. 
You can now mark it as expired.`);
    }
  }

  help() {
    return {
      options: '[start sheltererAddress bundleId], [expire/status challengeId]',
      description: 'creates and manages challenges'
    };
  }
}

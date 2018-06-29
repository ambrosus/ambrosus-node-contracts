/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import web3jsChai from '../../helpers/events';
import deploy from '../../helpers/deploy';

import BN from 'bn.js';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Payouts Contract', () => {
  let web3;
  let validUser;
  let targetUser;
  let otherUser;
  let payoutsStore;
  let payouts;

  const grantChallengeResolutionReward = (beneficiary, bundleId, value, senderAddress = validUser) => payouts.methods.grantChallengeResolutionReward(beneficiary, bundleId).send({from: senderAddress, value});
  const revokeChallengeResolutionReward = (beneficiary, bundleId, refundAddress, senderAddress = validUser) => payouts.methods.revokeChallengeResolutionReward(beneficiary, bundleId, refundAddress).send({from: senderAddress});
  const available = (period, senderAddress = validUser) => payouts.methods.available(period).call({from: senderAddress});
  const withdraw = (senderAddress = validUser) => payouts.methods.withdraw().send({from: senderAddress});

  beforeEach(async () => {
    ({web3, payoutsStore, payouts} = await deploy({
      contracts: {
        payoutsStore: true, 
        payouts: true
      }
    }));
    [validUser, targetUser, otherUser] = await web3.eth.getAccounts();
  });

  describe('Granting a challenge resolution reward', () => {
    it('increases founds available for withdrawal', async () => {
      
    });

    it('can be used multiple times', async () => {
      
    });

    it(`is a contextInternalCall`, async () => {
      
    });
  });

  describe('Revoking a challenge resolution reward', () => {
    it('decreases founds available for withdrawal', async () => {
      
    });

    it('is only possible on previously granted rewards', async () => {
      
    });

    it('transfers the refund to provided address', async () => {
      
    });

    it('transfers the refund to provided address and takes withdrawals into account', async () => {
      
    });

    it(`is a contextInternalCall`, async () => {
      
    });
  });

  describe('Withdrawing', () => {
    it(`transfers available founds for  address`, async () => {
      
    });

    it(`influences return value of available`, async () => {
      
    });

    it(`doesn't allow to transfer the founds for the same period multiple times`, async () => {
      
    });
  });
});

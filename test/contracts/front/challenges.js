/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3} from '../../../src/web3_tools';
import web3jsChai from '../../helpers/events';
import BN from 'bn.js';
import {increaseTimeTo} from '../../helpers/web3_utils';
import {ONE} from '../../../src/consts';
import deploy from '../../helpers/deploy';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Challenges Contract', () => {
  let web3;
  let challenges;
  let bundleStore;
  let fees;
  let from;
  let other;
  let fee;
  const bundleId = '0xfe478a45bbb3b0abbfcbfaf7785d2ba30e6e5adbde729c9e0e613e922c2b229a';
  const expirationDate = 1600000000;

  beforeEach(async () => {
    web3 = await createWeb3();
    [from, other] = await web3.eth.getAccounts();
    ({challenges, bundleStore, fees} = await deploy({
      web3,
      contracts: {
        challenges: true,
        bundleStore: true,
        fees: true,
        sheltering: true
      }}));
    await bundleStore.methods.store(bundleId, from, expirationDate).send({from});
    const storageBlockNumber = await web3.eth.getBlockNumber();
    const storageBlock = await web3.eth.getBlock(storageBlockNumber);
    fee = new BN(await fees.methods.getFeeForChallenge(storageBlock.timestamp, expirationDate).call());
  });

  describe('Starting a challenge', () => {
    it('Creates a challenge and emits an event', async () => {
      expect(await challenges.methods.start(from, bundleId).send({from: other, value: fee})).to.emitEvent('ChallengeCreated');
    });

    it('Rejects if bundle is not being sheltered by provided account', async () => {
      await expect(challenges.methods.start(other, bundleId).send({from, value: fee})).to.be.eventually.rejected;
      expect(await challenges.methods.start(from, bundleId).send({from: other, value: fee})).to.emitEvent('ChallengeCreated');
    });

    it(`Accepts fee bigger than necessary`, async () => {
      const biggerFee = fee.add(ONE);
      expect(await challenges.methods.start(from, bundleId).send({from: other, value: biggerFee})).to.emitEvent('ChallengeCreated');
    });

    it(`Rejects if challenger hasn't provided a fee of valid value`, async () => {
      const tooSmallFee = fee.sub(ONE);
      await expect(challenges.methods.start(from, bundleId).send({from: other, value: tooSmallFee})).to.be.eventually.rejected;
    });

    it('Rejects if the challenge was added after bundle has expired', async () => {
      const expirationTime = await bundleStore.methods.getExpirationDate(bundleId).call();
      await increaseTimeTo(web3, expirationTime + 1);
      await expect(challenges.methods.start(from, bundleId).send({from: other, value: fee})).to.be.eventually.rejected;
    });

    it('Rejects if added same challenge twice', async () => {
      const firstTransaction = challenges.methods.start(from, bundleId).send({from: other, value: fee});
      await expect(challenges.methods.start(from, bundleId).send({from: other, value: fee})).to.be.eventually.rejected;
      expect(await firstTransaction).to.emitEvent('ChallengeCreated');
    });

    describe('Stores challenge correctly', () => {
      let challengeBlockTimestamp;
      let challengeId;

      beforeEach(async () => {
        await challenges.methods.start(from, bundleId).send({from: other, value: fee});
        const challengeBlockNumber = await web3.eth.getBlockNumber();
        const challengeBlock = await web3.eth.getBlock(challengeBlockNumber);
        challengeBlockTimestamp = challengeBlock.timestamp.toString();
        [challengeId] = await challenges.methods.getChallengeIds().call();
      });

      it('Shelterer id', async () => {
        expect(await challenges.methods.getChallengedShelterer(challengeId).call()).to.equal(from);
      });

      it('Bundle id', async () => {
        expect(await challenges.methods.getChallengedBundle(challengeId).call()).to.equal(bundleId);
      });

      it('Challenger id', async () => {
        expect(await challenges.methods.getChallenger(challengeId).call()).to.equal(other);
      });

      it('Challenge fee', async () => {
        expect(await challenges.methods.getChallengeFee(challengeId).call()).to.equal(fee.toString());
      });

      it('Challenge setup time', async () => {
        expect(await challenges.methods.getChallengeCreationTime(challengeId).call()).to.equal(challengeBlockTimestamp);
      });
    });
  });
});

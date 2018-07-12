/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import deploy from '../../helpers/deploy';
import {createWeb3} from '../../../src/web3_tools';
import utils from '../../helpers/utils';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import StakeStoreMockJson from '../../../build/contracts/StakeStoreMock.json';
import {ATLAS1_STAKE} from '../../../src/consts';

chai.use(chaiAsPromised);
chai.use(chaiEmitEvents);

const {expect} = chai;

describe('ShelteringTransfers Contract', () => {
  let web3;
  let shelteringTransfers;
  let bundleStore;
  let sheltering;
  let from;
  let other;
  let stakeStore;
  let notSheltering;
  let transferId;
  const bundleId = utils.keccak256('bundleId');
  const expirationDate = 1600000000;

  const store = async (bundleId, from, expirationDate) => bundleStore.methods.store(bundleId, from, expirationDate).send({from});
  const isSheltering = async (from, bundleId) => sheltering.methods.isSheltering(from, bundleId).call();
  const addShelterer = async (bundleId, other, totalReward) => sheltering.methods.addShelterer(bundleId, other, totalReward).send({from});
  const setStorageUsed = async (from, storageUsed) => stakeStore.methods.setStorageUsed(from, storageUsed).send({from});
  const depositStake = async (other, storageLimit, value) => stakeStore.methods.depositStake(other, storageLimit, 0).send({from, value});
  const startTransfer = async (bundleId) => shelteringTransfers.methods.start(bundleId).send({from});
  const resolveTransfer = async (transferId, from) => shelteringTransfers.methods.resolve(transferId).send({from});
  const cancelTransfer = async (transferId, from) => shelteringTransfers.methods.cancel(transferId).send({from});
  const transferIsInProgress = async (transferId) => shelteringTransfers.methods.transferIsInProgress(transferId).call();
  const getDonor = async (transferId) => shelteringTransfers.methods.getDonor(transferId).call();
  const getTransferredBundle = async (transferId) => shelteringTransfers.methods.getTransferredBundle(transferId).call();
  const getTransferId = async (from, bundleId) => shelteringTransfers.methods.getTransferId(from, bundleId).call();


  beforeEach(async () => {
    web3 = await createWeb3();
    [from, other, notSheltering] = await web3.eth.getAccounts();
    ({shelteringTransfers, bundleStore, stakeStore, sheltering} = await deploy({
      web3,
      contracts: {
        shelteringTransfers: true,
        bundleStore: true,
        sheltering: true,
        config: true,
        time: true,
        stakeStore: StakeStoreMockJson,
        payouts: true,
        payoutsStore: true
      }}));
    await store(bundleId, from, expirationDate);
    transferId = await getTransferId(from, bundleId);
  });

  describe('Starting transfer', () => {
    it('Fails if sender is not sheltering specified bundle', async () => {
      const otherBundleId = utils.keccak256('otherBundleId');
      await expect(startTransfer(otherBundleId)).to.be.eventually.rejected;
    });

    it('Fails if identical transfer already exists', async () => {
      await expect(startTransfer(bundleId)).to.be.fulfilled;
      await expect(startTransfer(bundleId)).to.be.eventually.rejected;
    });

    it('Initializes transfer and emits an event', async () => {
      expect(await startTransfer(bundleId)).to.emitEvent('TransferStarted').withArgs({
        transferId, donorId: from, bundleId
      });
    });

    it('Transfer is in progress after successfully started', async () => {
      await startTransfer(bundleId);
      expect(await transferIsInProgress(transferId)).to.equal(true);
    });

    it('Transfer is not in progress until started', async () => {
      expect(await transferIsInProgress(transferId)).to.equal(false);
    });

    describe('Stores transfer correctly', () => {
      beforeEach(async () => {
        await startTransfer(bundleId);
      });

      it('Donor id', async () => {
        expect(await getDonor(transferId)).to.equal(from);
      });

      it('Bundle id', async () => {
        expect(await getTransferredBundle(transferId)).to.equal(bundleId);
      });
    });

    describe('Resolving a transfer', () => {
      const storageLimit = 10;
      const storageUsed = 1;
      const totalReward = 100;

      beforeEach(async () => {
        await startTransfer(bundleId);
        await setStorageUsed(from, storageUsed);
        await depositStake(other, storageLimit, ATLAS1_STAKE);
      });

      it('Fails if the transfer does not exist', async () => {
        await expect(resolveTransfer(utils.keccak256('nonExistingTransferId'), other)).to.be.eventually.rejected;
      });

      it('Fails to resolve if recipient is sheltering this bundle', async () => {
        await addShelterer(bundleId, other, totalReward);
        await expect(resolveTransfer(transferId, other)).to.be.eventually.rejected;
      });

      it('Fails to resolve if recipient has no sheltering capacity', async () => {
        await setStorageUsed(other, storageLimit);
        await expect(resolveTransfer(transferId, other)).to.be.eventually.rejected;
      });

      it('Fails to resolve if recipient did not deposit stake', async () => {
        await expect(resolveTransfer(transferId, notSheltering)).to.be.eventually.rejected;
      });

      it('Emits ShelteringTransferred event', async () => {
        expect(await resolveTransfer(transferId, other)).to.emitEvent('TransferResolved').withArgs({
          donorId: from,
          recipientId: other,
          bundleId
        });
      });

      it('Removes donor from shelterers of the bundle', async () => {
        expect(await isSheltering(from, bundleId)).to.be.true;
        await resolveTransfer(transferId, other);
        expect(await isSheltering(from, bundleId)).to.be.false;
      });

      it('Adds recipient to shelterers of the bundle', async () => {
        expect(await isSheltering(other, bundleId)).to.be.false;
        await resolveTransfer(transferId, other);
        expect(await isSheltering(other, bundleId)).to.be.true;
      });

      it('Removes the transfer from store', async () => {
        await resolveTransfer(transferId, other);
        expect(await getDonor(transferId)).to.equal('0x0000000000000000000000000000000000000000');
        expect(utils.hexToUtf8(await getTransferredBundle(transferId))).to.equal('');
        expect(await transferIsInProgress(transferId)).to.be.false;
      });

      it.skip('Revokes reward grant on the donor', async () => {

      });

      it.skip('Grants reward to the recipient', async () => {

      });
    });
  });

  describe('Cancelling a transfer', () => {
    beforeEach(async () => {
      await startTransfer(bundleId);
    });

    it('Removes transfer', async () => {
      await cancelTransfer(transferId, from);
      expect(await transferIsInProgress(transferId)).to.be.false;
      expect(await getDonor(transferId)).to.equal('0x0000000000000000000000000000000000000000');
      expect(utils.hexToUtf8(await getTransferredBundle(transferId))).to.equal('');
    });

    it('Emits TransferCancelled event', async () => {
      expect(await cancelTransfer(transferId, from)).to.emitEvent('TransferCancelled').withArgs({
        transferId,
        donorId: from,
        bundleId
      });
    });

    it('Fails if the transfer does not exist', async () => {
      await expect(cancelTransfer(utils.keccak256('nonExistingTransferId'), from)).to.be.eventually.rejected;
    });

    it('Only transfer creator can cancel', async () => {
      await expect(cancelTransfer(transferId, other)).to.be.eventually.rejected;
    });
  });
});

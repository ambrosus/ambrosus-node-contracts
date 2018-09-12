/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import deploy from '../../helpers/deploy';
import {createWeb3, makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import AtlasStakeStoreMockJson from '../../../build/contracts/AtlasStakeStoreMock.json';
import {ATLAS1_STAKE, ATLAS1_STORAGE_LIMIT} from '../../../src/consts';

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
  let notStaking;
  let notSheltering;
  let atlasStakeStore;
  let transferId;
  const bundleId = utils.keccak256('bundleId');
  const expirationDate = 1600000000;
  const totalReward = 100;
  let snapshotId;

  const store = async (bundleId, from, expirationDate) => bundleStore.methods.store(bundleId, from, expirationDate).send({from});
  const isSheltering = async (from, bundleId) => sheltering.methods.isSheltering(from, bundleId).call();
  const addShelterer = async (bundleId, other, totalReward) => sheltering.methods.addShelterer(bundleId, other, totalReward).send({from});
  const setStorageUsed = async (from, storageUsed) => atlasStakeStore.methods.setStorageUsed(from, storageUsed).send({from});
  const depositStake = async (other, storageLimit, value) => atlasStakeStore.methods.depositStake(other, storageLimit).send({from, value});
  const startTransfer = async (bundleId, other) => shelteringTransfers.methods.start(bundleId).send({from: other});
  const resolveTransfer = async (transferId, from) => shelteringTransfers.methods.resolve(transferId).send({from});
  const cancelTransfer = async (transferId, from) => shelteringTransfers.methods.cancel(transferId).send({from});
  const transferIsInProgress = async (transferId) => shelteringTransfers.methods.transferIsInProgress(transferId).call();
  const getDonor = async (transferId) => shelteringTransfers.methods.getDonor(transferId).call();
  const getTransferredBundle = async (transferId) => shelteringTransfers.methods.getTransferredBundle(transferId).call();
  const getTransferId = async (from, bundleId) => shelteringTransfers.methods.getTransferId(from, bundleId).call();

  before(async () => {
    web3 = await createWeb3();
    [from, other, notSheltering, notStaking] = await web3.eth.getAccounts();
    ({shelteringTransfers, bundleStore, atlasStakeStore, sheltering} = await deploy({
      web3,
      contracts: {
        shelteringTransfers: true,
        bundleStore: true,
        sheltering: true,
        config: true,
        time: true,
        atlasStakeStore: AtlasStakeStoreMockJson,
        payouts: true,
        payoutsStore: true
      }}));
    await store(bundleId, from, expirationDate);
    transferId = await getTransferId(other, bundleId);
    await depositStake(other, ATLAS1_STORAGE_LIMIT, ATLAS1_STAKE);
    await addShelterer(bundleId, other, totalReward);
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('Starting transfer', () => {
    it('Fails if sender is not sheltering specified bundle', async () => {
      const otherBundleId = utils.keccak256('otherBundleId');
      await expect(startTransfer(otherBundleId, other)).to.be.eventually.rejected;
    });

    it('Fails if identical transfer already exists', async () => {
      await expect(startTransfer(bundleId, other)).to.be.fulfilled;
      await expect(startTransfer(bundleId, other)).to.be.eventually.rejected;
    });

    it('Initializes transfer and emits an event', async () => {
      expect(await startTransfer(bundleId, other)).to.emitEvent('TransferStarted').withArgs({
        transferId, donorId: other, bundleId
      });
    });

    it('Transfer is in progress after successfully started', async () => {
      await startTransfer(bundleId, other);
      expect(await transferIsInProgress(transferId)).to.equal(true);
    });

    it('Transfer is not in progress until started', async () => {
      expect(await transferIsInProgress(transferId)).to.equal(false);
    });

    describe('Stores transfer correctly', () => {
      beforeEach(async () => {
        await startTransfer(bundleId, other);
      });

      it('Donor id', async () => {
        expect(await getDonor(transferId)).to.equal(other);
      });

      it('Bundle id', async () => {
        expect(await getTransferredBundle(transferId)).to.equal(bundleId);
      });
    });

    describe('Resolving a transfer', () => {
      const storageLimit = 10;
      const storageUsed = 1;

      beforeEach(async () => {
        await startTransfer(bundleId, other);
        await setStorageUsed(notSheltering, storageUsed);
        await depositStake(notSheltering, storageLimit, ATLAS1_STAKE);
      });

      it('Fails if the transfer does not exist', async () => {
        await expect(resolveTransfer(utils.keccak256('nonExistingTransferId'), notSheltering)).to.be.eventually.rejected;
      });

      it('Fails to resolve if recipient is sheltering this bundle', async () => {
        await addShelterer(bundleId, notSheltering, totalReward);
        await expect(resolveTransfer(transferId, notSheltering)).to.be.eventually.rejected;
      });

      it('Fails to resolve if recipient has no sheltering capacity', async () => {
        await setStorageUsed(notSheltering, storageLimit);
        await expect(resolveTransfer(transferId, notSheltering)).to.be.eventually.rejected;
      });

      it('Fails to resolve if recipient did not deposit stake', async () => {
        await expect(resolveTransfer(transferId, notStaking)).to.be.eventually.rejected;
      });

      it('Emits ShelteringTransferred event', async () => {
        expect(await resolveTransfer(transferId, notSheltering)).to.emitEvent('TransferResolved').withArgs({
          donorId: other,
          recipientId: notSheltering,
          bundleId
        });
      });

      it('Removes donor from shelterers of the bundle', async () => {
        expect(await isSheltering(bundleId, other)).to.be.true;
        await resolveTransfer(transferId, notSheltering);
        expect(await isSheltering(bundleId, other)).to.be.false;
      });

      it('Adds recipient to shelterers of the bundle', async () => {
        expect(await isSheltering(bundleId, notSheltering)).to.be.false;
        await resolveTransfer(transferId, notSheltering);
        expect(await isSheltering(bundleId, notSheltering)).to.be.true;
      });

      it('Removes the transfer from store', async () => {
        await resolveTransfer(transferId, notSheltering);
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
      await startTransfer(bundleId, other);
    });

    it('Removes transfer', async () => {
      await cancelTransfer(transferId, other);
      expect(await transferIsInProgress(transferId)).to.be.false;
      expect(await getDonor(transferId)).to.equal('0x0000000000000000000000000000000000000000');
      expect(utils.hexToUtf8(await getTransferredBundle(transferId))).to.equal('');
    });

    it('Emits TransferCancelled event', async () => {
      expect(await cancelTransfer(transferId, other)).to.emitEvent('TransferCancelled').withArgs({
        transferId,
        donorId: other,
        bundleId
      });
    });

    it('Fails if the transfer does not exist', async () => {
      await expect(cancelTransfer(utils.keccak256('nonExistingTransferId'), other)).to.be.eventually.rejected;
    });

    it('Only transfer creator can cancel', async () => {
      await expect(cancelTransfer(transferId, notSheltering)).to.be.eventually.rejected;
    });
  });
});

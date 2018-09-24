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
import {ATLAS1_STAKE, HERMES, ATLAS, PAYOUT_PERIOD_UNIT} from '../../../src/consts';
import TimeMockJson from '../../../build/contracts/TimeMock.json';

chai.use(chaiAsPromised);
chai.use(chaiEmitEvents);

const {expect} = chai;

describe('ShelteringTransfers Contract', () => {
  let web3;
  let shelteringTransfers;
  let sheltering;
  let rolesStore;
  let atlasStakeStore;
  let payoutsStore;
  let time;
  let deployer;
  let hermes;
  let atlas;
  let notSheltering;
  let notStaking;
  let transferId;
  const bundleId = utils.keccak256('bundleId');
  const storagePeriods = 1;
  const storageLimit = 10;
  const totalReward = 1000000;
  let snapshotId;
  const bundleUploadTimestamp = PAYOUT_PERIOD_UNIT * 12.6;
  const transferTimestamp = PAYOUT_PERIOD_UNIT * 21.1;

  const startTransfer = async (bundleId, sender) => shelteringTransfers.methods.start(bundleId).send({from: sender});
  const resolveTransfer = async (transferId, sender) => shelteringTransfers.methods.resolve(transferId).send({from: sender});
  const cancelTransfer = async (transferId, sender) => shelteringTransfers.methods.cancel(transferId).send({from: sender});
  const transferIsInProgress = async (transferId) => shelteringTransfers.methods.transferIsInProgress(transferId).call();
  const getDonor = async (transferId) => shelteringTransfers.methods.getDonor(transferId).call();
  const getTransferredBundle = async (transferId) => shelteringTransfers.methods.getTransferredBundle(transferId).call();
  const getTransferId = async (donor, bundleId) => shelteringTransfers.methods.getTransferId(donor, bundleId).call();

  const setRole = async (targetId, role, sender = deployer) => rolesStore.methods.setRole(targetId, role).send({from: sender});
  const addShelterer = async (bundleId, sheltererId, totalReward, sender = deployer) => sheltering.methods.addShelterer(bundleId, sheltererId).send({from: sender, value: totalReward});
  const isSheltering = async (sheltererId, bundleId) => sheltering.methods.isSheltering(sheltererId, bundleId).call();
  const getShelteringExpirationDate = async (bundleId, sheltererId) => sheltering.methods.getShelteringExpirationDate(bundleId, sheltererId).call();
  const storeBundle = async (bundleId, uploader, storagePeriods, sender = deployer) => sheltering.methods.storeBundle(bundleId, uploader, storagePeriods).send({from: sender});
  const setStorageUsed = async (sheltererId, storageUsed, sender = deployer) => atlasStakeStore.methods.setStorageUsed(sheltererId, storageUsed).send({from: sender});
  const depositStake = async (atlasId, storageLimit, value, sender = deployer) => atlasStakeStore.methods.depositStake(atlasId, storageLimit).send({from: sender, value});
  const currentPayoutPeriod = async () => time.methods.currentPayoutPeriod().call();
  const availablePayout = async (beneficiaryId, payoutPeriod) => payoutsStore.methods.available(beneficiaryId, payoutPeriod).call();
  const setTimestamp = async (timestamp, sender = deployer) => time.methods.setCurrentTimestamp(timestamp).send({from: sender});

  const timestampToPayoutPeriod = (timestamp) => Math.floor(timestamp / PAYOUT_PERIOD_UNIT);

  before(async () => {
    web3 = await createWeb3();
    [deployer, hermes, atlas, notSheltering, notStaking] = await web3.eth.getAccounts();
    ({shelteringTransfers, atlasStakeStore, sheltering, rolesStore, time, payoutsStore} = await deploy({
      web3,
      sender: deployer,
      contracts: {
        shelteringTransfers: true,
        shelteringTransfersStore: true,
        bundleStore: true,
        sheltering: true,
        config: true,
        time: TimeMockJson,
        atlasStakeStore: AtlasStakeStoreMockJson,
        payouts: true,
        payoutsStore: true,
        rolesStore: true
      }
    }));
    await setTimestamp(bundleUploadTimestamp);
    await setRole(hermes, HERMES);
    await setRole(atlas, ATLAS);
    await setRole(notSheltering, ATLAS);
    await depositStake(atlas, storageLimit, ATLAS1_STAKE);
    await depositStake(notSheltering, storageLimit, ATLAS1_STAKE);
    await storeBundle(bundleId, hermes, storagePeriods);
    await addShelterer(bundleId, atlas, totalReward);
    transferId = await getTransferId(atlas, bundleId);
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
      await expect(startTransfer(otherBundleId, atlas)).to.be.eventually.rejected;
    });

    it('Fails if identical transfer already exists', async () => {
      await expect(startTransfer(bundleId, atlas)).to.be.fulfilled;
      await expect(startTransfer(bundleId, atlas)).to.be.eventually.rejected;
    });

    it('Initializes transfer and emits an event', async () => {
      expect(await startTransfer(bundleId, atlas)).to.emitEvent('TransferStarted').withArgs(
        {
          transferId,
          donorId: atlas,
          bundleId
        });
    });

    it('Transfer is in progress after successfully started', async () => {
      await startTransfer(bundleId, atlas);
      expect(await transferIsInProgress(transferId)).to.equal(true);
    });

    it('Transfer is not in progress until started', async () => {
      expect(await transferIsInProgress(transferId)).to.equal(false);
    });

    describe('Stores transfer correctly', () => {
      beforeEach(async () => {
        await startTransfer(bundleId, atlas);
      });

      it('Donor id', async () => {
        expect(await getDonor(transferId)).to.equal(atlas);
      });

      it('Bundle id', async () => {
        expect(await getTransferredBundle(transferId)).to.equal(bundleId);
      });
    });

    describe('Resolving a transfer', () => {
      const storageUsed = 1;

      beforeEach(async () => {
        await setStorageUsed(notSheltering, storageUsed);
        await setTimestamp(transferTimestamp);
        await startTransfer(bundleId, atlas);
      });

      it('Fails if the transfer does not exist', async () => {
        await expect(resolveTransfer(utils.keccak256('nonExistingTransferId'), notSheltering)).to.be.eventually.rejected;
      });

      it('Fails to resolve if recipient is already sheltering this bundle', async () => {
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
          donorId: atlas,
          recipientId: notSheltering,
          bundleId
        });
      });

      it('Removes donor from shelterers of the bundle', async () => {
        expect(await isSheltering(bundleId, atlas)).to.be.true;
        await resolveTransfer(transferId, notSheltering);
        expect(await isSheltering(bundleId, atlas)).to.be.false;
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

      it('Transfers granted reward from donor to recipient', async () => {
        const periodToCheck = parseInt(await currentPayoutPeriod(), 10) + 1;
        expect(await availablePayout(atlas, periodToCheck)).to.not.equal('0');
        expect(await availablePayout(notSheltering, periodToCheck)).to.equal('0');
        await resolveTransfer(transferId, notSheltering);
        expect(await availablePayout(atlas, periodToCheck)).to.equal('0');
        expect(await availablePayout(notSheltering, periodToCheck)).to.not.equal('0');
      });

      it('keeps the same bundle expiration period for the recipient', async () => {
        const before = parseInt(await getShelteringExpirationDate(bundleId, atlas), 10);
        await resolveTransfer(transferId, notSheltering);
        const after = parseInt(await getShelteringExpirationDate(bundleId, notSheltering), 10);
        expect(timestampToPayoutPeriod(after)).to.equal(timestampToPayoutPeriod(before));
      });
    });
  });

  describe('Cancelling a transfer', () => {
    beforeEach(async () => {
      await startTransfer(bundleId, atlas);
    });

    it('Removes transfer', async () => {
      await cancelTransfer(transferId, atlas);
      expect(await transferIsInProgress(transferId)).to.be.false;
      expect(await getDonor(transferId)).to.equal('0x0000000000000000000000000000000000000000');
      expect(utils.hexToUtf8(await getTransferredBundle(transferId))).to.equal('');
    });

    it('Emits TransferCancelled event', async () => {
      expect(await cancelTransfer(transferId, atlas)).to.emitEvent('TransferCancelled').withArgs({
        transferId,
        donorId: atlas,
        bundleId
      });
    });

    it('Fails if the transfer does not exist', async () => {
      await expect(cancelTransfer(utils.keccak256('nonExistingTransferId'), atlas)).to.be.eventually.rejected;
    });

    it('Only transfer creator can cancel', async () => {
      await expect(cancelTransfer(transferId, notSheltering)).to.be.eventually.rejected;
    });
  });
});

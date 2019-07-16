/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  HERMES,
  ATLAS,
  ATLAS1_RELATIVE_STRENGTH,
  ATLAS1_STAKE,
  ATLAS2_RELATIVE_STRENGTH,
  ATLAS2_STAKE,
  ATLAS3_RELATIVE_STRENGTH,
  ATLAS3_STAKE,
  FIRST_PHASE_DURATION,
  ROUND_DURATION
} from '../../../src/constants';
import deploy from '../../helpers/deploy';
import {createWeb3, deployContract, makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import AtlasStakeStoreMockJson from '../../../src/contracts/AtlasStakeStoreMock.json';
import ChallengesStoreMockJson from '../../../src/contracts/ChallengesStoreMock.json';
import {PAYOUT_PERIOD_UNIT} from '../../helpers/consts';
import TimeMockJson from '../../../src/contracts/TimeMock.json';
import BN from 'bn.js';
import {expectEventEmission} from '../../helpers/web3EventObserver';
import DmpAlgorithmAdapterJson from '../../../src/contracts/DmpAlgorithmAdapter.json';

chai.use(chaiAsPromised);
chai.use(chaiEmitEvents);

const {expect} = chai;

describe('ShelteringTransfers Contract', () => {
  let web3;
  let shelteringTransfers;
  let transfersEventEmitter;
  let DmpAlgorithmAdapter;
  let sheltering;
  let rolesStore;
  let challenges;
  let atlasStakeStore;
  let payoutsStore;
  let roles;
  let kycWhitelist;
  let time;
  let fees;
  let deployer;
  let hermes;
  let atlas;
  let notStaking;
  let notSheltering;
  let transferId;
  let resolver;
  const bundleId = utils.keccak256('bundleId');
  const storagePeriods = 1;
  const totalReward = 1000000;
  let snapshotId;
  const bundleUploadTimestamp = PAYOUT_PERIOD_UNIT * 12.6;
  const transferTimestamp = PAYOUT_PERIOD_UNIT * 21.1;

  const startTransfer = async (bundleId, sender) => shelteringTransfers.methods.start(bundleId).send({from: sender});
  const resolveTransfer = async (transferId, sender) => shelteringTransfers.methods.resolve(transferId).send({from: sender, gasPrice: '0'});
  const cancelTransfer = async (transferId, sender) => shelteringTransfers.methods.cancel(transferId).send({from: sender});
  const transferIsInProgress = async (transferId) => shelteringTransfers.methods.transferIsInProgress(transferId).call();
  const getDonor = async (transferId) => shelteringTransfers.methods.getDonor(transferId).call();
  const getTransferredBundle = async (transferId) => shelteringTransfers.methods.getTransferredBundle(transferId).call();
  const getTransferId = async (donor, bundleId) => shelteringTransfers.methods.getTransferId(donor, bundleId).call();
  const canResolve = async (resolver, transferId) => shelteringTransfers.methods.canResolve(resolver, transferId).call();
  const getTransferDesignatedShelterer = async (transferId) => shelteringTransfers.methods.getTransferDesignatedShelterer(transferId).call();
  const getTransferCreationTime = async (transferId) => shelteringTransfers.methods.getTransferCreationTime(transferId).call();

  const startChallenge = async (sheltererId, bundleId, challengerId, fee) => challenges.methods.start(sheltererId, bundleId).send({from: challengerId, value: fee});
  const getFeeForChallenge = async (storagePeriods) => fees.methods.getFeeForChallenge(storagePeriods).call();
  const setRole = async (targetId, role, sender = deployer) => rolesStore.methods.setRole(targetId, role).send({from: sender});
  const addShelterer = async (bundleId, sheltererId, totalReward, sender = deployer) => sheltering.methods.addShelterer(bundleId, sheltererId).send({from: sender, value: totalReward});
  const removeShelterer = async (bundleId, sheltererId, refundAddress, sender = deployer) => sheltering.methods.removeShelterer(bundleId, sheltererId, refundAddress).send({from: sender});
  const isSheltering = async (sheltererId, bundleId) => sheltering.methods.isSheltering(sheltererId, bundleId).call();
  const getShelteringExpirationDate = async (bundleId, sheltererId) => sheltering.methods.getShelteringExpirationDate(bundleId, sheltererId).call();
  const storeBundle = async (bundleId, uploader, storagePeriods, sender = deployer) => sheltering.methods.storeBundle(bundleId, uploader, storagePeriods).send({from: sender});
  const depositStake = async (atlasId, value, sender = deployer) => atlasStakeStore.methods.depositStake(atlasId).send({from: sender, value});
  const currentPayoutPeriod = async () => time.methods.currentPayoutPeriod().call();
  const availablePayout = async (beneficiaryId, payoutPeriod) => payoutsStore.methods.available(beneficiaryId, payoutPeriod).call();
  const setTimestamp = async (timestamp, sender = deployer) => time.methods.setCurrentTimestamp(timestamp).send({from: sender});
  const setNumberOfStakers = async (numberOfStakers, sender = deployer) => atlasStakeStore.methods.setNumberOfStakers(numberOfStakers).send({from: sender});
  const removeLastStaker = async (nodeId, amount, sender = deployer) => atlasStakeStore.methods.removeLastStaker(nodeId, amount).send({from: sender});
  const transferSheltering = async (bundleId, donorId, recipientId, sender = deployer) => sheltering.methods.transferSheltering(bundleId, donorId, recipientId).send({from: sender});

  const timestampToPayoutPeriod = (timestamp) => Math.floor(timestamp / PAYOUT_PERIOD_UNIT);

  before(async () => {
    web3 = await createWeb3();
    [deployer, hermes, atlas, notSheltering, notStaking] = await web3.eth.getAccounts();
    ({shelteringTransfers, atlasStakeStore, sheltering, rolesStore, time, payoutsStore, challenges, fees, transfersEventEmitter, kycWhitelist, roles} = await deploy({
      web3,
      sender: deployer,
      contracts: {
        shelteringTransfers: true,
        shelteringTransfersStore: true,
        challenges: true,
        challengesStore: ChallengesStoreMockJson,
        bundleStore: true,
        fees: true,
        sheltering: true,
        atlasStakeStore: AtlasStakeStoreMockJson,
        apolloDepositStore: true,
        time: TimeMockJson,
        roles: true,
        kycWhitelist: true,
        kycWhitelistStore: true,
        config: true,
        payouts: true,
        payoutsStore: true,
        rolesStore: true,
        challengesEventEmitter: true,
        transfersEventEmitter: true,
        rolesEventEmitter: true
      }
    }));
    DmpAlgorithmAdapter = await deployContract(web3, DmpAlgorithmAdapterJson);
    await setTimestamp(bundleUploadTimestamp);
    await setRole(hermes, HERMES);
    await setRole(atlas, ATLAS);
    await setRole(notSheltering, ATLAS);
    await depositStake(notSheltering, ATLAS1_STAKE);
    await depositStake(atlas, ATLAS3_STAKE);
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

    it('Fails if the donor is being challenged with this bundle', async () => {
      const userChallengeFee = new BN(await getFeeForChallenge(storagePeriods));
      await startChallenge(atlas, bundleId, notSheltering, userChallengeFee);
      await expect(startTransfer(bundleId, atlas)).to.be.eventually.rejected;
    });

    it('Transfer is in progress after successfully started', async () => {
      await startTransfer(bundleId, atlas);
      expect(await transferIsInProgress(transferId)).to.equal(true);
    });

    it('Transfer is not in progress until started', async () => {
      expect(await transferIsInProgress(transferId)).to.equal(false);
    });

    it('Emits proper event', async () => {
      await expectEventEmission(
        web3,
        () => startTransfer(bundleId, atlas),
        transfersEventEmitter,
        'TransferStarted',
        {
          donorId: atlas,
          bundleId
        }
      );
    });

    describe('Stores transfer correctly', () => {
      beforeEach(async () => {
        await setTimestamp(transferTimestamp);
        await startTransfer(bundleId, atlas);
      });

      it('Donor id', async () => {
        expect(await getDonor(transferId)).to.equal(atlas);
      });

      it('Bundle id', async () => {
        expect(await getTransferredBundle(transferId)).to.equal(bundleId);
      });

      it('Creation time', async () => {
        expect(await getTransferCreationTime(transferId)).to.equal(transferTimestamp.toString());
      });
    });
  });

  describe('Resolving a transfer', () => {
    beforeEach(async () => {
      let currentTimestamp = transferTimestamp;
      await setTimestamp(transferTimestamp);
      await startTransfer(bundleId, atlas);
      await setNumberOfStakers(2);

      while (true) {
        resolver = await getTransferDesignatedShelterer(transferId);
        if (resolver !== atlas) {
          break;
        }
        currentTimestamp += 3*3600;
        await setTimestamp(currentTimestamp);
      }
    });

    it('canResolve returns true if transfer can be resolved', async () => {
      expect(await canResolve(resolver, transferId)).to.equal(true);
    });

    it('Fails if the transfer does not exist', async () => {
      await expect(resolveTransfer(utils.keccak256('nonExistingTransferId'), resolver)).to.be.eventually.rejected;
    });

    it('Fails to resolve if recipient is already sheltering this bundle', async () => {
      await addShelterer(bundleId, resolver, totalReward);
      await expect(resolveTransfer(transferId, resolver)).to.be.eventually.rejected;
    });

    it('Fails to resolve if recipient did not deposit stake', async () => {
      await expect(resolveTransfer(transferId, notStaking)).to.be.eventually.rejected;
    });

    it('Removes donor from shelterers of the bundle', async () => {
      expect(await isSheltering(bundleId, atlas)).to.be.true;
      await resolveTransfer(transferId, resolver);
      expect(await isSheltering(bundleId, atlas)).to.be.false;
    });

    it('Adds recipient to shelterers of the bundle', async () => {
      expect(await isSheltering(bundleId, resolver)).to.be.false;
      await resolveTransfer(transferId, resolver);
      expect(await isSheltering(bundleId, resolver)).to.be.true;
    });

    it('Emits proper event', async () => {
      await expectEventEmission(
        web3,
        () => resolveTransfer(transferId, resolver),
        transfersEventEmitter,
        'TransferResolved',
        {
          donorId: atlas,
          bundleId,
          recipientId: resolver
        }
      );
    });

    it('Removes the transfer from store', async () => {
      await resolveTransfer(transferId, resolver);
      expect(await getDonor(transferId)).to.equal('0x0000000000000000000000000000000000000000');
      expect(utils.hexToUtf8(await getTransferredBundle(transferId))).to.equal('');
      expect(await transferIsInProgress(transferId)).to.be.false;
    });

    it('Transfers granted reward from donor to recipient', async () => {
      const periodToCheck = parseInt(await currentPayoutPeriod(), 10) + 1;
      expect(await availablePayout(atlas, periodToCheck)).to.not.equal('0');
      expect(await availablePayout(resolver, periodToCheck)).to.equal('0');
      await resolveTransfer(transferId, resolver);
      expect(await availablePayout(atlas, periodToCheck)).to.equal('0');
      expect(await availablePayout(resolver, periodToCheck)).to.not.equal('0');
    });

    it('keeps the same bundle expiration period for the recipient', async () => {
      const before = parseInt(await getShelteringExpirationDate(bundleId, atlas), 10);
      await resolveTransfer(transferId, resolver);
      const after = parseInt(await getShelteringExpirationDate(bundleId, resolver), 10);
      expect(timestampToPayoutPeriod(after)).to.equal(timestampToPayoutPeriod(before));
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

    it('Emits proper event', async () => {
      await expectEventEmission(
        web3,
        () => cancelTransfer(transferId, atlas),
        transfersEventEmitter,
        'TransferCancelled',
        {
          donorId: atlas,
          bundleId
        }
      );
    });

    it('Fails if the transfer does not exist', async () => {
      await expect(cancelTransfer(utils.keccak256('nonExistingTransferId'), atlas)).to.be.eventually.rejected;
    });

    it('Only transfer creator can cancel', async () => {
      await expect(cancelTransfer(transferId, notSheltering)).to.be.eventually.rejected;
    });
  });
});

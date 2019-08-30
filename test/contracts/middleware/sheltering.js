/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import observeBalanceChange from '../../helpers/web3BalanceObserver';
import {createWeb3, makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
import deploy from '../../helpers/deploy';
import {ATLAS, HERMES} from '../../../src/constants';
import {STORAGE_PERIOD_UNIT, PAYOUT_PERIOD_UNIT} from '../../helpers/consts';
import TimeMockJson from '../../../src/contracts/TimeMock.json';
import AtlasStakeStoreMockJson from '../../../src/contracts/AtlasStakeStoreMock.json';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;
const bundleId = utils.asciiToHex('bundleId');
const storagePeriods = 1;
const totalReward = 100000;

describe('Sheltering Contract', () => {
  let web3;
  let deployer;
  let hermes;
  let atlas;
  let atlas2;
  let other;
  let bundleStore;
  let sheltering;
  let rolesStore;
  let time;
  let payoutsStore;
  let atlasStakeStore;
  let snapshotId;
  const atlasStake = 100;
  const bundleUploadTimestamp = PAYOUT_PERIOD_UNIT * 34.2;

  const isSheltering = async (bundleId, shelterer) => sheltering.methods.isSheltering(bundleId, shelterer).call();
  const shelteringExpirationDate = async (bundleId, shelterer) =>
    sheltering.methods.getShelteringExpirationDate(bundleId, shelterer).call();
  const getBundleUploadBlockNumber = async (bundleId) =>
    sheltering.methods.getBundleUploadBlockNumber(bundleId).call();
  const getShelteringCap = async () =>
    sheltering.methods.getShelteringCap().call();
  const getBundleShelterersCount = async (bundleId) =>
    sheltering.methods.getBundleShelterersCount(bundleId).call();
  const storeBundle = async (bundleId, uploader, storagePeriods, sender = deployer) =>
    sheltering.methods.storeBundle(bundleId, uploader, storagePeriods).send({from: sender});
  const addShelterer = async (bundleId, shelterer, amount, sender = deployer) =>
    sheltering.methods.addShelterer(bundleId, shelterer).send({from: sender, value: amount});
  const addSheltererReward = async (shelterer, bundleId, reward, sender = deployer) =>
    sheltering.methods.addSheltererReward(shelterer, bundleId).send({from: sender, value: reward});
  const removeShelterer = async (bundleId, shelterer, refundAddress, sender = deployer) =>
    sheltering.methods.removeShelterer(bundleId, shelterer, refundAddress).send({from: sender});
  const penalizeShelterer = async (shelterer, refundAddress, sender = deployer) =>
    sheltering.methods.penalizeShelterer(shelterer, refundAddress).send({from: sender});
  const transferSheltering = async (bundleId, donorId, recipientId, sender = deployer) =>
    sheltering.methods.transferSheltering(bundleId, donorId, recipientId).send({from: sender});

  const setRole = async (targetId, role, sender = deployer) =>
    rolesStore.methods.setRole(targetId, role).send({from: sender});
  const getShelterers = async (bundleId) => bundleStore.methods.getShelterers(bundleId).call();
  const getShelteredBundlesCount = async (staker) => atlasStakeStore.methods.getShelteredBundlesCount(staker).call();
  const getStake = async (staker) => atlasStakeStore.methods.getStake(staker).call();
  const getPenaltiesHistory = async (staker) => atlasStakeStore.methods.getPenaltiesHistory(staker).call();
  const depositStake = async (staker, value, sender = deployer) =>
    atlasStakeStore.methods.depositStake(staker).send({from: sender, value});
  const injectBundleWithBundleStore = async (bundleId, uploader, storagePeriods, currentTimestamp, sender = deployer) =>
    bundleStore.methods.store(bundleId, uploader, storagePeriods, currentTimestamp).send({from: sender});
  const injectSheltererWithBundleStore = async (bundleId, shelterer, reward, payoutPeriodsReduction, currentTimestamp, sender = deployer) =>
    bundleStore.methods.addShelterer(bundleId, shelterer, reward, payoutPeriodsReduction, currentTimestamp).send({from: sender});
  const getCurrentPayoutPeriod = async () => time.methods.currentPayoutPeriod().call();
  const availablePayout = async (beneficiaryId, payoutPeriod) => payoutsStore.methods.available(beneficiaryId, payoutPeriod).call();
  const setTimestamp = async (timestamp, sender = deployer) => time.methods.setCurrentTimestamp(timestamp).send({from: sender});
  const setNumberOfStakers = async (numberOfStakers) => atlasStakeStore.methods.setNumberOfStakers(numberOfStakers).send({from: deployer});


  const expectBalanceChange = async (account, amount, codeBlock) => expect((await observeBalanceChange(web3, account, codeBlock)).toString()).to.eq(amount.toString());
  const timestampToPayoutPeriod = (timestamp) => Math.floor(timestamp / PAYOUT_PERIOD_UNIT);

  before(async () => {
    web3 = await createWeb3();
    [deployer, hermes, atlas, atlas2, other] = await web3.eth.getAccounts();
    ({bundleStore, sheltering, atlasStakeStore, rolesStore, payoutsStore, time} = await deploy({
      web3,
      sender: deployer,
      contracts: {
        rolesStore: true,
        bundleStore: true,
        sheltering: true,
        atlasStakeStore: AtlasStakeStoreMockJson,
        payouts: true,
        payoutsStore: true,
        config: true,
        time: TimeMockJson,
        fees: true
      }
    }));
    await setRole(hermes, HERMES);
    await setRole(atlas, ATLAS);
    await setTimestamp(bundleUploadTimestamp);
    await depositStake(atlas, atlasStake);
    await depositStake(atlas2, atlasStake);
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('isSheltering', () => {
    it(`returns false if account isn't bundle's shelterer`, async () => {
      expect(await isSheltering(bundleId, hermes)).to.equal(false);
    });

    it(`returns false if account is not bundle's shelterer`, async () => {
      expect(await isSheltering(bundleId, hermes)).to.equal(false);
      await injectBundleWithBundleStore(bundleId, hermes, storagePeriods, bundleUploadTimestamp);
      expect(await isSheltering(bundleId, hermes)).to.equal(false);
    });

    it(`returns true if account is bundle's shelterer`, async () => {
      expect(await isSheltering(bundleId, other)).to.equal(false);
      await injectBundleWithBundleStore(bundleId, hermes, storagePeriods, bundleUploadTimestamp);
      await injectSheltererWithBundleStore(bundleId, other, totalReward, 0, bundleUploadTimestamp);
      expect(await isSheltering(bundleId, other)).to.equal(true);
    });

    it('returns false if sheltering has expired', async () => {
      await injectBundleWithBundleStore(bundleId, hermes, storagePeriods, bundleUploadTimestamp);
      await injectSheltererWithBundleStore(bundleId, other, totalReward, 0, bundleUploadTimestamp);
      await setTimestamp('2500000000');
      expect(await isSheltering(bundleId, other)).to.equal(false);
    });
  });

  describe('Storing', () => {
    it('adds bundle to bundleStore', async () => {
      const transaction = await storeBundle(bundleId, hermes, storagePeriods);
      expect(await bundleStore.methods.getUploader(bundleId).call()).to.equal(hermes);
      expect(await bundleStore.methods.getStoragePeriodsCount(bundleId).call()).to.equal(storagePeriods.toString());
      expect(await getBundleUploadBlockNumber(bundleId)).to.equal(transaction.blockNumber.toString());
    });

    it(`fails if already stored`, async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await expect(storeBundle(bundleId, hermes, storagePeriods)).to.be.eventually.rejected;
    });

    it(`fails if already stored (different expiration date)`, async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await expect(storeBundle(bundleId, hermes, storagePeriods + 3)).to.be.eventually.rejected;
    });

    it('fails if not a context internal call', async () => {
      await expect(storeBundle(bundleId, hermes, storagePeriods, other)).to.be.eventually.rejected;
    });

    it('only hermes can upload a bundle', async () => {
      await expect(storeBundle(bundleId, atlas, storagePeriods)).to.be.eventually.rejected;
    });

    it('is context internal', async () => {
      await expect(storeBundle(bundleId, hermes, storagePeriods, other)).to.be.eventually.rejected;
      await expect(storeBundle(bundleId, hermes, storagePeriods, deployer)).to.be.eventually.fulfilled;
    });
  });

  describe('Adding shelterer', () => {
    beforeEach(async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
    });

    it(`adds store entry`, async () => {
      expect(await getShelterers(bundleId)).to.not.include(atlas);
      await addShelterer(bundleId, atlas, totalReward);
      expect(await getShelterers(bundleId)).to.include(atlas);
    });

    it('grants reward', async () => {
      const currentPayoutPeriod = parseInt(await getCurrentPayoutPeriod(), 10);
      expect(await availablePayout(atlas, currentPayoutPeriod + 2)).to.equal('0');
      await addShelterer(bundleId, atlas, totalReward);
      expect(await availablePayout(atlas, currentPayoutPeriod + 2)).to.equal('6000'); // 100000 * 0.78 / 13 = 6000
    });

    it(`fails if already sheltered`, async () => {
      await addShelterer(bundleId, atlas, totalReward);
      await expect(addShelterer(bundleId, atlas, totalReward)).to.be.eventually.rejected;
    });

    it('fails if not an atlas', async () => {
      await expect(addShelterer(bundleId, other, totalReward)).to.be.eventually.rejected;
    });

    it(`increments storage used`, async () => {
      expect(await getShelteredBundlesCount(atlas)).to.equal('0');
      await addShelterer(bundleId, atlas, totalReward);
      expect(await getShelteredBundlesCount(atlas)).to.equal('1');
    });

    it('cannot add not atlas as a shelterer', async () => {
      await expect(addShelterer(bundleId, other, totalReward)).to.be.eventually.rejected;
    });

    it('is context internal', async () => {
      await expect(addShelterer(bundleId, atlas, totalReward, other)).to.be.eventually.rejected;
    });
  });

  describe('Adding shelterer reward', () => {
    beforeEach(async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
    });

    it('grants reward', async () => {
      const currentPayoutPeriod = parseInt(await getCurrentPayoutPeriod(), 10);
      expect(await availablePayout(atlas, currentPayoutPeriod + 2)).to.equal('0');
      await addShelterer(bundleId, atlas, totalReward);
      await addSheltererReward(atlas, bundleId, totalReward);
      expect(await availablePayout(atlas, currentPayoutPeriod + 2)).to.equal('12000'); // 2* (100000 * 0.78 / 13) = 12000
    });

    it(`fails if not sheltered`, async () => {
      await expect(addSheltererReward(atlas, bundleId, totalReward)).to.be.eventually.rejected;
    });

    it('fails if not an atlas', async () => {
      await addShelterer(bundleId, atlas, totalReward);
      await expect(addSheltererReward(other, bundleId, totalReward)).to.be.eventually.rejected;
    });

    it(`not increments storage used`, async () => {
      expect(await getShelteredBundlesCount(atlas)).to.equal('0');
      await addShelterer(bundleId, atlas, totalReward);
      expect(await getShelteredBundlesCount(atlas)).to.equal('1');
      await addSheltererReward(atlas, bundleId, totalReward);
      expect(await getShelteredBundlesCount(atlas)).to.equal('1');
    });

    it('is not context internal', async () => {
      await addShelterer(bundleId, atlas, totalReward);
      await expect(addSheltererReward(atlas, bundleId, totalReward, other)).to.be.eventually.fulfilled;
    });
  });

  describe('Removing shelterer', () => {
    beforeEach(async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await addShelterer(bundleId, atlas, totalReward);
    });

    it('fails if not a shelterer of a bundle', async () => {
      await expect(removeShelterer(bundleId, other, other)).to.eventually.be.rejected;
      await expect(removeShelterer(bundleId, atlas, other)).to.eventually.be.fulfilled;
    });

    it(`removes store entry`, async () => {
      expect(await getShelterers(bundleId)).to.include(atlas);
      await removeShelterer(bundleId, atlas, atlas);
      expect(await getShelterers(bundleId)).to.not.include(atlas);
    });

    it(`decrements storage used`, async () => {
      expect(await getShelteredBundlesCount(atlas)).to.equal('1');
      await removeShelterer(bundleId, atlas, atlas);
      expect(await getShelteredBundlesCount(atlas)).to.equal('0');
    });

    it('removes grant and returns funds to provided address', async () => {
      const currentPayoutPeriod = parseInt(await getCurrentPayoutPeriod(), 10);
      expect(await availablePayout(atlas, currentPayoutPeriod + 2)).to.equal('6000'); // 100000 * 0.78 / 13 = 6000
      await expectBalanceChange(atlas, totalReward.toString(), async () => removeShelterer(bundleId, atlas, atlas));
      expect(await availablePayout(atlas, currentPayoutPeriod + 2)).to.equal('0');
    });

    it('is context internal', async () => {
      await expect(removeShelterer(bundleId, atlas, atlas, atlas)).to.be.eventually.rejected;
    });
  });

  describe('Penalizing the shelterer', () => {
    const firstPenalty = atlasStake / 100;
    const secondPenalty = firstPenalty * 2;
    const thirdPenalty = secondPenalty * 2;
    const fourthPenalty = thirdPenalty * 2;

    beforeEach(async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await addShelterer(bundleId, atlas, totalReward);
    });

    it('sends penalty to refund address', async () => {
      await expectBalanceChange(other, firstPenalty, () => penalizeShelterer(atlas, other));
    });

    it('penalty rises exponentially', async () => {
      await expectBalanceChange(other, firstPenalty, () => penalizeShelterer(atlas, other));
      await expectBalanceChange(other, secondPenalty, () => penalizeShelterer(atlas, other));
      await expectBalanceChange(other, thirdPenalty, () => penalizeShelterer(atlas, other));
      await expectBalanceChange(other, fourthPenalty, () => penalizeShelterer(atlas, other));
      const cumulatedPenalty = firstPenalty + secondPenalty + thirdPenalty + fourthPenalty;
      expect(await getStake(atlas)).to.eq((atlasStake - cumulatedPenalty).toString());
    });

    it('cannot have negative stake', async () => {
      await penalizeShelterer(atlas, other);
      await penalizeShelterer(atlas, other);
      await penalizeShelterer(atlas, other);
      await penalizeShelterer(atlas, other);
      await penalizeShelterer(atlas, other);
      await penalizeShelterer(atlas, other);
      await penalizeShelterer(atlas, other);
      expect(await getStake(other)).to.eq('0');
      await penalizeShelterer(atlas, other);
      expect(await getStake(other)).to.eq('0');
    });

    it('penalties are updated after slashing', async () => {
      let blockTime = bundleUploadTimestamp;
      await penalizeShelterer(atlas, other);
      expect(await getPenaltiesHistory(atlas)).to.deep.include({
        lastPenaltyTime: blockTime.toString(),
        penaltiesCount: '1'
      });

      blockTime++;
      await setTimestamp(blockTime);
      await penalizeShelterer(atlas, other);
      expect(await getPenaltiesHistory(atlas)).to.deep.include({
        lastPenaltyTime: blockTime.toString(),
        penaltiesCount: '2'
      });

      blockTime++;
      await setTimestamp(blockTime);
      await penalizeShelterer(atlas, other);
      expect(await getPenaltiesHistory(atlas)).to.deep.include({
        lastPenaltyTime: blockTime.toString(),
        penaltiesCount: '3'
      });
    });

    it('isContextInternal', async () => {
      await expect(penalizeShelterer(atlas, other, atlas)).to.be.rejected;
    });
  });

  describe('Transferring sheltering', async () => {
    const transferTimestamp = bundleUploadTimestamp + (PAYOUT_PERIOD_UNIT * 2.3); // 34.2 + 2.3 = 36.5

    beforeEach(async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await addShelterer(bundleId, atlas, totalReward);
      await setTimestamp(transferTimestamp);
    });

    describe('if successful', () => {
      it('removes donor from shelterers of the bundle', async () => {
        expect(await isSheltering(bundleId, atlas)).to.be.true;
        await transferSheltering(bundleId, atlas, atlas2);
        expect(await isSheltering(bundleId, atlas)).to.be.false;
      });

      it('adds recipient to shelterers of the bundle', async () => {
        expect(await isSheltering(bundleId, atlas2)).to.be.false;
        await transferSheltering(bundleId, atlas, atlas2);
        expect(await isSheltering(bundleId, atlas2)).to.be.true;
      });

      it('keeps a similar expiration date', async () => {
        // similar -> in the same payout period, but can have different timestamp
        const before = timestampToPayoutPeriod(await shelteringExpirationDate(bundleId, atlas));
        await transferSheltering(bundleId, atlas, atlas2);
        const after = timestampToPayoutPeriod(await shelteringExpirationDate(bundleId, atlas2));
        expect(before).to.equal(after);
      });

      it('transfers reward (not yet paid-out) to recipient', async () => {
        const firstPeriodToCheck = timestampToPayoutPeriod(transferTimestamp);
        const lastPeriodToCheck = timestampToPayoutPeriod(await shelteringExpirationDate(bundleId, atlas));

        expect(await availablePayout(atlas2, firstPeriodToCheck - 1)).to.equal('0');
        expect(await availablePayout(atlas, firstPeriodToCheck)).to.not.equal('0');
        expect(await availablePayout(atlas2, firstPeriodToCheck)).to.equal('0');

        await transferSheltering(bundleId, atlas, atlas2);

        expect(await availablePayout(atlas, lastPeriodToCheck)).to.equal('0');
        expect(await availablePayout(atlas2, lastPeriodToCheck)).to.not.equal('0');
        expect(await availablePayout(atlas2, lastPeriodToCheck + 1)).to.equal('0');
      });
    });

    describe('fails', () => {
      it('if donor is not a shelterer', async () => {
        await expect(transferSheltering(bundleId, other, atlas2)).to.eventually.be.rejected;
      });

      it('if donor and recipient are the same', async () => {
        await expect(transferSheltering(bundleId, atlas, atlas)).to.eventually.be.rejected;
      });

      it('if recipient is already a shelterer of the bundle', async () => {
        await addShelterer(bundleId, atlas2, totalReward);
        await expect(transferSheltering(bundleId, atlas, atlas2)).to.eventually.be.rejected;
      });

      it('if sheltering is expired', async () => {
        await setTimestamp(await shelteringExpirationDate(bundleId, atlas) + 1);
        await expect(transferSheltering(bundleId, atlas, atlas2)).to.eventually.be.rejected;
      });
    });

    it('is context internal', async () => {
      await expect(transferSheltering(bundleId, atlas, atlas2, other)).to.be.eventually.rejected;
      await expect(transferSheltering(bundleId, atlas, atlas2, deployer)).to.be.eventually.fulfilled;
    });
  });

  describe('getShelteringCap', () => {
    it('returns threshold when total number of atlases * 80% is below threshold', async () => {
      await setNumberOfStakers(5);
      expect(await getShelteringCap()).to.equal('8');
      await setNumberOfStakers(11);
      expect(await getShelteringCap()).to.equal('8');
    });

    it('returns total number of atlases * 80% if it is above or equals threshold', async () => {
      await setNumberOfStakers(12);
      expect(await getShelteringCap()).to.equal('9');
      await setNumberOfStakers(147);
      expect(await getShelteringCap()).to.equal('117'); // ⌊147 * 0.8⌋
    });
  });

  describe('getBundleShelterersCount', () => {
    it('returns the number of nodes sheltering the bundle', async () => {
      expect(await getBundleShelterersCount(bundleId)).to.equal('0');
      await storeBundle(bundleId, hermes, storagePeriods);
      expect(await getBundleShelterersCount(bundleId)).to.equal('0');
      await addShelterer(bundleId, atlas, totalReward);
      expect(await getBundleShelterersCount(bundleId)).to.equal('1');
    });
  });

  describe('getShelteringExpirationDate', () => {
    const payoutPeriodsReduction = 5;
    beforeEach(async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await injectSheltererWithBundleStore(bundleId, atlas, totalReward, payoutPeriodsReduction, bundleUploadTimestamp);
    });

    it('returns expiration date for a shelterer', async () => {
      const expectedExpirationDate = bundleUploadTimestamp + (storagePeriods * STORAGE_PERIOD_UNIT) - (payoutPeriodsReduction * PAYOUT_PERIOD_UNIT);
      expect(await shelteringExpirationDate(bundleId, atlas)).to.equal(expectedExpirationDate.toString());
    });

    it('returns 0 for non shelterers', async () => {
      expect(await shelteringExpirationDate(bundleId, atlas2)).to.equal('0');
    });
  });
});

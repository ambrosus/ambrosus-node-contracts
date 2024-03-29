/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import deploy from '../../helpers/deploy';
import {makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
import {createWeb3Ganache} from '../../utils/web3_tools';

chai.use(chaiEmitEvents);
chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('BundleStore Contract', () => {
  let web3;
  let deployer;
  let targetUser;
  let otherUser;
  let otherUsers;
  let bundleStore;
  let bundleId;
  let snapshotId;
  const storagePeriods = 3;
  const now = 1500000000;

  const store = async (bundleId, uploader, storagePeriods, currentTimestamp, sender = deployer) =>
    bundleStore.methods.store(bundleId, uploader, storagePeriods, currentTimestamp).send({from: sender});
  const getUploader = async (bundleId) => bundleStore.methods.getUploader(bundleId).call();
  const getUploadTimestamp = async (bundleId) => bundleStore.methods.getUploadTimestamp(bundleId).call();
  const getUploadBlockNumber = async (bundleId) => bundleStore.methods.getUploadBlockNumber(bundleId).call();
  const getShelterers = async (bundleId) => bundleStore.methods.getShelterers(bundleId).call();
  const getStoragePeriodsCount = async (bundleId) => bundleStore.methods.getStoragePeriodsCount(bundleId).call();
  const getShelteringStartDate = async (bundleId, shelterer = otherUser) => bundleStore.methods.getShelteringStartDate(bundleId, shelterer).call();
  const getTotalShelteringReward = async (bundleId, shelterer) => bundleStore.methods.getTotalShelteringReward(bundleId, shelterer).call();
  const addShelterer = async (bundleId, shelterer, totalReward, payoutPeriodsReduction, currentTimestamp, sender = deployer) =>
    bundleStore.methods.addShelterer(bundleId, shelterer, totalReward, payoutPeriodsReduction, currentTimestamp).send({from: sender});
  const getShelteringPayoutPeriodsReduction = async (bundleId, shelterer) => bundleStore.methods.getShelteringPayoutPeriodsReduction(bundleId, shelterer).call();
  const removeShelterer = async (bundleId, shelterer, sender = deployer) => bundleStore.methods.removeShelterer(bundleId, shelterer).send({from: sender});

  before(async () => {
    web3 = await createWeb3Ganache();
    [deployer, targetUser, otherUser, ...otherUsers] = await web3.eth.getAccounts();
    ({bundleStore} = await deploy({
      web3,
      contracts: {
        bundleStore: true,
        config: true
      }
    }));
    bundleId = utils.keccak256('bundleId');
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('Storing a bundle', () => {
    describe('Stores bundle correctly', () => {
      let transaction;

      beforeEach(async () => {
        transaction = await store(bundleId, targetUser, storagePeriods, now);
      });

      it('creator is saved as uploader', async () => {
        expect(await getUploader(bundleId)).to.deep.equal(targetUser);
      });

      it('stores upload timestamp', async () => {
        expect(await getUploadTimestamp(bundleId)).to.equal(now.toString());
      });

      it('initially stores 0 shelterers', async () => {
        expect(await getShelterers(bundleId)).to.deep.equal([]);
      });

      it('stores storage duration', async () => {
        expect(await getStoragePeriodsCount(bundleId)).to.equal(storagePeriods.toString());
      });

      it('reward for creator should be 0', async () => {
        expect(await getTotalShelteringReward(bundleId, targetUser)).to.equal('0');
      });

      it('stores transaction block number', async () => {
        expect(await getUploadBlockNumber(bundleId)).to.equal(transaction.blockNumber.toString());
      });
    });

    it('should emit event when bundle was added', async () => {
      expect(await store(bundleId, targetUser, 1, now))
        .to.emitEvent('BundleStored')
        .withArgs({bundleId, uploader: targetUser});
    });

    it('reject if not context internal call', async () => {
      await expect(store(bundleId, targetUser, storagePeriods, now, otherUser)).to.be.eventually.rejected;
    });

    it('reject if bundle with same id exists and has shelterers', async () => {
      await store(bundleId, targetUser, storagePeriods, now);
      await expect(store(bundleId, targetUser, storagePeriods)).to.be.eventually.rejected;
    });
  });

  describe('Add and remove shelterers', () => {
    const totalReward = 100;
    const payoutPeriodsReduction = 16;

    beforeEach(async () => {
      await store(bundleId, targetUser, storagePeriods, now);
      await addShelterer(bundleId, otherUser, totalReward, payoutPeriodsReduction, now);
    });

    it('should emit event when the shelterer was added', async () => {
      expect(await addShelterer(bundleId, targetUser, totalReward, 0, now)).to.emitEvent('SheltererAdded')
        .withArgs({bundleId, shelterer: targetUser});
      expect(await getShelterers(bundleId)).to.deep.equal([otherUser, targetUser]);
    });

    it('should emit event when the shelterer was removed', async () => {
      expect(await removeShelterer(bundleId, otherUser)).to.emitEvent('SheltererRemoved')
        .withArgs({bundleId, shelterer: otherUser});
      expect(await getShelterers(bundleId)).to.deep.equal([]);
    });

    it('adds sheltering start dates', async () => {
      const actualStartDate = await getShelteringStartDate(bundleId, otherUser);
      expect(actualStartDate).to.equal(now.toString());
    });

    it('removes sheltering start dates', async () => {
      await removeShelterer(bundleId, otherUser);
      const actualStartDate = await getShelteringStartDate(bundleId, otherUser);
      expect(actualStartDate).to.equal('0');
    });

    it('adds sheltering reward', async () => {
      const actualTotalReward = await getTotalShelteringReward(bundleId, otherUser);
      expect(actualTotalReward).to.equal(totalReward.toString());
    });

    it('removes sheltering reward', async () => {
      await removeShelterer(bundleId, otherUser);
      const actualTotalReward = await getTotalShelteringReward(bundleId, otherUser);
      expect(actualTotalReward).to.equal('0');
    });

    it('adds sheltering payout periods reduction', async () => {
      const actualPayoutPeriodsReduction = await getShelteringPayoutPeriodsReduction(bundleId, otherUser);
      expect(actualPayoutPeriodsReduction).to.equal(payoutPeriodsReduction.toString());
    });

    it('removes sheltering payout periods reduction', async () => {
      await removeShelterer(bundleId, otherUser);
      const actualPayoutPeriodsReduction = await getShelteringPayoutPeriodsReduction(bundleId, otherUser);
      expect(actualPayoutPeriodsReduction).to.equal('0');
    });

    it('should do nothing if removing address who is not a shelterer', async () => {
      const tx = await removeShelterer(bundleId, targetUser);
      expect(tx.events).to.deep.equal({});
      expect(await getShelterers(bundleId)).to.deep.equal([otherUser]);
    });

    it('rejects if add shelterer to non-existing bundle', async () => {
      const unknownBundleId = utils.asciiToHex('unknownBundleId');
      await expect(addShelterer(unknownBundleId, otherUser, totalReward, 0, now)).to.be.eventually.rejected;
    });

    it('rejects if add same shelterer twice', async () => {
      await expect(addShelterer(bundleId, otherUser, totalReward, 0, now)).to.be.eventually.rejected;
    });

    it('cannot put new bundle with same id when all shelterers are removed', async () => {
      await removeShelterer(bundleId, otherUser);
      await expect(store(bundleId, targetUser, storagePeriods)).to.be.eventually.rejected;
    });

    describe('Removing multiple shelterers', () => {
      const checkIfAllAddressesAreShelterers = async (addresses) => {
        const shelterers = await getShelterers(bundleId);
        return addresses.every((address) => shelterers.includes(address));
      };

      const addAllShelterers = async (addresses) => {
        for (const address of addresses) {
          await addShelterer(bundleId, address, totalReward, payoutPeriodsReduction, now);
        }
      };

      beforeEach(async () => {
        await addAllShelterers(otherUsers);
      });

      it('should correctly remove shelterers', async () => {
        const shuffledShelterers = [otherUsers[4], otherUsers[1], otherUsers[2], otherUsers[6], otherUsers[0], otherUsers[5], otherUsers[3]];
        for (let ind = 0; ind < shuffledShelterers.length; ind++) {
          await removeShelterer(bundleId, shuffledShelterers[ind]);
          expect(await checkIfAllAddressesAreShelterers(shuffledShelterers.slice(ind + 1))).to.be.true;
          expect(await getShelteringStartDate(bundleId, shuffledShelterers[ind])).to.equal('0');
        }
        expect(await getShelterers(bundleId)).to.deep.equal([otherUser]);
      });
    });
  });
});

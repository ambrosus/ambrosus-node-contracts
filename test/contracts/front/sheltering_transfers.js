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

chai.use(chaiAsPromised);
chai.use(chaiEmitEvents());

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

  const startTransfer = async (bundleId) => shelteringTransfers.methods.start(bundleId).send({from});
  const resolveTransfer = async (transferId, from) => shelteringTransfers.methods.resolve(transferId).send({from});

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
    await bundleStore.methods.store(bundleId, from, expirationDate, 1).send({from});
    transferId = await shelteringTransfers.methods.getTransferId(from, bundleId).call();
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
      expect(await startTransfer(bundleId)).to.emitEvent('TransferStarted');
    });

    it('Transfer is in progress after successfully started', async () => {
      await startTransfer(bundleId);
      expect(await shelteringTransfers.methods.transferIsInProgress(transferId).call({from})).to.equal(true);
    });

    it('Transfer is not in progress until started', async () => {
      expect(await shelteringTransfers.methods.transferIsInProgress(transferId).call({from})).to.equal(false);
    });

    describe('Stores transfer correctly', () => {
      beforeEach(async () => {
        await startTransfer(bundleId);
      });

      it('Donor id', async () => {
        expect(await shelteringTransfers.methods.getDonor(transferId).call({from})).to.equal(from);
      });

      it('Bundle id', async () => {
        expect(await shelteringTransfers.methods.getTransferredBundle(transferId).call({from})).to.equal(bundleId);
      });
    });

    describe('Resolving a transfer', () => {
      const storageLimit = 10;

      beforeEach(async () => {
        await startTransfer(bundleId);
        await stakeStore.methods.setStorageUsed(from, 1).send({from});
        await stakeStore.methods.depositStake(other, storageLimit, 0).send({from, value: utils.toWei('1', 'ether')});
      });

      it('Resolves a transfer correctly', async () => {
        await expect(resolveTransfer(transferId, other)).to.be.eventually.fulfilled;
      });

      it('Emits ShelteringTransferred event', async () => {
        expect(await resolveTransfer(transferId, other)).to.emitEventWithArgs('ShelteringTransferred', {
          donorId: from,
          recipientId: other,
          bundleId
        });
      });

      it('Fails if transfer with such id does not exist', async () => {
        await expect(resolveTransfer(utils.keccak256('whatever'), other)).to.be.eventually.rejected;
      });

      it('Fails to resolve if recipient is sheltering this bundle', async () => {
        await sheltering.methods.addShelterer(bundleId, other).send({from});
        await expect(resolveTransfer(transferId, other)).to.be.eventually.rejected;
      });

      it('Fails to resolve if recipient has no sheltering capacity', async () => {
        await stakeStore.methods.setStorageUsed(other, storageLimit).send({from});
        await expect(resolveTransfer(transferId, other)).to.be.eventually.rejected;
      });

      it('Fails to resolve if recipient did not deposit stake', async () => {
        await expect(resolveTransfer(transferId, notSheltering)).to.be.eventually.rejected;
      });

      it('Removes sheltering from the donor', async () => {
        expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.be.true;
        await resolveTransfer(transferId, other);
        expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.be.false;
      });

      it('Recipient acquires the sheltering', async () => {
        expect(await sheltering.methods.isSheltering(other, bundleId).call()).to.be.false;
        await resolveTransfer(transferId, other);
        expect(await sheltering.methods.isSheltering(other, bundleId).call()).to.be.true;
      });

      it('Removes the transfer from store', async () => {
        await resolveTransfer(transferId, other);
        expect(await shelteringTransfers.methods.getDonor(transferId).call()).to.equal('0x0000000000000000000000000000000000000000');
        expect(utils.hexToUtf8(await shelteringTransfers.methods.getTransferredBundle(transferId).call())).to.equal('');
        expect(await shelteringTransfers.methods.transferIsInProgress(transferId).call()).to.be.false;
      });

      xit('Revokes reward grant on the donor', async () => {

      });

      xit('Grants reward to the recipient', async () => {

      });
    });
  });
});

/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
import {createWeb3Ganache} from '../../utils/web3_tools';
import deploy from '../../helpers/deploy';

chai.use(chaiAsPromised);
const {expect} = chai;

describe('ShelteringTransfersStore Contract', () => {
  let web3;
  let snapshotId;
  let contextAddress;
  let otherAddress;
  let donorAddress;
  let shelteringTransfersStore;
  let exampleTransferId;
  const exampleBundleId = utils.keccak256('bundleId');
  const creationTime = '1500000000';

  const store = (donorId, bundleId, sender = contextAddress) =>
    shelteringTransfersStore.methods.store(donorId, bundleId, creationTime).send({from: sender});
  const remove = (transferId, sender = contextAddress) =>
    shelteringTransfersStore.methods.remove(transferId).send({from: sender});
  const getTransfer = (transferId) =>
    shelteringTransfersStore.methods.getTransfer(transferId).call();
  const getTransferId = (donorId, bundleId) =>
    shelteringTransfersStore.methods.getTransferId(donorId, bundleId).call();

  before(async () => {
    web3 = await createWeb3Ganache();
    [contextAddress, donorAddress, otherAddress] = await web3.eth.getAccounts();
    ({shelteringTransfersStore} = await deploy({
      web3,
      sender: contextAddress,
      contracts: {
        shelteringTransfersStore: true
      }
    }));
    exampleTransferId = await getTransferId(donorAddress, exampleBundleId);
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('store', () => {
    it('should store the transfer', async () => {
      await store(donorAddress, exampleBundleId);
      const storedTransfer = await getTransfer(exampleTransferId);
      expect(storedTransfer[0]).to.equal(donorAddress);
      expect(storedTransfer[1]).to.equal(exampleBundleId);
      expect(storedTransfer[2]).to.equal(creationTime);
    });

    it('should return transfer id', async () => {
      expect(await shelteringTransfersStore.methods.store(donorAddress, exampleBundleId, creationTime).call()).to.equal(exampleTransferId);
    });

    it('should be context internal', async () => {
      await expect(store(donorAddress, exampleBundleId, otherAddress)).to.be.rejected;
    });
  });

  describe('remove', () => {
    beforeEach(async () => {
      await store(donorAddress, exampleBundleId);
    });

    it('should remove transfer', async () => {
      await remove(exampleTransferId);
      const removedTransfer = await getTransfer(exampleTransferId);
      expect(removedTransfer[0]).to.equal('0x0000000000000000000000000000000000000000');
      expect(removedTransfer[1]).to.equal('0x0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('should be context internal', async () => {
      await expect(remove(exampleTransferId, otherAddress)).to.be.rejected;
    });
  });
});

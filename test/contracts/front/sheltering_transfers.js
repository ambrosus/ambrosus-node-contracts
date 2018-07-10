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

chai.use(chaiAsPromised);

const {expect} = chai;

describe('ShelteringTransfers Contract', () => {
  let web3;
  let shelteringTransfers;
  let bundleStore;
  let from;
  let transferId;
  const bundleId = utils.keccak256('bundleId');
  const expirationDate = 1600000000;

  beforeEach(async () => {
    web3 = await createWeb3();
    [from] = await web3.eth.getAccounts();
    ({shelteringTransfers, bundleStore} = await deploy({
      web3,
      contracts: {
        shelteringTransfers: true,
        bundleStore: true,
        sheltering: true,
        config: true,
        time: true
      }}));
    await bundleStore.methods.store(bundleId, from, expirationDate).send({from});
    transferId = await shelteringTransfers.methods.getTransferId(from, bundleId).call();
  });

  describe('Starting transfer', () => {
    it('Fails if sender is not sheltering specified bundle', async () => {
      const otherBundleId = utils.keccak256('otherBundleId');
      await expect(shelteringTransfers.methods.start(otherBundleId).send({from})).to.be.eventually.rejected;
    });
    
    it('Fails if identical transfer already exists', async () => {
      await expect(shelteringTransfers.methods.start(bundleId).send({from})).to.be.fulfilled;
      await expect(shelteringTransfers.methods.start(bundleId).send({from})).to.be.eventually.rejected;
    });
    
    it('Initializes transfer and emits an event', async () => {
      expect(await shelteringTransfers.methods.start(bundleId).send({from})).to.emitEvent('TransferStarted');
    });
    
    it('Transfer is in progress after successfully started', async () => {
      await shelteringTransfers.methods.start(bundleId).send({from});
      expect(await shelteringTransfers.methods.transferIsInProgress(transferId).call({from})).to.equal(true);
    });
    
    it('Transfer is not in progress until started', async () => {
      expect(await shelteringTransfers.methods.transferIsInProgress(transferId).call({from})).to.equal(false);
    });

    describe('Stores transfer correctly', () => {
      beforeEach(async () => {
        await shelteringTransfers.methods.start(bundleId).send({from});
      });
    
      it('Donor id', async () => {
        expect(await shelteringTransfers.methods.getDonor(transferId).call({from})).to.equal(from);
      });
    
      it('Bundle id', async () => {
        expect(await shelteringTransfers.methods.getTransferredBundle(transferId).call({from})).to.equal(bundleId);
      });
    });
  });
});

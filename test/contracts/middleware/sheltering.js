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
import utils from '../../helpers/utils';
import deploy from '../../helpers/deploy';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Sheltering Contract', () => {
  let web3;
  let from;
  let bundleStore;
  let sheltering;
  let bundleId;
  const expirationDate = 1600000000;

  beforeEach(async () => {
    web3 = await createWeb3();
    [from] = await web3.eth.getAccounts();
    ({bundleStore, sheltering} = await deploy({web3, contracts: {
      bundleStore: true,
      sheltering: true
    }}));
    bundleId = utils.asciiToHex('bundleId');
  });

  describe('isSheltering', () => {
    it(`returns true if account is bundle's shelterer`, async () => {
      expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.equal(false);
      await bundleStore.methods.store(bundleId, from, expirationDate).send({from});
      expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.equal(true);
    });

    it(`returns false if account isn't bundle's shelterer`, async () => {
      expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.equal(false);
    });
  });

  it('gets bundle upload date', async () => {
    const tx = await bundleStore.methods.store(bundleId, from, expirationDate).send({from});
    const {blockNumber} = tx;
    const block = await web3.eth.getBlock(blockNumber);
    expect(await sheltering.methods.getBundleUploadDate(bundleId).call()).to.equal(block.timestamp.toString());
  });

  it('gets bundle expiration date', async () => {
    await bundleStore.methods.store(bundleId, from, expirationDate).send({from});
    expect(await sheltering.methods.getBundleExpirationDate(bundleId).call()).to.equal(expirationDate.toString());
  });
});

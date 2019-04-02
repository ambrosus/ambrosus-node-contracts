/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import deploy from '../../helpers/deploy';

chai.use(chaiAsPromised);
const {expect} = chai;

describe('Multiplexer', () => {
  let web3;
  let oldOwner;
  let newOwner;
  let otherUser;
  let head;
  let multiplexer;
  let snapshotId;

  const transferOwnership = (newOwner, from = oldOwner) => multiplexer.methods.transferContractsOwnership(newOwner).send({from});

  before(async () => {
    web3 = await createWeb3();
    [oldOwner, newOwner, otherUser] = await web3.eth.getAccounts();
    ({head, multiplexer} = await deploy({
      web3,
      contracts: {
        multiplexer: true
      },
      params: {
        multiplexer: {
          owner: oldOwner
        }
      }
    }));
    head.methods.transferOwnership(multiplexer.options.address).send({from: oldOwner});
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('Transfer Ownership', () => {
    it('changes owner of the head contract', async () => {
      await transferOwnership(newOwner);
      expect(await head.methods.owner().call()).to.equal(newOwner);
    });

    it('throws when not an owner tries to change ownership', async () => {
      await expect(transferOwnership(newOwner, otherUser)).to.be.rejected;
    });
  });
});

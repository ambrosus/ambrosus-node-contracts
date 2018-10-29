/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, deployContract} from '../../../src/utils/web3_tools';
import ContextJson from '../../../src/contracts/Context.json';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Context Contract', () => {
  let web3;
  let context;
  let deployer;
  let trustedAddress;
  let catalogueAddress;
  let untrustedAddress;

  const deploy = async (sender, trustedAddresses, catalogue) => deployContract(web3, ContextJson, [trustedAddresses, catalogue], {from: sender});
  const isInternalToContext = async (contract, address) => contract.methods.isInternalToContext(address).call();
  const catalogue = async (contract) => contract.methods.catalogue().call();

  before(async () => {
    web3 = await createWeb3();
    [deployer, trustedAddress, catalogueAddress, untrustedAddress] = await web3.eth.getAccounts();
  });

  describe('constructor', () => {
    it('stores the catalogue provided in the constructor', async () => {
      context = await expect(deploy(deployer, [trustedAddress], catalogueAddress)).to.be.eventually.fulfilled;
      expect(await catalogue(context)).to.equal(catalogueAddress);
    });
  });

  describe('constructor - fail safes', () => {
    // NOTE: web3 incorrectly reports a failed deployment as successful, as a workaround we try to call a different method which should then fail.
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    it('throws if no catalogue is provided', async () => {
      context = await deploy(deployer, [trustedAddress], zeroAddress);
      await expect(catalogue(context)).to.be.eventually.rejected;
    });

    it('throws if trusted addresses are empty', async () => {
      context = await deploy(deployer, [], catalogueAddress);
      await expect(catalogue(context)).to.be.eventually.rejected;
    });
  });

  describe('isInternalToContext', () => {
    before(async () => {
      context = await deploy(deployer, [trustedAddress], catalogueAddress);
    });

    it('returns true if address is known', async () => {
      expect(await isInternalToContext(context, trustedAddress)).to.equal(true);
    });

    it('returns false only if such address is unknown', async () => {
      expect(await isInternalToContext(context, untrustedAddress)).to.equal(false);
    });
  });
});

/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3, deployContract, getDefaultAddress} from '../../src/utils/web3_tools';
import contractJsons from '../../src/contract_jsons';
import HeadWrapper from '../../src/wrappers/head_wrapper';

chai.use(chaiAsPromised);
const {expect} = chai;

describe('Head Wrapper', () => {
  let web3;
  let ownerAddress;
  let context;
  let catalogue;
  let storageCatalogue;
  let headWrapper;
  let addressesForCatalogueConstructor;
  const exampleAddress = '0x97E12BD75bdee72d4975D6df410D2d145b3d8457';
  const deployedMockContracts = {};

  const getContractConstructor = (contractJson) => contractJson.abi.find((value) => value.type === 'constructor');
  const generateAddress = () => web3.eth.accounts.create().address;
  const deployCatalogueWithMockedContracts = async () => {
    const catalogueConstructorParams = getContractConstructor(contractJsons.catalogue)
      .inputs
      .map((input) => input.name.slice(1));
    for (const paramName of catalogueConstructorParams) {
      deployedMockContracts[paramName] = generateAddress();
    }
    addressesForCatalogueConstructor = catalogueConstructorParams.map((paramName) => deployedMockContracts[paramName]);
    return await deployContract(web3, contractJsons.catalogue, addressesForCatalogueConstructor);
  };
  const deployStorageCatalogueWithNullArguments = async () => {
    const addressesForStorageCatalogueConstructor = getContractConstructor(contractJsons.storageCatalogue)
      .inputs
      .map(() => null);
    return await deployContract(web3, contractJsons.storageCatalogue, addressesForStorageCatalogueConstructor);
  };

  before(async () => {
    web3 = await createWeb3();
    ownerAddress = getDefaultAddress(web3);
    storageCatalogue = await deployStorageCatalogueWithNullArguments();
    catalogue = await deployCatalogueWithMockedContracts();
    context = await deployContract(web3, contractJsons.context, [addressesForCatalogueConstructor, catalogue.options.address, storageCatalogue.options.address]);
    const head = await deployContract(web3, contractJsons.head, [ownerAddress]);
    headWrapper = new HeadWrapper(head.options.address, web3, ownerAddress);
  });

  beforeEach(async () => {
    await headWrapper.setContext(context.options.address);
  });

  it('does not allow to get nonexistent contract address', async () => {
    await expect(headWrapper.contractAddressByName('fakeContract')).to.be.eventually.rejectedWith(Error);
  });

  it('does not allow to get internal contract address', async () => {
    await expect(headWrapper.contractAddressByName('bundleStore')).to.be.eventually.rejectedWith(Error);
  });

  it('setContext method changes the context address', async () => {
    await headWrapper.setContext(exampleAddress);
    expect((await headWrapper.context()).options.address).to.equal(exampleAddress);
  });

  it('getOwner method returns the contract owner', async () => {
    expect(await headWrapper.getOwner()).to.equal(ownerAddress);
  });

  it('context method returns the context contract instance', async () => {
    const receivedContext = await headWrapper.context();
    expect(receivedContext instanceof web3.eth.Contract).to.be.true;
    expect(receivedContext.options.address).to.equal(context.options.address);
  });

  it('catalogue method returns the catalogue contract instance', async () => {
    const receivedCatalogue = await headWrapper.catalogue();
    expect(receivedCatalogue instanceof web3.eth.Contract).to.be.true;
    expect(receivedCatalogue.options.address).to.equal(catalogue.options.address);
  });

  describe('Gets available contracts addresses and saves to cache', () => {
    const availableContractsNames = [
      'kycWhitelist',
      'roles',
      'fees',
      'challenges',
      'payouts',
      'shelteringTransfers',
      'sheltering',
      'uploads',
      'config',
      'time'
    ];

    availableContractsNames.forEach((contractName) => {
      it(contractName, async () => {
        expect(await headWrapper.contractAddressByName(contractName)).to.equal(deployedMockContracts[`${contractName}`]);
        expect(await headWrapper.cachedAddresses[`${contractName}`]).to.equal(deployedMockContracts[`${contractName}`]);
      });
    });
  });

  describe('Caching contract addresses', () => {
    it('Updates catalogue in cache after redeploy', async () => {
      await makeSureCatalogueIsCached();
      const originalCatalogue = await headWrapper.catalogue();
      await deployContextWithNewCatalogue(generateAddress());

      const catalogueAfterRedeploy = await headWrapper.catalogue();

      expect(catalogueAfterRedeploy.options.address).to.not.be.eq(originalCatalogue.options.address);
    });

    it('Updates contracts in cache after redeploy', async () => {
      const originalFeesAddress = await headWrapper.contractAddressByName('fees');

      const newCatalogue = await deployCatalogueWithMockedContracts();
      await deployContextWithNewCatalogue(newCatalogue.options.address);

      const feesAddressAfterRedeploy = await headWrapper.contractAddressByName('fees');

      expect(feesAddressAfterRedeploy).to.not.be.eq(originalFeesAddress);
    });

    async function deployContextWithNewCatalogue(newCatalogueAddress) {
      const newContext = await deployContract(web3, contractJsons.context, [addressesForCatalogueConstructor, newCatalogueAddress, storageCatalogue.options.address]);
      await headWrapper.setContext(newContext.options.address);
    }

    async function makeSureCatalogueIsCached() {
      await headWrapper.contractAddressByName('fees');
    }
  });
});



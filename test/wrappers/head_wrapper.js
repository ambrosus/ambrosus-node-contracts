/*
Copyright: Ambrosus Inc.
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
  let headContract;
  let headWrapper;
  let addressesForCatalogueConstructor;
  let addressesForStorageCatalogueConstructor;
  const exampleAddress = '0x97E12BD75bdee72d4975D6df410D2d145b3d8457';
  const deployedMockContracts = {};

  const getContractConstructor = (contractJson) => contractJson.abi.find((value) => value.type === 'constructor');
  const generateAddress = () => web3.eth.accounts.create().address;
  const deployCatalogueWithMockedContracts = async (json) => {
    const addressesForConstructor = getContractConstructor(json)
      .inputs
      .map((input) => input.name.slice(1))
      .map((paramName) => {
        const address = generateAddress();
        deployedMockContracts[paramName] = address;
        return address;
      });
    return {contract: await deployContract(web3, json, addressesForConstructor), addressesForConstructor};
  };

  const deployCatalogue = async () => {
    ({contract: storageCatalogue, addressesForConstructor: addressesForStorageCatalogueConstructor} = await deployCatalogueWithMockedContracts(contractJsons.storageCatalogue));
  };
  const deployStorageCatalogue = async () => {
    ({contract: catalogue, addressesForConstructor: addressesForCatalogueConstructor} = await deployCatalogueWithMockedContracts(contractJsons.catalogue));
  };

  before(async () => {
    web3 = await createWeb3();
    ownerAddress = getDefaultAddress(web3);
    await deployCatalogue();
    await deployStorageCatalogue();
    context = await deployContract(web3, contractJsons.context, [[...addressesForCatalogueConstructor, ...addressesForStorageCatalogueConstructor], catalogue.options.address, storageCatalogue.options.address, 12]);
    headContract = await deployContract(web3, contractJsons.head, [ownerAddress]);
    headWrapper = new HeadWrapper(headContract.options.address, web3, ownerAddress);
  });

  beforeEach(async () => {
    await headWrapper.setContext(context.options.address);
  });

  it('does not allow to get nonexistent contract address', async () => {
    await expect(headWrapper.contractAddressByName('fakeContract')).to.be.eventually.rejectedWith(Error);
  });

  it('setContext method changes the context address', async () => {
    await headWrapper.setContext(exampleAddress);
    expect((await headWrapper.context()).options.address).to.equal(exampleAddress);
  });

  it('getOwner method returns the contract owner', async () => {
    expect(await headWrapper.getOwner()).to.equal(ownerAddress);
  });

  it('address method returns the head contracts address', async () => {
    expect(headWrapper.address()).to.equal(headContract.options.address);
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

  it('storageCatalogue method returns the storage catalogue contract instance', async () => {
    const receivedStorageCatalogue = await headWrapper.storageCatalogue();
    expect(receivedStorageCatalogue instanceof web3.eth.Contract).to.be.true;
    expect(receivedStorageCatalogue.options.address).to.equal(storageCatalogue.options.address);
  });

  describe('Gets available contracts addresses and saves to cache', () => {
    const availableContractsNames = [
      'kycWhitelist',
      'roles',
      'fees',
      'time',
      'challenges',
      'payouts',
      'shelteringTransfers',
      'sheltering',
      'uploads',
      'config',
      'validatorProxy',
      'apolloDepositStore',
      'atlasStakeStore',
      'bundleStore',
      'challengesStore',
      'kycWhitelistStore',
      'payoutsStore',
      'rolesStore',
      'shelteringTransfersStore'
    ];

    availableContractsNames.forEach((contractName) => {
      it(contractName, async () => {
        expect(await headWrapper.contractAddressByName(contractName)).to.equal(deployedMockContracts[`${contractName}`]);
        expect(await headWrapper.cachedAddresses[`${contractName}`]).to.equal(deployedMockContracts[`${contractName}`]);
      });
    });
  });

  describe('Caching contract addresses', () => {
    it('Updates catalogue and storageCatalogue in cache after redeploy', async () => {
      const catalogueBefore = await headWrapper.catalogue();
      const storageCatalogueBefore = await headWrapper.storageCatalogue();

      await deployContextWithNewCatalogues();

      const catalogueAfter = await headWrapper.catalogue();
      const storageCatalogueAfter = await headWrapper.storageCatalogue();

      expect(catalogueAfter.options.address).to.not.be.eq(catalogueBefore.options.address);
      expect(storageCatalogueAfter.options.address).to.not.be.eq(storageCatalogueBefore.options.address);
    });

    it('Updates contracts in cache after redeploy', async () => {
      const feesAddressBefore = await headWrapper.contractAddressByName('fees');
      const apolloDepositStoreAddressBefore = await headWrapper.contractAddressByName('apolloDepositStore');

      await deployContextWithNewCatalogues();

      const feesAddressAfter = await headWrapper.contractAddressByName('fees');
      const apolloDepositStoreAddressAfter = await headWrapper.contractAddressByName('apolloDepositStore');

      expect(feesAddressAfter).to.not.be.eq(feesAddressBefore);
      expect(apolloDepositStoreAddressAfter).to.not.be.eq(apolloDepositStoreAddressBefore);
    });

    async function deployContextWithNewCatalogues() {
      await deployCatalogue();
      await deployStorageCatalogue();
      const newContext = await deployContract(web3, contractJsons.context, [[...addressesForCatalogueConstructor, ...addressesForStorageCatalogueConstructor], catalogue.options.address, storageCatalogue.options.address, 82]);
      await headWrapper.setContext(newContext.options.address);
    }
  });
});



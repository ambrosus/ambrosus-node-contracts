/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import DeployActions from '../../src/actions/deploy_actions';
import contractJsons, {contractSuperSpeedJsons} from '../../src/contract_jsons';
import {version} from '../../package';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Deploy Actions', () => {
  let deployActions;
  let mockDeployer;
  let mockHeadWrapper;
  let mockValidatorSetWrapper;
  let mockBlockRewardsWrapper;
  let mockValidatorProxyWrapper;
  const exampleDeployResult = 'deployResult';
  const defaultAddress = '0xbeefdead';
  const validatorProxyAddress = '0x382919';
  const contractsVersion = '0.0.58';
  const genesisContracts = {
    head: '0x92f858c22417249e4ee11b2683ef6fca7bad0555',
    validatorSet: '0xf0c80fb9fb22bef8269cb6feb9a51130288a671f',
    blockRewards: '0xEA53770a899d79a61953666c6D7Fa0DB183944aD'
  };
  const exampleStorageContracts = {
    contractA: '0x1234',
    contractB: '0xABCD'
  };

  beforeEach(() => {
    mockDeployer = {
      deploy: sinon.stub().resolves(exampleDeployResult),
      deployContract: sinon.stub(),
      sender: defaultAddress
    };

    mockHeadWrapper = {
      availableStorageCatalogueContracts: Object.keys(exampleStorageContracts),
      contractAddressByName: sinon.stub().callsFake(async (contractName) => exampleStorageContracts[contractName]),
      address: sinon.stub().returns(genesisContracts.head),
      contractsVersion: sinon.stub().returns(contractsVersion)
    };

    mockValidatorSetWrapper = {
      address: sinon.stub().returns(genesisContracts.validatorSet),
      getOwner: sinon.stub().resolves(defaultAddress)
    };

    mockBlockRewardsWrapper = {
      address: sinon.stub().returns(genesisContracts.blockRewards),
      getOwner: sinon.stub().resolves(defaultAddress)
    };

    mockValidatorProxyWrapper = {
      address: sinon.stub().returns(validatorProxyAddress),
      getOwner: sinon.stub().resolves(defaultAddress),
      transferOwnershipForValidatorSet: sinon.stub().resolves(),
      transferOwnershipForBlockRewards: sinon.stub().resolves()
    };

    deployActions = new DeployActions(mockDeployer, mockHeadWrapper, mockValidatorSetWrapper, mockBlockRewardsWrapper, mockValidatorProxyWrapper);
  });

  describe('Deploy genesis', () => {
    const exampleInitialValidators = ['0x123'];
    const exampleBaseReward = '444';

    beforeEach(() => {
      mockDeployer.deployContract.withArgs(contractJsons.head).resolves('0xhead');
      mockDeployer.deployContract.withArgs(contractJsons.validatorSet).resolves('0xVS');
      mockDeployer.deployContract.withArgs(contractJsons.blockRewards).resolves('0xBR');
    });

    it('deploys head, validatorSet and blockRewards', async () => {
      expect(await deployActions.deployGenesis(exampleInitialValidators, exampleBaseReward)).to.deep.equal({
        head: '0xhead',
        validatorSet: '0xVS',
        blockRewards: '0xBR'
      });
      expect(mockDeployer.deployContract).to.be.calledThrice;
      expect(mockDeployer.deployContract).to.be.calledWithExactly(contractJsons.head, [defaultAddress], {});
      expect(mockDeployer.deployContract).to.be.calledWithExactly(contractJsons.validatorSet, [defaultAddress, exampleInitialValidators, defaultAddress], {});
      expect(mockDeployer.deployContract).to.be.calledWithExactly(contractJsons.blockRewards, [defaultAddress, exampleBaseReward, defaultAddress], {});
    });
  });

  describe('deployInitial', () => {
    it('passes contract jsons to the deployer together with already deployed genesis addresses', async () => {
      expect(await deployActions.deployInitial()).to.equal(exampleDeployResult);
      expect(mockDeployer.deploy).to.be.calledOnceWith(contractJsons, genesisContracts, [], {multiplexer: {owner: defaultAddress}}, version);
    });

    it('overwrites some contracts in turbo mode', async () => {
      await deployActions.deployInitial(true);
      expect(mockDeployer.deploy).to.be.calledOnceWith({...contractJsons, ...contractSuperSpeedJsons}, genesisContracts, [], {multiplexer: {owner: defaultAddress}}, version);
    });
  });

  describe('deployUpdate', () => {
    let recycleStorageContractsStub;
    let regainGenesisContractsOwnershipStub;

    beforeEach(() => {
      recycleStorageContractsStub = sinon.stub(deployActions, 'recycleStorageContracts').resolves(exampleStorageContracts);
      regainGenesisContractsOwnershipStub = sinon.stub(deployActions, 'regainGenesisContractsOwnership');
    });

    afterEach(() => {
      recycleStorageContractsStub.restore();
      regainGenesisContractsOwnershipStub.restore();
    });

    it('recycles some deployed contracts, reclaims ownership and deploys the update', async () => {
      expect(await deployActions.deployUpdate()).to.equal(exampleDeployResult);
      expect(recycleStorageContractsStub).to.have.been.calledOnce;
      expect(regainGenesisContractsOwnershipStub).to.have.been.calledOnceWith();

      expect(mockDeployer.deploy).to.be.calledOnceWith(contractJsons, {...genesisContracts, ...exampleStorageContracts}, [], {multiplexer: {owner: defaultAddress}}, version);
    });

    it('overwrites some contracts in turbo mode', async () => {
      await deployActions.deployUpdate(true);
      expect(mockDeployer.deploy).to.be.calledOnceWith({...contractJsons, ...contractSuperSpeedJsons}, {...genesisContracts, ...exampleStorageContracts}, [], {multiplexer: {owner: defaultAddress}}, version);
    });
  });

  describe('recycleStorageContracts', () => {
    it('fetches as many storage catalogue contained contracts as possible', async () => {
      await expect(deployActions.recycleStorageContracts()).to.eventually.be.deep.equal(exampleStorageContracts);
      for (const contractName of mockHeadWrapper.availableStorageCatalogueContracts) {
        expect(mockHeadWrapper.contractAddressByName).to.have.been.calledWith(contractName);
      }
    });
  });

  describe('regainGenesisContractsOwnership', () => {
    describe('for validator set', () => {
      it('yields if the contract is already owned by the default address', async () => {
        await expect(deployActions.regainGenesisContractsOwnership()).to.be.fulfilled;
        expect(mockValidatorProxyWrapper.transferOwnershipForValidatorSet).to.not.be.called;
      });

      it('orders the transfer of ownership for the contract from the validator proxy if possible', async () => {
        mockValidatorSetWrapper.getOwner.resolves(validatorProxyAddress);
        await expect(deployActions.regainGenesisContractsOwnership()).to.be.fulfilled;
        expect(mockValidatorProxyWrapper.transferOwnershipForValidatorSet).to.be.calledOnceWith(defaultAddress);
      });

      it('throws if neither the validator proxy nor the default address currently own the contract', async () => {
        mockValidatorSetWrapper.getOwner.resolves('0xOTHER');
        await expect(deployActions.regainGenesisContractsOwnership()).to.be.rejected;
        expect(mockValidatorProxyWrapper.transferOwnershipForValidatorSet).to.not.be.called;
      });

      it('throws if the validator proxy owns the contract but is not owned by the default address', async () => {
        mockValidatorSetWrapper.getOwner.resolves(validatorProxyAddress);
        mockValidatorProxyWrapper.getOwner.resolves('0xOTHER');
        await expect(deployActions.regainGenesisContractsOwnership()).to.be.rejected;
        expect(mockValidatorProxyWrapper.transferOwnershipForValidatorSet).to.not.be.called;
      });
    });

    describe('for block rewardds', () => {
      it('yields if the contract is already owned by the default address', async () => {
        await expect(deployActions.regainGenesisContractsOwnership()).to.be.fulfilled;
        expect(mockValidatorProxyWrapper.transferOwnershipForBlockRewards).to.not.be.called;
      });

      it('orders the transfer of ownership for the contract from the validator proxy if possible', async () => {
        mockBlockRewardsWrapper.getOwner.resolves(validatorProxyAddress);
        await expect(deployActions.regainGenesisContractsOwnership()).to.be.fulfilled;
        expect(mockValidatorProxyWrapper.transferOwnershipForBlockRewards).to.be.calledOnceWith(defaultAddress);
      });

      it('throws if neither the validator proxy nor the default address currently own the contract', async () => {
        mockBlockRewardsWrapper.getOwner.resolves('0xOTHER');
        await expect(deployActions.regainGenesisContractsOwnership()).to.be.rejected;
        expect(mockValidatorProxyWrapper.transferOwnershipForBlockRewards).to.not.be.called;
      });

      it('throws if the validator proxy owns the contract but is not owned by the default address', async () => {
        mockBlockRewardsWrapper.getOwner.resolves(validatorProxyAddress);
        mockValidatorProxyWrapper.getOwner.resolves('0xOTHER');
        await expect(deployActions.regainGenesisContractsOwnership()).to.be.rejected;
        expect(mockValidatorProxyWrapper.transferOwnershipForBlockRewards).to.not.be.called;
      });
    });
  });
});

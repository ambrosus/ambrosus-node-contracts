/*
Copyright: Ambrosus Technologies GmbH
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

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Deploy Actions', () => {
  let deployActions;
  let mockDeployer;
  const exampleDeployResult = 'deployResult';
  const exampleDefaultAddress = '0xbeefdead';

  beforeEach(() => {
    mockDeployer = {
      deploy: sinon.stub().resolves(exampleDeployResult),
      deployContract: sinon.stub(),
      sender: exampleDefaultAddress
    };
    deployActions = new DeployActions(mockDeployer);
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
      expect(mockDeployer.deployContract).to.be.calledWithExactly(contractJsons.head, [exampleDefaultAddress], {});
      expect(mockDeployer.deployContract).to.be.calledWithExactly(contractJsons.validatorSet, [exampleDefaultAddress, exampleInitialValidators, exampleDefaultAddress], {});
      expect(mockDeployer.deployContract).to.be.calledWithExactly(contractJsons.blockRewards, [exampleDefaultAddress, exampleBaseReward, exampleDefaultAddress], {});
    });
  });

  describe('validateGenesisAddresses', () => {
    const correctAddresses = {
      head: '0x92f858c22417249e4ee11b2683ef6fca7bad0555',
      validatorSet: '0xf0c80fb9fb22bef8269cb6feb9a51130288a671f',
      blockRewards: '0xEA53770a899d79a61953666c6D7Fa0DB183944aD'
    };

    it('accepts when all contracts are fine', async () => {
      expect(() => deployActions.validateGenesisAddresses(correctAddresses)).to.not.throw();
    });

    ['head', 'validatorSet', 'blockRewards'].forEach((contractName) => {
      it(`should throw when ${contractName} is not set`, async () => {
        // eslint-disable-next-line no-unused-vars
        const {[contractName]: _, ...rest} = correctAddresses;
        expect(() => deployActions.validateGenesisAddresses(rest)).to.throw();
      });

      it(`should throw when ${contractName} is not an address`, async () => {
        expect(() => deployActions.validateGenesisAddresses({...correctAddresses, [contractName]: '0x123'})).to.throw();
      });
    });
  });

  describe('Deploy all', () => {
    const headAddress = '0x92f858c22417249e4ee11b2683ef6fca7bad0555';
    const validatorSetAddress = '0xf0c80fb9fb22bef8269cb6feb9a51130288a671f';
    const blockRewardsAddress = '0xEA53770a899d79a61953666c6D7Fa0DB183944aD';

    it('passes contract jsons to the deployer together with genesis addresses', async () => {
      expect(await deployActions.deployAll(headAddress, validatorSetAddress, blockRewardsAddress)).to.equal(exampleDeployResult);
      expect(mockDeployer.deploy).to.be.calledOnceWith(contractJsons, {head: headAddress, validatorSet: validatorSetAddress, blockRewards: blockRewardsAddress});
    });

    it('overwrites some contracts in turbo mode', async () => {
      await deployActions.deployAll(headAddress, validatorSetAddress, blockRewardsAddress, true);
      expect(mockDeployer.deploy).to.be.calledOnceWithExactly({...contractJsons, ...contractSuperSpeedJsons}, {head: headAddress, validatorSet: validatorSetAddress, blockRewards: blockRewardsAddress});
    });

    it('calls validateGenesisAddresses with correct parameters', async () => {
      const validateGenesisAddressesStub = sinon.stub(deployActions, 'validateGenesisAddresses');
      await deployActions.deployAll(headAddress, validatorSetAddress, blockRewardsAddress);
      expect(validateGenesisAddressesStub).to.be.calledOnceWithExactly({head: headAddress, validatorSet: validatorSetAddress, blockRewards: blockRewardsAddress});
      validateGenesisAddressesStub.reset();
    });
  });
});

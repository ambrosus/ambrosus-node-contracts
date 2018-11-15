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

  describe('Deploy all', () => {
    const headAddress = '0xhead';
    const validatorSetAddress = '0xvalidatorset';
    const blockRewardsAddress = '0xblockrewards';

    it('passes contract jsons to the deployer together with genesis addresses', async () => {
      expect(await deployActions.deployAll(headAddress, validatorSetAddress, blockRewardsAddress)).to.equal(exampleDeployResult);
      expect(mockDeployer.deploy).to.be.calledOnceWith(contractJsons, {head: headAddress, validatorSet: validatorSetAddress, blockRewards: blockRewardsAddress});
    });

    it('overwrites some contracts in turbo mode', async () => {
      await deployActions.deployAll(headAddress, validatorSetAddress, blockRewardsAddress, true);
      expect(mockDeployer.deploy).to.be.calledOnceWithExactly({...contractJsons, ...contractSuperSpeedJsons}, {head: headAddress, validatorSet: validatorSetAddress, blockRewards: blockRewardsAddress});
    });
  });
});

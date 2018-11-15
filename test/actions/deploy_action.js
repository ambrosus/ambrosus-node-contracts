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

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Deploy Actions', () => {
  let deployActions;
  let mockDeployer;
  const exampleDeployResult = 'deployResult';

  beforeEach(() => {
    mockDeployer = {
      deploy: sinon.stub().resolves(exampleDeployResult)
    };
    deployActions = new DeployActions(mockDeployer);
  });

  describe('Deploy', () => {
    const jsons = ['contract1', 'contract2'];
    const alreadyDeployed = ['alreadyDeployedContract'];
    const skipDeployment = ['skip'];
    const params = {gas: 1};

    it('proxies the call to the deployer and returns its result', async () => {
      expect(await deployActions.deploy(jsons, alreadyDeployed, skipDeployment, params)).to.equal(exampleDeployResult);
      expect(mockDeployer.deploy).to.be.calledOnceWith(jsons, alreadyDeployed, skipDeployment, params);
    });

    it('default arguments', async () => {
      await deployActions.deploy(jsons, alreadyDeployed);
      expect(mockDeployer.deploy).to.be.calledOnceWith(jsons, alreadyDeployed, [], {});
    });
  });
});

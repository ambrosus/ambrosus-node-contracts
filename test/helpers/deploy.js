/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import MockContextJson from '../../build/contracts/MockContext.json';
import Deployer from '../../src/deployer';
import contractJsons from '../../src/contract_jsons';
import {createWeb3, getDefaultAddress} from '../../src/utils/web3_tools';

const deploy = async (options = {}) => {
  const web3 = options.web3 || await createWeb3();
  const sender = options.sender || getDefaultAddress(web3);
  const skipDeployment = [];
  const alreadyDeployed = {};
  const jsons = {};
  const requestedContracts = {
    head: true,
    context: MockContextJson,
    catalogue: true,
    ...options.contracts};
  const params = {
    head: {
      owner: sender
    },
    ...(options.params || {})
  };

  for (const [key, json] of Object.entries(contractJsons)) {
    if (requestedContracts[key] === undefined) {
      jsons[key] = json;
      skipDeployment.push(key);
    } else if (requestedContracts[key] === true) {
      jsons[key] = json;
    } else {
      jsons[key] = requestedContracts[key];
    }
  }

  const deployer = new Deployer(web3, sender);
  const contracts = await deployer.deploy(jsons, alreadyDeployed, skipDeployment, params);

  await contracts.context.methods.addToWhitelist([sender]).send({from: sender});

  return {web3, ...contracts};
};

export default deploy;

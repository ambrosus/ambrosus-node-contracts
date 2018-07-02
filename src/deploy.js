/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Deployer from './deployer';
import {createWeb3} from './web3_tools';

console.log('Deploying contracts. This may take some time');
createWeb3().then(async (web3) => {
  const deployer = new Deployer(web3);
  const addresses = await deployer.deploy();
  Object.keys(addresses).forEach((key) => console.log(key, addresses[key].options.address));
});

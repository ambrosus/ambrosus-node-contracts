/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import MockContextJson from '../../build/contracts/MockContext.json';

import {
  DEFAULT_GAS,
  deployContract,
  getDefaultAddress
} from '../../src/web3_tools';

const deployMockContext = async (web3, head, addresses, contracts) => {
  const context = await deployContract(web3, MockContextJson.abi,
    MockContextJson.bytecode, contracts);
  await addToWhitelist(web3, context, addresses);
  await head.methods.setContext(context.options.address).
    send({
      gas: DEFAULT_GAS,
      from: getDefaultAddress(web3)
    });
  return context;
};

export const addToWhitelist = async (web3, context, addresses) => {
  await context.methods.addToWhitelist(addresses).send({from: getDefaultAddress(web3)});
};

export const removeFromWhitelist = async (web3, context, addresses) => {
  await context.methods.removeFromWhitelist(addresses).send({from: getDefaultAddress(web3)});
};

export default deployMockContext;

/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BundleRegistryJson from '../build/contracts/BundleRegistry.json';
import HeadJson from '../build/contracts/Head.json';
import ContextJson from '../build/contracts/Context.json';

import {DEFAULT_GAS, deployContract, getDefaultAddress} from './web3_tools';

export const setupContext = async (web3, head, args) => {
  const context = await deployContract(web3, ContextJson.abi,
    ContextJson.bytecode, args);
  await head.methods.setContext(context.options.address).send({
    gas: DEFAULT_GAS,
    from: getDefaultAddress(web3)
  });
  return context;
};

const deployContracts = async (web3) => {
  const head = await deployContract(web3, HeadJson.abi, HeadJson.bytecode);
  const bundleRegistry = await deployContract(web3, BundleRegistryJson.abi,
    BundleRegistryJson.bytecode,
    [head.options.address]);
  const context = await setupContext(web3, head,
    [bundleRegistry.options.address]);
  return {bundleRegistry, head, context};
};

export default deployContracts;

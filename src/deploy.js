/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BundleRegistryJson from '../build/contracts/BundleRegistry.json';
import StakeStoreJson from '../build/contracts/StakeStore.json';
import BundleStoreJson from '../build/contracts/BundleStore.json';
import HeadJson from '../build/contracts/Head.json';
import RolesJson from '../build/contracts/Roles.json';
import ContextJson from '../build/contracts/Context.json';
import KycWhitelistJson from '../build/contracts/KycWhitelist.json';

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

const deployOne = async (web3, contractJson, head) =>
  deployContract(web3, contractJson.abi, contractJson.bytecode, [head.options.address]);

const deployContracts = async (web3) => {
  const head = await deployContract(web3, HeadJson.abi, HeadJson.bytecode);
  const bundleRegistry = await deployOne(web3, BundleRegistryJson,head);
  const stakeStore = await deployOne(web3, StakeStoreJson, head);
    const roles = await deployOne(web3, RolesJson,head);
  const bundleStore = await deployContract(web3, BundleStoreJson.abi,
    BundleStoreJson.bytecode,
    [head.options.address]);
  constkycWhitelist = await deployOne(web3, KycWhitelistJson, head);

  const context = await setupContext(web3, head,
    [bundleRegistry.options.address, stakeStore.options.address, bundleStore.options.address,kycWhitelist.options.address,
  roles.options.address]);return {bundleRegistry, head, context, stakeStore, bundleStore,kycWhitelist, roles};
};

export default deployContracts;

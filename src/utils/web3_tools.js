/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Web3 from 'web3';
import config from '../../config/config';

export const DEFAULT_GAS = 10000000;

export const {utils} = new Web3();

function isValidRPCAddress(rpc) {
  return /^((?:https?)|(?:ws)):\/\//g.test(rpc);
}

function importPrivateKey(web3, conf) {
  try {
    const {nodePrivateKey} = conf;
    const account = web3.eth.accounts.privateKeyToAccount(nodePrivateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    return account;
  } catch (err) {
    throw new Error('A configuration value for web3 node private key is missing');
  }
}

export async function createWeb3(conf = config) {
  const web3 = new Web3();

  const rpc = conf.web3Rpc;
  importPrivateKey(web3, conf);

  if (!isValidRPCAddress(rpc)) {
    throw new Error(`The config value for the Parity RPC server is invalid: ${rpc}`);
  }

  web3.setProvider(rpc);
  return web3;
}

export async function makeSnapshot(web3) {
  return web3.eth.makeSnapshot();
}

export async function restoreSnapshot(web3, snapshotId) {
  return web3.eth.restoreSnapshot(snapshotId);
}

export function getDefaultAddress(web3) {
  // note: web3.eth.defaultAccount actually stores an address of the default account, and not the full account :P
  const {defaultAccount} = web3.eth;
  if (!defaultAccount) {
    throw new Error('web3 doesn\'t have a default account set. Check your configuration');
  }
  return defaultAccount;
}

export function getDefaultPrivateKey(web3) {
  const defaultAddress = getDefaultAddress(web3);
  const account = web3.eth.accounts.wallet[defaultAddress];
  return account.privateKey;
}

export function loadContract(web3, abi, address) {
  return new web3.eth.Contract(abi, address, {
    gas: DEFAULT_GAS,
    gasPrice: web3.utils.toWei('5', 'gwei')
  });
}

export async function deployContract(web3, json, args = [], options = {}) {
  const defaultAddress = getDefaultAddress(web3);
  const contract = new web3.eth.Contract(json.abi, undefined, {
    gas: DEFAULT_GAS,
    gasPrice: web3.utils.toWei('5', 'gwei')
  });
  const deploy = await contract.deploy({data: json.bytecode, arguments: args});
  await deploy.estimateGas(options); // will eventually fail if deploy is invalid

  const sent =  await deploy.send({from: defaultAddress,
    gas: DEFAULT_GAS,
    ...options
  });

  return sent;
}

export function link(contract, name, library) {
  const address = library.options.address.replace('0x', '');
  const pattern = new RegExp(`_+${name}_+`, 'g');
  contract.bytecode = contract.bytecode.replace(pattern, address);
}

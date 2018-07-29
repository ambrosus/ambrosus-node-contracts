/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Web3 from 'web3';
import {getConfig} from './config';

export const DEFAULT_GAS = 4700000;
const DEFAULT_PORT = 8545;

function isValidRPCAddress(rpc) {
  return /^((?:http)|(?:ws)):\/\//g.test(rpc);
}

function isUsingGanache(rpc) {
  return rpc === 'ganache';
}

function getDefaultGanacheOptions(secretKey) {
  if (!secretKey) {
    throw 'Secret key not defined';
  }
  return {
    accounts: [
      {
        balance: '10000000000000000000000000000000000',
        secretKey
      },
      ...Array(9).fill({balance: '10000000000000000000000000000000000'})
    ],
    vmErrorsOnRPCResponse: false
  };
}

export function getDefaultGas() {
  return getConfig().web3.gas || DEFAULT_GAS;
}

export async function createGanacheServer(secretKey) {
  const Ganache = require('ganache-core');
  const server = Ganache.server(getDefaultGanacheOptions(secretKey));
  await server.listen(DEFAULT_PORT);
}

function createGanacheProvider(secretKey) {
  // import in code with purpose:D
  const Ganache = require('ganache-core');
  return Ganache.provider(getDefaultGanacheOptions(secretKey));
}

async function ganacheTopUpDefaultAccount(web3) {
  const [firstGanacheMasterAccount] = await web3.eth.getAccounts();
  await web3.eth.sendTransaction({
    from: firstGanacheMasterAccount,
    to: getDefaultAddress(web3),
    value: web3.utils.toWei('10', 'ether'),
    gas: getDefaultGas()
  });
}

function importPrivateKey(web3) {
  try {
    const {nodePrivateKey} = getConfig().web3;
    const account = web3.eth.accounts.privateKeyToAccount(nodePrivateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    return account;
  } catch (err) {
    throw new Error('A configuration value for web3 node private key is missing');
  }
}

export async function createWeb3() {
  const web3 = new Web3();

  const {rpc} = getConfig().web3;
  const account = importPrivateKey(web3);

  if (isValidRPCAddress(rpc)) {
    web3.setProvider(rpc);
  } else if (isUsingGanache(rpc)) {
    web3.setProvider(createGanacheProvider(account.privateKey));
    await ganacheTopUpDefaultAccount(web3);
  } else {
    throw new Error('A configuration value for web3 rpc server is missing');
  }
  return web3;
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
    gas: getDefaultGas(),
    gasPrice: web3.utils.toWei('5', 'gwei')
  });
}

export async function deployContract(web3, json, args = [], options = {}) {
  const defaultAddress = getDefaultAddress(web3);
  return new web3.eth.Contract(json.abi, undefined, {
    gas: getDefaultGas(),
    gasPrice: web3.utils.toWei('5', 'gwei')
  }).deploy({data: json.bytecode, arguments: args})
    .send({
      from: defaultAddress,
      gas: getDefaultGas(),
      ...options
    });
}

export function link(contract, name, library) {
  const address = library.options.address.replace('0x', '');
  const pattern = new RegExp(`_+${name}_+`, 'g');
  contract.bytecode = contract.bytecode.replace(pattern, address);
}

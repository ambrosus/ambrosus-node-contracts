/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Web3 from 'web3';
import config from '../../config/config';
import {DEFAULT_GAS, getDefaultAddress} from '../../src/utils/web3_tools';

export const {utils} = new Web3();

const DEFAULT_PORT = 8545;

function getDefaultGanacheOptions(secretKey) {
  if (!secretKey) {
    throw 'Secret key not defined';
  }
  return {
    wallet: {
      defaultBalance: 1000000000,
      accounts: [
        {
          balance: '0x1ed09bead87c0378d8e6400000000',
          secretKey
        },
        ...Array(9).fill({balance: '0x1ed09bead87c0378d8e64000000000'})
      ]
    },
    logging: {
      logger: {
        log: () => {} // don't do anything
      }
    },
    chain: {
      hardfork: 'istanbul',
      vmErrorsOnRPCResponse: false
    }
  };
}

export async function createGanacheServer(secretKey) {
  const Ganache = require('ganache');
  const server = Ganache.server(getDefaultGanacheOptions(secretKey));
  await server.listen(DEFAULT_PORT);
}

function createGanacheProvider(secretKey) {
  // import in code with purpose:D
  const Ganache = require('ganache');
  const memdown = require('memdown');
  return Ganache.provider({
    ...getDefaultGanacheOptions(secretKey),
    db: memdown()
  });
}

async function ganacheTopUpDefaultAccount(web3) {
  const [firstGanacheMasterAccount] = await web3.eth.getAccounts();
  await web3.eth.sendTransaction({
    from: firstGanacheMasterAccount,
    to: getDefaultAddress(web3),
    value: web3.utils.toWei('10', 'ether'),
    gas: DEFAULT_GAS
  });
}

function augmentWithSnapshotMethods(web3) {
  web3.eth.extend({
    methods: [
      {
        name: 'makeSnapshot',
        call: 'evm_snapshot',
        params: 0,
        inputFormatter: [],
        outputFormatter: web3.utils.hexToNumberString
      },
      {
        name: 'restoreSnapshot',
        call: 'evm_revert',
        params: 1,
        inputFormatter: [web3.utils.numberToHex]
      }
    ]
  });
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

export async function createWeb3Ganache(conf = config) {
  const web3 = new Web3();

  const account = importPrivateKey(web3, conf);

  web3.setProvider(createGanacheProvider(account.privateKey));
  await ganacheTopUpDefaultAccount(web3);
  augmentWithSnapshotMethods(web3);
  return web3;
}

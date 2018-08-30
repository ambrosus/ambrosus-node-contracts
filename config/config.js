/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

module.exports = Object.freeze({
  web3Rpc: process.env.WEB3_RPC,
  nodePrivateKey: process.env.WEB3_NODEPRIVATEKEY,
  headContractAddress: process.env.HEAD_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000f10'
});

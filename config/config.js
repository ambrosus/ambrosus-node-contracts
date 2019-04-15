/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

module.exports = Object.freeze({
  web3Rpc: process.env.WEB3_RPC,
  nodePrivateKey: process.env.WEB3_NODEPRIVATEKEY,
  headContractAddress: process.env.HEAD_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000F10',
  validatorSetContractAddress: process.env.VALIDATOR_SET_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000F00',
  blockRewardsContractAddress: process.env.BLOCK_REWARDS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000F01',
  multiplexerContractAddress: process.env.MULTIPLEXER_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  multisigContractAddress: process.env.MULTISIG_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  multisigApprovalAddresses: process.env.MULTISIG_APPROVAL_ADDRESSES
});

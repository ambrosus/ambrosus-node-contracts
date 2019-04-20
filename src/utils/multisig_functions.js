/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import contractJsons, {multisig} from '../contract_jsons';

export default class MultisigFunctions {
  constructor(web3) {
    this.web3 = web3;
    this.functionAbis = {...this.getFunctionSignatures(multisig.abi), ...this.getFunctionSignatures(contractJsons.multiplexer.abi)};
  }

  getFunctionSignatures(abi) {
    return abi
      .filter((abiEntry) => abiEntry.type === 'function' && !abiEntry.constant)
      .map((abiEntry) => ({
        [this.web3.eth.abi.encodeFunctionSignature(abiEntry)]: {
          name: abiEntry.name,
          inputs: abiEntry.inputs
        }
      }))
      .reduce((acc, entry) => ({...acc, ...entry}), {});
  }

  getFunctionName(transactionData) {
    return this.functionAbis[transactionData.substring(0, 10)].name;
  }

  getFunctionArguments(transactionData) {
    const {inputs} = this.functionAbis[transactionData.substring(0, 10)];
    const parameters = this.web3.eth.abi.decodeParameters(inputs, `0x${transactionData.substring(10)}`);
    return inputs.reduce((acc, {name}) => ({...acc, [name]: parameters[name]}), {});
  }
}

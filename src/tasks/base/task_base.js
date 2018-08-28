/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {getConfig} from '../../config';

const lowercaseFirstLetter = (string) => string.charAt(0).toLowerCase() + string.slice(1);

export default class TaskBase {
  getContract(contractJson) {
    const name = lowercaseFirstLetter(contractJson.contractName);
    return new this.web3.eth.Contract(contractJson.abi, getConfig().contracts[name]);
  }

  description() {
    return '';
  }
}

/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Web3 from 'web3';
import MultisigFunctions from '../../src/utils/multisig_functions';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Multiplexer wrapper', () => {
  let multisigFunctions;

  beforeEach(async () => {
    const web3Mock = new Web3();

    multisigFunctions = new MultisigFunctions(web3Mock);
  });

  [
    ['0xcce524b4', 'setBaseUploadFee'],
    ['0x3b9aa98a', 'transferOwnershipForBlockRewards'],
    ['0x5366dbc0', 'changeContext'],
    ['0x8ab1d681', 'removeFromWhitelist'],
    ['0xa6f1e840', 'transferContractsOwnership'],
    ['0xbe08add3', 'transferOwnershipForValidatorSet'],
    ['0xf2fde38b', 'transferOwnership'],
    ['0xfae37c3a', 'addToWhitelist'],
    ['0x7065cb48', 'addOwner'],
    ['0x173825d9', 'removeOwner'],
    ['0xba51a6df', 'changeRequirement'],
    ['0xcce524b4', 'setBaseUploadFee']
  ].forEach(([signature, functionName]) =>
    it(`correctly resolves method name for ${functionName}`, async () => {
      expect(multisigFunctions.getFunctionName(`${signature}1234`)).to.equal(functionName);
    })
  );

  it('correctly resolves method arguments', async () => {
    const parameters = new Web3().eth.abi.encodeParameters(['uint256'], ['100']).substring(2);
    const setBaseUploadFeeSignature = `0xcce524b4`;
    expect(multisigFunctions.getFunctionArguments(`${setBaseUploadFeeSignature}${parameters}`)).to.deep.equal({fee: '100'});
  });
});

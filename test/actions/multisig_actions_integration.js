/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {multisig} from '../../src/contract_jsons';
import {createWeb3, deployContract} from '../../src/utils/web3_tools';
import deploy from '../helpers/deploy';
import MultiplexerWrapper from '../../src/wrappers/multiplexer_wrapper';
import MultisigWrapper from '../../src/wrappers/multisig_wrapper';
import AdministrativeActions from '../../src/actions/admin_actions';
import HeadWrapper from '../../src/wrappers/head_wrapper';
import KycWhitelistWrapper from '../../src/wrappers/kyc_whitelist_wrapper';
import FeesWrapper from '../../src/wrappers/fees_wrapper';
import ValidatorProxyWrapper from '../../src/wrappers/validator_proxy_wrapper';
import MultisigActions from '../../src/actions/multisig_actions';


chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Multisig actions integration', () => {
  let multisigContract;
  let multisigActions;
  let web3;
  let owner;
  let otherOwner;
  let otherAddress;

  before(async () => {
    web3 = await createWeb3();
    [owner, otherOwner, otherAddress] = await web3.eth.getAccounts();
    const {multiplexer, head, kycWhitelist, fees, validatorProxy} = await deploy({
      web3,
      contracts: {
        multiplexer: true,
        kycWhitelist: true,
        fees: true,
        validatorProxy: true,
        blockRewards: true,
        validatorSet: true,
        kycWhitelistStore: true,
        config: true,
        time: true
      },
      params: {
        multiplexer: {
          owner
        },
        blockRewards: {
          owner,
          baseReward: 0,
          superUser: owner
        },
        validatorSet: {
          owner,
          initialValidators: [otherAddress],
          superUser: owner
        }
      }
    });
    multisigContract = await deployContract(web3, multisig, [[owner, otherOwner], 2]);
    const headWrapper = new HeadWrapper(head.options.address, web3, owner);
    const adminActions = new AdministrativeActions(
      headWrapper,
      new KycWhitelistWrapper(headWrapper, web3, owner),
      new FeesWrapper(headWrapper, web3, owner),
      new ValidatorProxyWrapper(headWrapper, web3, owner)
    );
    await adminActions.moveOwnershipsToMultiplexer(multiplexer.options.address);
    const multiplexerWrapper = new MultiplexerWrapper(multiplexer.options.address, web3, owner);
    const multisigWrapper = new MultisigWrapper(multisigContract.options.address, web3, owner);
    multisigActions = new MultisigActions(multisigWrapper, multiplexerWrapper);
  });

  it('shows pending transaction method name', async () => {
    await multisigActions.addToWhitelist(otherAddress, 2, '0');
    console.log(await multisigActions.allPendingTransactions());
  });
});

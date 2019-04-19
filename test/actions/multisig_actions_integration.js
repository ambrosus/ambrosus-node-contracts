/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {multisig} from '../../src/contract_jsons';
import {createWeb3, deployContract, makeSnapshot, restoreSnapshot} from '../../src/utils/web3_tools';
import deploy from '../helpers/deploy';
import MultiplexerWrapper from '../../src/wrappers/multiplexer_wrapper';
import MultisigWrapper from '../../src/wrappers/multisig_wrapper';
import AdministrativeActions from '../../src/actions/admin_actions';
import HeadWrapper from '../../src/wrappers/head_wrapper';
import KycWhitelistWrapper from '../../src/wrappers/kyc_whitelist_wrapper';
import FeesWrapper from '../../src/wrappers/fees_wrapper';
import ValidatorProxyWrapper from '../../src/wrappers/validator_proxy_wrapper';
import MultisigActions from '../../src/actions/multisig_actions';
import MultisigFunctions from '../../src/utils/multisig_functions';


chai.use(chaiAsPromised);
const {expect} = chai;

describe('Multisig actions integration', () => {
  let multisigContract;
  let multisigActions;
  let web3;
  let owner;
  let otherOwner;
  let otherAddress;
  let multiplexer;
  let head;
  let kycWhitelist;
  let fees;
  let validatorSet;
  let blockRewards;
  let snapshotId;

  before(async () => {
    web3 = await createWeb3();
    [owner, otherOwner, otherAddress] = await web3.eth.getAccounts();
    multisigContract = await deployContract(web3, multisig, [[owner, otherOwner], 2]);
    ({multiplexer, head, kycWhitelist, fees, validatorSet, blockRewards} = await deploy({
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
          owner: multisigContract.options.address
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
    }));
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
    multisigActions = new MultisigActions(multisigWrapper, multiplexerWrapper, new MultisigFunctions(web3));
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  const submitTransactionBy = async (address, callback) => {
    const multiplexerWrapper = new MultiplexerWrapper(multiplexer.options.address, web3, address);
    const multisigWrapper = new MultisigWrapper(multisigContract.options.address, web3, address);
    const multisigActions = new MultisigActions(multisigWrapper, multiplexerWrapper, new MultisigFunctions(web3));
    await callback(multisigActions);
  };

  it('shows pending multiplexer transaction', async () => {
    await multisigActions.addToWhitelist(otherAddress, 2, '0');
    expect(await multisigActions.allPendingTransactions()).to.deep.equal([{
      name: 'addToWhitelist',
      args: {
        candidate: otherAddress, role: '2', deposit: '0'
      },
      transactionId: '0',
      confirmations: {
        required: 2,
        confirmed: 1
      }
    }]);
  });

  it('shows pending multisig transaction', async () => {
    await multisigActions.addOwner(otherAddress);
    const transactions = await multisigActions.allPendingTransactions();
    expect(transactions).to.deep.equal([{
      name: 'addOwner',
      args: {
        owner: otherAddress
      },
      transactionId: '0',
      confirmations: {
        required: 2,
        confirmed: 1
      }
    }]);
  });

  it('multisig requires 2 confirmations', async () => {
    expect(await multisigActions.confirmationsRequired()).to.equal(2);
  });

  it('approvable transactions do not include transactions approved by us', async () => {
    await multisigActions.addToWhitelist(otherAddress, 2, '0');
    expect(await multisigActions.approvableTransactions()).to.deep.equal([]);
  });

  it('approvable transactions include transactions not approved by us', async () => {
    await submitTransactionBy(otherOwner, (multisigActions) => multisigActions.addToWhitelist(otherAddress, 2, '0'));
    expect(await multisigActions.approvableTransactions()).to.deep.equal([{
      name: 'addToWhitelist',
      args: {
        candidate: otherAddress, role: '2', deposit: '0'
      },
      transactionId: '0',
      confirmations: {
        required: 2,
        confirmed: 1
      }
    }]);
  });

  it('confirmTransaction', async () => {
    await submitTransactionBy(otherOwner, (multisigActions) => multisigActions.addToWhitelist(otherAddress, 2, '0'));
    await multisigActions.confirmTransaction('0');
    expect(await multisigActions.allPendingTransactions()).to.deep.equal([]);
  });

  it('revokeConfirmation', async () => {
    await multisigActions.addToWhitelist(otherAddress, 2, '0');
    await multisigActions.revokeConfirmation('0');
    expect(await multisigActions.approvableTransactions()).to.deep.equal([{
      name: 'addToWhitelist',
      args: {
        candidate: otherAddress, role: '2', deposit: '0'
      },
      transactionId: '0',
      confirmations: {
        required: 2,
        confirmed: 0
      }
    }]);
  });

  it('allPendingTransactions does not list failed transactions', async () => {
    await multisigActions.removeFromWhitelist(otherAddress);
    await expect(submitTransactionBy(otherOwner, (multisigActions) => multisigActions.confirmTransaction('0'))).to.be.rejected;
    expect(await multisigActions.allPendingTransactions()).to.deep.equal([]);
  });

  describe('Actions', () => {
    let transactionsCounter;
    beforeEach(() => {
      transactionsCounter = 0;
    });

    const executeTransaction = async (callback) => {
      await callback(multisigActions);
      await submitTransactionBy(otherOwner, (multisigActions) => multisigActions.confirmTransaction(transactionsCounter));
      transactionsCounter++;
    };

    it('transferMultiplexerOwnership', async () => {
      await executeTransaction((multisigActions) => multisigActions.transferMultiplexerOwnership(otherAddress));
      expect(await multiplexer.methods.owner().call()).to.equal(otherAddress);
    });

    it('transferContractsOwnership', async () => {
      await executeTransaction((multisigActions) => multisigActions.transferContractsOwnership(otherAddress));
      expect(await head.methods.owner().call()).to.equal(otherAddress);
    });

    it('changeContext', async () => {
      await executeTransaction((multisigActions) => multisigActions.changeContext(otherAddress));
      expect(await head.methods.context().call()).to.equal(otherAddress);
    });

    it('addToWhitelist', async () => {
      await executeTransaction((multisigActions) => multisigActions.addToWhitelist(otherAddress, 2, '0'));
      expect(await kycWhitelist.methods.hasRoleAssigned(otherAddress, 2).call()).to.be.true;
    });

    it('throws when adding to whitelist has failed', async () => {
      await executeTransaction((multisigActions) => multisigActions.addToWhitelist(otherAddress, 2, '0'));
      await expect(executeTransaction((multisigActions) => multisigActions.addToWhitelist(otherAddress, 2, '0'))).to.be.rejectedWith(`Transaction #1 has been rejected`);
    });

    it('removeFromWhitelist', async () => {
      await executeTransaction((multisigActions) => multisigActions.addToWhitelist(otherAddress, 2, '0'));
      await executeTransaction((multisigActions) => multisigActions.removeFromWhitelist(otherAddress));
      expect(await kycWhitelist.methods.isWhitelisted(otherAddress).call()).to.be.false;
    });

    it('throws when removing from whitelist has failed', async () => {
      await expect(executeTransaction((multisigActions) => multisigActions.removeFromWhitelist(otherAddress))).to.be.rejectedWith(`Transaction #0 has been rejected`);
    });

    it('setBaseUploadFee', async () => {
      await executeTransaction((multisigActions) => multisigActions.setBaseUploadFee('100'));
      expect(await fees.methods.baseUploadFee().call()).to.equal('100');
    });

    it('throws when setBaseUploadFee has failed', async () => {
      const wrongFee = 21;
      await expect(executeTransaction((multisigActions) => multisigActions.setBaseUploadFee(wrongFee))).to.be.rejectedWith(`Transaction #0 has been rejected`);
    });

    it('transferOwnershipForValidatorSet', async () => {
      await executeTransaction((multisigActions) => multisigActions.transferOwnershipForValidatorSet(otherAddress));
      expect(await validatorSet.methods.owner().call()).to.equal(otherAddress);
    });

    it('transferOwnershipForBlockRewards', async () => {
      await executeTransaction((multisigActions) => multisigActions.transferOwnershipForBlockRewards(otherAddress));
      expect(await blockRewards.methods.owner().call()).to.equal(otherAddress);
    });

    it('addOwner', async () => {
      await executeTransaction((multisigActions) => multisigActions.addOwner(otherAddress));
      expect(await multisigActions.getOwners()).to.contain(otherAddress);
    });

    it('removeOwner', async () => {
      await executeTransaction((multisigActions) => multisigActions.removeOwner(owner));
      expect(await multisigActions.getOwners()).not.to.contain(owner);
    });

    it('changeRequirement', async () => {
      await executeTransaction((multisigActions) => multisigActions.changeRequirement(1));
      expect(await multisigActions.confirmationsRequired()).to.equal(1);
    });
  });
});

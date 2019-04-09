/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import BN from 'bn.js';
import {

  C_LEVEL_NUMBER,

  APPROVALS_REQUIRED,

  TOTAL_APPROVALS

} from '../../../src/constants';
import deploy from '../../helpers/deploy';

chai.use(chaiEmitEvents);
chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('MultiSig Contract', () => {
  let web3;
  let snapshotId;
  let multisig;
  let currentOwner;
  let otherNode;
  let transactionId;
  const approvalAdresses = [];

  const getOwners = async () => multisig.methods.getOwners().call();
  const submitTransaction = async (_sender, _destination, _value, _data) => multisig.methods.submitTransaction(_destination, _value, _data).send({from: _sender});
  const isConfirmed = async (transactionId) => multisig.methods.isConfirmed(transactionId).call();
  const confirmTransaction = async (sender, transactionId) => multisig.methods.confirmTransaction(transactionId).send({from: sender});
  const revokeConfirmation = async (sender, transactionId) => multisig.methods.revokeConfirmation(transactionId).send({from: sender});

  const isCLevelConfirmed = async (transactionId) => multisig.methods.isCLevelConfirmed(transactionId).call();

  before(async () => {
    web3 = await createWeb3();
    [currentOwner, approvalAdresses[0], approvalAdresses[1], approvalAdresses[2], approvalAdresses[3], approvalAdresses[4], approvalAdresses[5], otherNode] = await web3.eth.getAccounts();
    ({multisig} = await deploy({
      web3,
      contracts: {
        config: true,
        multiplexer: true,
        multisig: true
      },
      params: {
        multiplexer: {
          owner: currentOwner
        },
        multisig: {
          owners: approvalAdresses
        }
      }
    }));
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);

    await submitTransaction(approvalAdresses[5], otherNode, new BN(100), '0x000000000000000000000000000000000000000000000000000000000000000000000000');
    const [additionaEvent] = await multisig.getPastEvents('Submission');
    ({transactionId} = additionaEvent.returnValues);
    await revokeConfirmation(approvalAdresses[5], transactionId);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it('Correct number of validators', async () => {
    const validators = await getOwners();
    expect(validators.length).to.equal(TOTAL_APPROVALS);
  });

  it('Correct number of approvals required', async () => {
    expect(await isConfirmed(transactionId)).to.equal(false);

    for (let approval = 0; approval < APPROVALS_REQUIRED - 1; approval++) {
      await confirmTransaction(approvalAdresses[approval], transactionId);
    }
    expect(await isConfirmed(transactionId)).to.equal(false);

    await confirmTransaction(approvalAdresses[APPROVALS_REQUIRED - 1], transactionId);
    expect(await isConfirmed(transactionId)).to.equal(true);
  });

  it('C-level confirmation required', async () => {
    await confirmTransaction(approvalAdresses[C_LEVEL_NUMBER + 1], transactionId);
    expect(await isCLevelConfirmed(transactionId)).to.equal(false);

    await confirmTransaction(approvalAdresses[C_LEVEL_NUMBER - 1], transactionId);
    expect(await isCLevelConfirmed(transactionId)).to.equal(true);
  });
});

/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, makeSnapshot, restoreSnapshot, getDefaultAddress} from '../../../src/utils/web3_tools';
import deploy from '../../helpers/deploy';
import {expectEventEmission, captureEventEmission} from '../../helpers/web3EventObserver';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Approve Collector Contract', () => {
  let web3;
  let owner;
  let other;
  let admin1;
  let admin2;
  let admin3;
  let totalStranger;
  let approvalCollector;
  let multiplexingContract;
  let snapshotId;

  let testTransaction = {'0':'0x0000000000000000000000000000000000000000', '1':'0xdeadbeef'};
  let ContractClass = {"DEFAULT":0, "CRITICAL":1};

  const getMultiplexingContract = async () => approvalCollector.methods.getMultiplexingContract().call();
  const setMultiplexingContract = async (multiplexingContract, sender = owner) => approvalCollector.methods.updateMultiplexingContract(multiplexingContract).send({from: sender});
  const addTransaction = async (executor, transaction, sender = owner) => approvalCollector.methods.executeTransaction(executor, transaction).send({from: sender});
  const getPendingTransactions = async ()  => approvalCollector.methods.getPendingTransactions().call();
  const getTransactionInfo = async (transactionId) => approvalCollector.methods.getTransactionInfo(transactionId).call();
  const approveTransaction = async (transactionId, sender = owner) => approvalCollector.methods.approveTransaction(transactionId).send({from: sender});
  const hasApproved = async (approver, transactionId) => approvalCollector.methods.hasApproved(approver, transactionId).call();
  const addAdministrator = async (newAdmin, sender = owner) => approvalCollector.methods.addAdministrator(newAdmin).send({from: sender});
  const deleteAdministrator = async (admin, sender = owner) => approvalCollector.methods.deleteAdministrator(admin).send({from: sender});
  const setContractClass = async (address, contractClass, sender = owner) => approvalCollector.methods.setContractClass(address, contractClass).send({from: sender});
  const addCriticalApprover = async (address, sender = owner) => approvalCollector.methods.addCriticalApprover(address).send({from: sender});


  before(async () => {
    web3 = await createWeb3();
    [owner, other, totalStranger, admin1, admin2, admin3] = await web3.eth.getAccounts();
    ({approvalCollector, multiplexingContract} = await deploy({
      web3,
      contracts: {
        approvalCollector: true,
        multiplexingContract: true
      }
    }));

    await setMultiplexingContract(multiplexingContract._address);
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId, totalStranger);
  });

  it('Create transaction', async () => {
    let events = await captureEventEmission(
      web3,
      () => addTransaction(testTransaction['0'], testTransaction['1']),
      approvalCollector,
      'TransactionCreated'
    );

    let transactions = await getPendingTransactions();
    expect (events[0].returnValues['transactionId']).to.equal(transactions[0]);

    let transactionInfo = await getTransactionInfo(transactions[0]);
    expect(transactionInfo['0']).to.equal(testTransaction['0']);
    expect(transactionInfo['1']).to.equal(testTransaction['1']);
  });

  it('Approve transaction', async () => {
    await addTransaction(testTransaction['0'], testTransaction['1']);
    let transactions = await getPendingTransactions();

    await expectEventEmission(
      web3,
      () => approveTransaction(transactions[0]),
      approvalCollector,
      'ApprovalReceived',
      {
        from: owner,
        transactionId: transactions[0]
      }
    );

    expect (await hasApproved(owner, transactions[0])).to.be.true;
  });

  it('Approve transaction second time', async () => {
    await addTransaction(testTransaction['0'], testTransaction['1']);
    let transactions = await getPendingTransactions();

    await expect(approveTransaction(transactions[0])).to.be.fulfilled;
    await expect(approveTransaction(transactions[0])).to.be.eventually.rejected;
  });

  it('Approve transaction from not admin account', async () => {
    await addTransaction(testTransaction['0'], testTransaction['1']);
    let transactions = await getPendingTransactions();

    await expect(approveTransaction(transactions[0], totalStranger)).to.be.eventually.rejected;
  });

  it('Add new administrator', async () => {
    await addTransaction(testTransaction['0'], testTransaction['1']);
    let transactions = await getPendingTransactions();

    await expect(approveTransaction(transactions[0], totalStranger)).to.be.eventually.rejected;
    await expect(addAdministrator(totalStranger)).to.be.fulfilled;
    await expect(approveTransaction(transactions[0], totalStranger)).to.be.fulfilled;
  });

  it('Add new administrator without permissions', async () => {
    await expect(addAdministrator(totalStranger, other)).to.be.eventually.rejected;
  });

  it('Delete administrator', async () => {
    await addTransaction(testTransaction['0'], testTransaction['1']);
    await addTransaction(testTransaction['0'], testTransaction['1']);
    let transactions = await getPendingTransactions();

    await expect(addAdministrator(totalStranger)).to.be.fulfilled;
    await expect(approveTransaction(transactions[0], totalStranger)).to.be.fulfilled;

    await expect(deleteAdministrator(totalStranger)).to.be.fulfilled;
    await expect(approveTransaction(transactions[1], totalStranger)).to.be.eventually.rejected;
  });

  it('Delete administrator without permissions', async () => {
    await expect(deleteAdministrator(totalStranger, other)).to.be.eventually.rejected;
  });

  it('Perform transaction', async () => {
    await addTransaction(testTransaction['0'], testTransaction['1']);
    let transactions = await getPendingTransactions();

    await expect(addAdministrator(admin1)).to.be.fulfilled;
    await expect(addAdministrator(admin2)).to.be.fulfilled;

    await expect(approveTransaction(transactions[0], admin1)).to.be.fulfilled;

    await expectEventEmission(
      web3,
      () => approveTransaction(transactions[0], admin2),
      approvalCollector,
      'AllApprovalsReceived',
      {
        transactionId: transactions[0]
      }
    );
  });

  it('Add new critical approver from stranger', async () => {
    await expect(addCriticalApprover(totalStranger, other)).to.be.eventually.rejected;
  });

  it('Add new critical approver from administrator', async () => {
    await expect(addAdministrator(admin1)).to.be.fulfilled;
    await expect(addCriticalApprover(admin1, admin1)).to.be.eventually.rejected;
  });

  it('Add new critical approver from owner', async () => {
    await expect(addCriticalApprover(admin1)).to.be.fulfilled;
  });

  it('Set contract class', async () => {
    await expect(setContractClass(testTransaction['0'], ContractClass['CRITICAL'])).to.be.fulfilled;
  });

  it('Perform critical transaction', async () => {
    await expect(setContractClass(testTransaction['0'], ContractClass['CRITICAL'])).to.be.fulfilled;

    await addTransaction(testTransaction['0'], testTransaction['1']);
    let transactions = await getPendingTransactions();

    await expect(addAdministrator(admin1)).to.be.fulfilled;
    await expect(addAdministrator(admin2)).to.be.fulfilled;
    await expect(addCriticalApprover(admin3)).to.be.fulfilled;

    await expect(approveTransaction(transactions[0], admin1)).to.be.fulfilled;
    await expect(approveTransaction(transactions[0], admin2)).to.be.fulfilled;

    await expectEventEmission(
      web3,
      () => approveTransaction(transactions[0], admin3),
      approvalCollector,
      'AllApprovalsReceived',
      {
        transactionId: transactions[0]
      }
    );
  });

  it('Set new multiplexing contract', async () => {
    await expect(setMultiplexingContract('0x0000000000000000000000000000000000000000')).to.be.fulfilled;
    expect(await getMultiplexingContract()).to.equal('0x0000000000000000000000000000000000000000');
  });


});

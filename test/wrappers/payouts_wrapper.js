/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import PayoutsWrapper from '../../src/wrappers/payouts_wrapper';
import sinon from 'sinon';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Payouts wrapper', () => {
  let payoutsWrapper;
  const defaultAddress = '0x6789';

  describe('Available payout amount', () => {
    let availableStub;
    let availableCallStub;
    const availableAmount = '23';
    const payoutPeriod = '8';

    beforeEach(() => {
      availableStub = sinon.stub();
      availableCallStub = sinon.stub();
      const contractMock = {
        methods: {
          available: availableStub.returns({
            call: availableCallStub.resolves(availableAmount)
          })
        }
      };
      payoutsWrapper = new PayoutsWrapper({}, {}, defaultAddress);
      sinon.stub(payoutsWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await expect(payoutsWrapper.availablePayoutAmountInPeriod(payoutPeriod)).to.eventually.equal(availableAmount);
      expect(availableStub).to.be.calledOnceWith(payoutPeriod);
      expect(availableCallStub).to.be.calledOnce;
    });
  });

  describe('Withdraw', () => {
    let withdrawStub;
    let withdrawSendStub;
    let contractMock;

    beforeEach(() => {
      withdrawSendStub = sinon.stub();
      withdrawStub = sinon.stub().returns({
        send: withdrawSendStub
      });
      contractMock = {
        methods: {
          withdraw: withdrawStub
        }
      };
      payoutsWrapper = new PayoutsWrapper({}, {}, defaultAddress);
      sinon.stub(payoutsWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await payoutsWrapper.withdraw();
      expect(withdrawStub).to.be.calledWith(defaultAddress);
      expect(withdrawSendStub).to.be.calledWith({from: defaultAddress});
    });
  });
});

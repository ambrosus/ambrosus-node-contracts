/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import TimeWrapper from '../../src/wrappers/time_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Time Wrapper', () => {
  let timeWrapper;

  it('has correct contract name', async () => {
    timeWrapper = new TimeWrapper();
    expect(timeWrapper.getContractName).to.equal('time');
  });

  describe('Current payout period', () => {
    let currentPayoutPeriodStub;
    let currentPayoutPeriodCallStub;
    const period = '15';

    before(async () => {
      currentPayoutPeriodStub = sinon.stub();
      currentPayoutPeriodCallStub = sinon.stub();
      const contractMock = {
        methods: {
          currentPayoutPeriod: currentPayoutPeriodStub.returns({
            call: currentPayoutPeriodCallStub.resolves(period)
          })
        }
      };
      timeWrapper = new TimeWrapper();
      sinon.stub(timeWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await expect(timeWrapper.currentPayoutPeriod()).to.eventually.equal(period);
      expect(currentPayoutPeriodStub).to.be.calledOnce;
      expect(currentPayoutPeriodCallStub).to.be.calledOnce;
    });
  });

  describe('Payout period start', () => {
    let payoutPeriodStartStub;
    let payoutPeriodStartCallStub;
    const periodStart = '1548333077';
    const examplePeriod = '12';

    before(async () => {
      payoutPeriodStartStub = sinon.stub();
      payoutPeriodStartCallStub = sinon.stub();
      const contractMock = {
        methods: {
          payoutPeriodStart: payoutPeriodStartStub.returns({
            call: payoutPeriodStartCallStub.resolves(periodStart)
          })
        }
      };
      timeWrapper = new TimeWrapper();
      sinon.stub(timeWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await expect(timeWrapper.payoutPeriodStart(examplePeriod)).to.eventually.equal(periodStart);
      expect(payoutPeriodStartStub).to.be.calledOnceWith(examplePeriod);
      expect(payoutPeriodStartCallStub).to.be.calledOnce;
    });
  });
});

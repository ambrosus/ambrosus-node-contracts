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
import PayoutsActions from '../../src/actions/payouts_actions';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

const FIRST_MEANINGFUL_PERIOD = 630; // May 2018

describe('Payouts actions', () => {
  let payoutsActions;
  let payoutsWrapperMock;
  let timeWrapperMock;
  const exampleTimePeriod = (FIRST_MEANINGFUL_PERIOD + 12).toString();
  const exampleTimestamp = '1548334446';

  beforeEach(() => {
    timeWrapperMock = {
      currentPayoutPeriod: sinon.stub().resolves(exampleTimePeriod),
      payoutPeriodStart: sinon.stub().resolves(exampleTimestamp)
    };
    payoutsWrapperMock = {
      availablePayoutAmountInPeriod: sinon.stub(),
      withdraw: sinon.stub()
    };
    payoutsActions = new PayoutsActions(timeWrapperMock, payoutsWrapperMock);
  });

  it('currentPayoutPeriod calls corresponding method from timeWrapper', async () => {
    expect(await payoutsActions.currentPayoutPeriod()).to.equal(exampleTimePeriod);
    expect(timeWrapperMock.currentPayoutPeriod).to.be.calledOnce;
  });

  it('nextPayoutPeriodStart returns timestamp of next payout period', async () => {
    expect(await payoutsActions.nextPayoutPeriodStart()).to.equal(exampleTimestamp);
    expect(timeWrapperMock.payoutPeriodStart).to.be.calledOnceWith(FIRST_MEANINGFUL_PERIOD + 13);
  });

  it('withdraw calls corresponding method from payoutsWrapper', async () => {
    await payoutsActions.withdraw();
    expect(payoutsWrapperMock.withdraw).to.be.calledOnce;
  });

  describe('getTotalAvailablePayout', () => {
    beforeEach(() => {
      payoutsWrapperMock.availablePayoutAmountInPeriod.callsFake(async (period) => (period - FIRST_MEANINGFUL_PERIOD).toString());
    });

    it('returns sum of all payouts from FIRST_MEANINGFUL_PERIOD to (currentPayout - 1)', async () => {
      expect(await payoutsActions.getTotalAvailablePayout()).to.equal('66'); // ∑ 1 to 11
    });

    it('calls payoutsWrapperMock.availablePayoutAmountInPeriod for each period before current one', async () => {
      await payoutsActions.getTotalAvailablePayout();
      expect(payoutsWrapperMock.availablePayoutAmountInPeriod).to.have.callCount(12);
      for (let ind = FIRST_MEANINGFUL_PERIOD; ind < exampleTimePeriod; ind++) {
        expect(payoutsWrapperMock.availablePayoutAmountInPeriod).to.be.calledWith(ind);
      }
    });
  });
});

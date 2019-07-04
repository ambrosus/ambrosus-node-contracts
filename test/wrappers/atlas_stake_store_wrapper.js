/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import AtlasStakeStoreWrapper from '../../src/wrappers/atlas_stake_store_wrapper';

chai.use(sinonChai);
const {expect} = chai;

describe('Atlas stake store wrapper', () => {
  let atlasStakeStoreWrapper;

  describe('isShelteringAny', () => {
    let isShelteringAnyStub;
    let isShelteringAnyCallStub;
    const nodeAddress = '0xc0ffee';

    beforeEach(async () => {
      isShelteringAnyStub = sinon.stub();
      isShelteringAnyCallStub = sinon.stub();
      const contractMock = {
        methods: {
          isShelteringAny: isShelteringAnyStub.returns({
            call: isShelteringAnyCallStub.resolves(true)
          })
        }
      };
      atlasStakeStoreWrapper = new AtlasStakeStoreWrapper();
      sinon.stub(atlasStakeStoreWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await atlasStakeStoreWrapper.isShelteringAny(nodeAddress)).to.equal(true);
      expect(isShelteringAnyStub).to.be.calledOnceWith(nodeAddress);
      expect(isShelteringAnyCallStub).to.be.calledOnce;
    });
  });

  describe('getBasicStake', () => {
    let getBasicStakeStub;
    let getBasicStakeCallStub;
    const nodeAddress = '0xc0ffee';
    const stake = '75000000000000000000000';

    beforeEach(async () => {
      getBasicStakeStub = sinon.stub();
      getBasicStakeCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getBasicStake: getBasicStakeStub.returns({
            call: getBasicStakeCallStub.resolves(stake)
          })
        }
      };
      atlasStakeStoreWrapper = new AtlasStakeStoreWrapper();
      sinon.stub(atlasStakeStoreWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await atlasStakeStoreWrapper.getBasicStake(nodeAddress)).to.equal(stake);
      expect(getBasicStakeStub).to.be.calledOnceWith(nodeAddress);
      expect(getBasicStakeCallStub).to.be.calledOnce;
    });
  });

  describe('getPenaltiesHistory', () => {
    let getPenaltiesHistoryStub;
    let getPenaltiesHistoryCallStub;
    const nodeAddress = '0xc0ffee';
    const penaltiesHistory = {
      penaltiesCount: '1',
      lastPenaltyTime: '1560862351'
    };

    beforeEach(async () => {
      getPenaltiesHistoryStub = sinon.stub();
      getPenaltiesHistoryCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getPenaltiesHistory: getPenaltiesHistoryStub.returns({
            call: getPenaltiesHistoryCallStub.resolves(penaltiesHistory)
          })
        }
      };
      atlasStakeStoreWrapper = new AtlasStakeStoreWrapper();
      sinon.stub(atlasStakeStoreWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await atlasStakeStoreWrapper.getPenaltiesHistory(nodeAddress)).to.deep.equal(penaltiesHistory);
      expect(getPenaltiesHistoryStub).to.be.calledOnceWith(nodeAddress);
      expect(getPenaltiesHistoryCallStub).to.be.calledOnce;
    });
  });
});

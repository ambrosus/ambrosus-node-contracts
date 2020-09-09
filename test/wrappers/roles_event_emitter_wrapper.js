/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import RolesEventEmitterWrapper from '../../src/wrappers/roles_event_emitter_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Roles Event Emitter Wrapper', () => {
  const fromBlock = 4;
  const toBlock = 6;
  const eventsStub = 'events';
  let getPastEventsStub;
  let rolesEventEmitterWrapper;

  beforeEach(async () => {
    getPastEventsStub = sinon.stub().returns(eventsStub);
    const contractMock = {
      getPastEvents: getPastEventsStub
    };
    rolesEventEmitterWrapper = new RolesEventEmitterWrapper();
    sinon.stub(rolesEventEmitterWrapper, 'contract').resolves(contractMock);
  });

  describe('nodeOnboardings', () => {
    it('gets past events', async () => {
      expect(await rolesEventEmitterWrapper.nodeOnboardings(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('NodeOnboarded', {fromBlock, toBlock});
    });
  });

  describe('nodeRetirements', () => {
    it('gets past events', async () => {
      expect(await rolesEventEmitterWrapper.nodeRetirements(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('NodeRetired', {fromBlock, toBlock});
    });
  });

  describe('nodeUrlChanges', () => {
    it('gets past events', async () => {
      expect(await rolesEventEmitterWrapper.nodeUrlChanges(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('NodeUrlChanged', {fromBlock, toBlock});
    });
  });
});

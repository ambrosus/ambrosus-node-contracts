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
import OnboardActions from '../../src/actions/onboard_actions';
import {ATLAS, HERMES, APOLLO, NONE} from '../../src/constants';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Onboard Actions', () => {
  let onboardActions;
  let kycWhitelistWrapperMock;
  let rolesWrapperMock;
  let atlasStakeWrapperMock;
  const defaultAddress = '0xbeef';

  beforeEach(() => {
    kycWhitelistWrapperMock = {
      hasRoleAssigned: sinon.stub(),
      getRequiredDeposit: sinon.stub()
    };
    rolesWrapperMock = {
      onboardAsAtlas: sinon.stub(),
      onboardAsHermes: sinon.stub(),
      onboardAsApollo: sinon.stub(),
      onboardedRole: sinon.stub(),
      retireAtlas: sinon.spy(),
      retireApollo: sinon.spy(),
      retireHermes: sinon.spy(),
      nodeUrl: sinon.stub()
    };
    atlasStakeWrapperMock = {
      isShelteringAny: sinon.stub(),
      defaultAddress
    };
    onboardActions = new OnboardActions(kycWhitelistWrapperMock, rolesWrapperMock, atlasStakeWrapperMock);
  });

  describe('onboardAsAtlas', async () => {
    const address = '0xABCD';
    const url = 'http://example.com';
    const stakeAmount = '12345';

    const callSubject = async () => onboardActions.onboardAsAtlas(address, stakeAmount, url);

    beforeEach(() => {
      kycWhitelistWrapperMock.hasRoleAssigned.resolves(true);
      kycWhitelistWrapperMock.getRequiredDeposit.resolves(stakeAmount.toString());
    });

    it('fails if the address is not whitelisted for ATLAS', async () => {
      kycWhitelistWrapperMock.hasRoleAssigned.resolves(false);

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperMock.hasRoleAssigned).to.have.been.calledOnceWith(address, ATLAS);
    });

    it('fails if the stakeAmount is not matching the whitlisted pledge', async () => {
      kycWhitelistWrapperMock.getRequiredDeposit.resolves('456780');

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperMock.getRequiredDeposit).to.have.been.calledOnceWith(address);
    });

    it('works otherwise', async () => {
      await expect(callSubject()).to.eventually.be.fulfilled;

      expect(rolesWrapperMock.onboardAsAtlas).to.have.been.calledOnceWith(address, stakeAmount, url);
    });
  });

  describe('onboardAsHermes', async () => {
    const address = '0xABCD';
    const url = 'http://example.com';

    const callSubject = async () => onboardActions.onboardAsHermes(address, url);

    beforeEach(() => {
      kycWhitelistWrapperMock.hasRoleAssigned.resolves(true);
    });

    it('fails if the address is not whitelisted for HERMES', async () => {
      kycWhitelistWrapperMock.hasRoleAssigned.resolves(false);

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperMock.hasRoleAssigned).to.have.been.calledOnceWith(address, HERMES);
    });

    it('works otherwise', async () => {
      await expect(callSubject()).to.eventually.be.fulfilled;

      expect(rolesWrapperMock.onboardAsHermes).to.have.been.calledOnceWith(address, url);
    });
  });

  describe('onboardAsApollo', async () => {
    const address = '0xABCD';
    const depositAmount = '12345';

    const callSubject = async () => onboardActions.onboardAsApollo(address, depositAmount);

    beforeEach(() => {
      kycWhitelistWrapperMock.hasRoleAssigned.resolves(true);
      kycWhitelistWrapperMock.getRequiredDeposit.resolves(depositAmount.toString());
    });

    it('fails if the address is not whitelisted for APOLLO', async () => {
      kycWhitelistWrapperMock.hasRoleAssigned.resolves(false);

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperMock.hasRoleAssigned).to.have.been.calledOnceWith(address, APOLLO);
    });

    it('fails if the depositAmount is not matching the whitlisted pledge', async () => {
      kycWhitelistWrapperMock.getRequiredDeposit.resolves('45678');

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperMock.getRequiredDeposit).to.have.been.calledOnceWith(address);
    });

    it('works for exact depositAmount', async () => {
      await expect(callSubject()).to.eventually.be.fulfilled;

      expect(rolesWrapperMock.onboardAsApollo).to.have.been.calledOnceWith(address, depositAmount);
    });

    it('works for depositAmount bigger than necessary', async () => {
      kycWhitelistWrapperMock.getRequiredDeposit.resolves('100');
      await expect(callSubject()).to.eventually.be.fulfilled;

      expect(rolesWrapperMock.onboardAsApollo).to.have.been.calledOnceWith(address, depositAmount);
    });
  });

  describe('getOnboardedRole', async () => {
    const targetAddress = '0xABCD';

    const callSubject = async () => onboardActions.getOnboardedRole(targetAddress);

    beforeEach(() => {
      rolesWrapperMock.onboardedRole.resolves(HERMES);
      rolesWrapperMock.nodeUrl.resolves('http://example.com');
    });

    it('proxies the call to the wrapper', async () => {
      await expect(callSubject()).to.eventually.be.fulfilled.and.deep.equal(
        {
          role: HERMES,
          url: 'http://example.com'
        }
      );

      expect(rolesWrapperMock.onboardedRole).to.have.been.calledOnceWith(targetAddress);
      expect(rolesWrapperMock.nodeUrl).to.have.been.calledOnceWith(targetAddress);
    });
  });

  describe('retire', () => {
    const callSubject = async () => onboardActions.retire();

    beforeEach(() => {
      atlasStakeWrapperMock.isShelteringAny.withArgs(defaultAddress).resolves(false);
    });

    it('calls retireAtlas when the role is ATLAS', async () => {
      rolesWrapperMock.onboardedRole.resolves(ATLAS);
      await callSubject();
      expect(rolesWrapperMock.retireAtlas).to.be.calledOnce;
    });

    it('calls retireApollo when the role is APOLLO', async () => {
      rolesWrapperMock.onboardedRole.resolves(APOLLO);
      await callSubject();
      expect(rolesWrapperMock.retireApollo).to.be.calledOnce;
    });

    it('calls retireHermes when the role is HERMES', async () => {
      rolesWrapperMock.onboardedRole.resolves(HERMES);
      await callSubject();
      expect(rolesWrapperMock.retireHermes).to.be.calledOnce;
    });

    it('throws when node is not onboarded', async () => {
      rolesWrapperMock.onboardedRole.resolves(NONE);
      await expect(callSubject()).to.be.rejectedWith('The node is not onboarded');
    });

    it('throws when atlas is sheltering a bundle when trying to retire', async () => {
      rolesWrapperMock.onboardedRole.resolves(ATLAS);
      atlasStakeWrapperMock.isShelteringAny.withArgs(defaultAddress).resolves(true);
      await expect(callSubject()).to.be.rejectedWith('Cannot retire while still sheltering bundles');
    });
  });
});


/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import deploy from '../../helpers/deploy';
import {DAY} from '../../../src/consts';
import {TWO} from '../../helpers/consts';
import TimeMockJson from '../../../build/contracts/TimeMock.json';
import BN from 'bn.js';
import utils from '../../helpers/utils';
import {makeSnapshot, restoreSnapshot, createWeb3} from '../../../src/utils/web3_tools';

const {expect} = chai;

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Fees Contract', () => {
  let fees;
  let web3;
  const now = 1500000000;
  let time;
  let basicFee;
  let from;
  let other;
  let snapshotId;

  const getPenalty = async (nominalStake, penaltiesCount, lastPenaltyTime) => {
    const result = await fees.methods.getPenalty(nominalStake, penaltiesCount, lastPenaltyTime).call();
    return [result['0'], result['1']];
  };

  const changeBaseFee = async (fee, from) =>
    fees.methods.setBaseUploadFee(utils.toWei(fee, 'ether')).send({from});

  const getFeeForChallenge = async (storagePeriods) => fees.methods.getFeeForChallenge(storagePeriods).call();
  const getFeeForUpload = async (storagePeriods) => fees.methods.getFeeForUpload(storagePeriods).call();

  before(async () => {
    web3 = await createWeb3();
    [from, other] = await web3.eth.getAccounts();
    ({fees, time} = await deploy({
      web3,
      contracts: {
        fees: true,
        config: true,
        time: TimeMockJson
      }
    }));
    basicFee = await fees.methods.baseUploadFee().call();
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it('Basic fee challenge to be positive', () => {
    expect(new BN(basicFee).gt(new BN(0))).to.be.true;
  });

  it('Only an owner can modify basic fee', async () => {
    await expect(changeBaseFee('2'), other).to.be.eventually.rejected;
  });

  describe('Challenge fees', () => {
    it('Should throw if empty period', async () => {
      await expect(getFeeForChallenge(0)).to.be.eventually.rejected;
    });

    it('Returns proper fee for one storage period', async () => {
      const fee = await getFeeForUpload(1);
      const expected = (new BN(fee)).div(new BN(10));
      expect(await getFeeForChallenge(1)).to.equal(expected.toString());
    });

    it('Returns proper fee for two storage period', async () => {
      const fee = await getFeeForUpload(2);
      const expected = (new BN(fee)).div(new BN(10));
      expect(await getFeeForChallenge(2)).to.equal(expected.toString());
    });

    it('Calculates fee after baseChallengeFee has been changed', async () => {
      const fee = await getFeeForUpload(2);
      await changeBaseFee('20', from);
      const expected = (new BN(fee))
        .mul(TWO)
        .div(new BN(10));
      expect(await getFeeForChallenge(2)).to.equal(expected.toString());
    });
  });

  describe('Upload fees', () => {
    it('Should throw if empty period', async () => {
      await expect(getFeeForUpload(0)).to.be.eventually.rejected;
    });

    it('Calculate fee for one storage period', async () => {
      const expected = (new BN(basicFee));
      expect(await getFeeForUpload(1)).to.equal(expected.toString());
    });

    it('Calculate fee for two storage periods', async () => {
      const expected = (new BN(basicFee)).mul(TWO);
      expect(await getFeeForUpload(2)).to.equal(expected.toString());
    });

    it('Calculates fee after baseChallengeFee has been changed', async () => {
      await changeBaseFee('15', from);
      const expected = (new BN(basicFee)).mul(new BN(3));
      expect(await getFeeForUpload(2)).to.equal(expected.toString());
    });
  });

  describe('Calculate fee split', () => {
    it('Calculates split correctly', async () => {
      const {challengeFee, validatorsFee, burnFee} = await fees.methods.calculateFeeSplit(basicFee).call();
      const bnFee = new BN(basicFee);
      expect(challengeFee).to.equal(
        bnFee
          .div(new BN(10))
          .mul(new BN(7))
          .toString()
      );
      expect(validatorsFee).to.equal(
        bnFee
          .div(new BN(4))
          .toString()
      );
      expect(burnFee).to.equal(bnFee.div(new BN(20)).toString());
      expect(
        new BN(challengeFee)
          .add(new BN(validatorsFee))
          .add(new BN(burnFee))
          .toString()
      ).to.equal(basicFee);
    });
  });

  describe('Penalties', () => {
    beforeEach(async () => {
      await time.methods.setCurrentTimestamp(now).send({from});
    });

    it('First penalty should equal 1% of nominal stake', async () => {
      expect(await getPenalty(10000, 0, 0)).to.deep.equal(['100', '1']);
    });

    it('Each subsequent penalty should double', async () => {
      expect(await getPenalty(10000, 0, now)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 1, now)).to.deep.equal(['200', '2']);
      expect(await getPenalty(10000, 2, now)).to.deep.equal(['400', '3']);
      expect(await getPenalty(10000, 3, now)).to.deep.equal(['800', '4']);
      expect(await getPenalty(10000, 4, now)).to.deep.equal(['1600', '5']);
      expect(await getPenalty(10000, 5, now)).to.deep.equal(['3200', '6']);
      expect(await getPenalty(10000, 6, now)).to.deep.equal(['6400', '7']);
      expect(await getPenalty(10000, 7, now)).to.deep.equal(['12800', '8']);
    });

    it('Each subsequent penalty should double up until 90 days', async () => {
      const dayMinus89 = now - (89 * DAY);
      expect(await getPenalty(10000, 0, dayMinus89)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 1, dayMinus89)).to.deep.equal(['200', '2']);
      expect(await getPenalty(10000, 2, dayMinus89)).to.deep.equal(['400', '3']);
      expect(await getPenalty(10000, 3, dayMinus89)).to.deep.equal(['800', '4']);
      expect(await getPenalty(10000, 4, dayMinus89)).to.deep.equal(['1600', '5']);
      expect(await getPenalty(10000, 5, dayMinus89)).to.deep.equal(['3200', '6']);
      expect(await getPenalty(10000, 6, dayMinus89)).to.deep.equal(['6400', '7']);
      expect(await getPenalty(10000, 7, dayMinus89)).to.deep.equal(['12800', '8']);
    });

    it('Penalty doublation should expire after 90 days', async () => {
      const dayMinus91 = now - (91 * DAY);
      expect(await getPenalty(10000, 0, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 1, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 2, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 3, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 4, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 5, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 6, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 7, dayMinus91)).to.deep.equal(['100', '1']);
    });
  });
});

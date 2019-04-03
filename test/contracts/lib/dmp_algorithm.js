/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, deployContract, makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
import DmpAlgorithmAdapterJson from '../../../src/contracts/DmpAlgorithmAdapter.json';
import TimeMockJson from '../../../src/contracts/TimeMock.json';
import BN from 'bn.js';
import {
  DMP_PRECISION,
  ROUND_DURATION,
  ATLAS1_NUMENATOR,
  ATLAS2_NUMENATOR,
  ATLAS3_NUMENATOR
} from '../../../src/constants';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('DMP alrgorithm library', () => {
  let DmpAlgorithmAdapter;
  let time;
  let web3;
  let snapshotId;
  let context;
  const now = 1500000000;
  const challengeId = utils.keccak256('someChallengeId');
  const sequenceNumber = 2;
  const creationTime = now;
  const atlasNums = Array.from([ATLAS1_NUMENATOR, ATLAS2_NUMENATOR, ATLAS3_NUMENATOR]);
  const atlasCounts = Array.from([2, 4, 8]);
  const atlasCountsNoLast = Array.from([2, 4, 0]);

  const setTimestamp = async (timestamp) => time.methods.setCurrentTimestamp(timestamp).send({from: context});
  const currentTimestamp = async () => time.methods.currentTimestamp().call();

  const getBaseHash = async (challengeId, sequenceNumber) => DmpAlgorithmAdapter.methods.getBaseHash(challengeId, sequenceNumber).call();
  const getQualifyHash = async (challengeId, sequenceNumber, currentRound) => DmpAlgorithmAdapter.methods.getQualifyHash(challengeId, sequenceNumber, currentRound).call();
  const qualifyShelterer = async(dmpBaseHash, dmpLength, currentRound) => DmpAlgorithmAdapter.methods.qualifyShelterer(dmpBaseHash, dmpLength, currentRound).call();
  const qualifyShelterTypeStake = async(dmpBaseHash, atlasCounts, atlasNum, length) => DmpAlgorithmAdapter.methods.qualifyShelterTypeStake(dmpBaseHash, atlasCounts, atlasNum, length).call();

  before(async () => {
    web3 = await createWeb3();
    [context] = await web3.eth.getAccounts();
    time = await deployContract(web3, TimeMockJson);
    DmpAlgorithmAdapter = await deployContract(web3, DmpAlgorithmAdapterJson);

    await setTimestamp(now);
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('DMP algorithm testing', () => {
    let dmpBaseHash;

    beforeEach(async () => {
      dmpBaseHash = await getBaseHash(challengeId, sequenceNumber);
    });

    const getCurrentRound = async () => {
      const currentTime = await currentTimestamp();
      const currentRound = Math.floor((currentTime - creationTime) / ROUND_DURATION);

      return currentRound;
    };

    const chosenByIndex = async (atlassianCount, currentRound) => {
      const dmpIndexHash = await getQualifyHash(challengeId, sequenceNumber, currentRound);
      const dmpIndex = web3.utils.toBN(dmpIndexHash).mod(new BN(atlassianCount))
        .toNumber();

      return dmpIndex;
    };

    const chosenByType = async (atlas1Count, atlas2Count, atlas3Count) => {
      const denominator = ((atlas1Count * ATLAS1_NUMENATOR) + (atlas2Count * ATLAS2_NUMENATOR) + (atlas3Count * ATLAS3_NUMENATOR));

      const randomNumber = web3.utils.toBN(dmpBaseHash).mod(new BN(DMP_PRECISION))
        .toNumber();

      const atlas1WCD = Math.floor((atlas1Count * ATLAS1_NUMENATOR * DMP_PRECISION) / denominator);
      const atlas2WCD = atlas1WCD + Math.floor((atlas2Count * ATLAS2_NUMENATOR * DMP_PRECISION) / denominator);
      const atlas3WCD = atlas2WCD + Math.floor((atlas3Count * ATLAS3_NUMENATOR * DMP_PRECISION) / denominator);

      if (atlas1WCD !== 0 && randomNumber <= atlas1WCD) {
        return 0;
      } else if (atlas2WCD !== 0 && randomNumber <= atlas2WCD) {
        return 1;
      } else if (atlas3WCD !== 0 && randomNumber <= atlas3WCD) {
        return 2;
      }
    };

    it('Correct type is returned in the first phase', async () => {
      const calculatedType = await chosenByType(atlasCounts[0], atlasCounts[1], atlasCounts[2]);
      const resolverType = web3.utils.toBN(await qualifyShelterTypeStake(dmpBaseHash, atlasCounts, atlasNums, 3)).toNumber();

      expect(resolverType).to.equal(calculatedType);
    });

    it('Correct index is returned in the second phase', async () => {
      let currentRound = await getCurrentRound();
      let calculatedIndex = await chosenByIndex(20, currentRound);

      let resolverIndex = web3.utils.toBN(await qualifyShelterer(dmpBaseHash, 20, currentRound)).toNumber();

      expect(resolverIndex).to.equal(calculatedIndex);

      await setTimestamp(now + (ROUND_DURATION * 5));

      currentRound = await getCurrentRound();
      calculatedIndex = await chosenByIndex(20, currentRound);

      resolverIndex = web3.utils.toBN(await qualifyShelterer(dmpBaseHash, 20, currentRound)).toNumber();

      expect(resolverIndex).to.equal(calculatedIndex);
    });

    it('Correct index is returned if last atlas type is absent', async () => {
      const calculatedType = await chosenByType(atlasCountsNoLast[0], atlasCountsNoLast[1], atlasCountsNoLast[2]);

      const resolverType = web3.utils.toBN(await qualifyShelterTypeStake(dmpBaseHash, atlasCountsNoLast, atlasNums, 3)).toNumber();

      expect(resolverType).to.equal(calculatedType);
    });
  });
});

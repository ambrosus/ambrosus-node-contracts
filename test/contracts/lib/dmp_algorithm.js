/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, deployContract, makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
import DmpAlgorithmAdapterJson from '../../../src/contracts/DmpAlgorithmAdapter.json';
import BN from 'bn.js';
import {DMP_PRECISION} from '../../../src/constants';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('DMP algorithm library', () => {
  let DmpAlgorithmAdapter;
  let web3;
  let snapshotId;
  const dmpBaseHash = utils.keccak256('some hash');
  const resultsToInputs = {};

  const qualifyShelterer = async (dmpBaseHash, dmpLength, currentRound) => DmpAlgorithmAdapter.methods.qualifyShelterer(dmpBaseHash, dmpLength, currentRound).call();
  const selectingAtlasTier = async (dmpBaseHash, atlasCounts, atlasNum) => DmpAlgorithmAdapter.methods.selectingAtlasTier(dmpBaseHash, atlasCounts, atlasNum).call();

  before(async () => {
    web3 = await createWeb3();
    for (let ind = 0; ind < DMP_PRECISION * 5; ind++) {
      const hash = utils.keccak256(ind.toString());
      resultsToInputs[web3.utils
        .toBN(hash)
        .mod(new BN(DMP_PRECISION))
        .toNumber()] = ind.toString();
    }
    DmpAlgorithmAdapter = await deployContract(web3, DmpAlgorithmAdapterJson);
  });


  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });


  function hashGivingRandomOf(number) {
    const hash = utils.keccak256(resultsToInputs[number]);
    expect(web3.utils.toBN(hash).mod(new BN(DMP_PRECISION))
      .toNumber()).to.eq(number);
    return hash;
  }

  describe('Resolves Atlas tier', () => {
    async function selectTier(atlasCounts, atlasWeights, randomnessSource) {
      return web3.utils.toBN(await selectingAtlasTier(randomnessSource, atlasCounts, atlasWeights)).toNumber();
    }

    it('returns the only tier if only one exists', async () => {
      const atlasWeights = [1];
      const atlasCounts = [2];

      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(0))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(135))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(5000))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(9999))).to.equal(0);
    });

    it('for two equal tiers will return either with same probability', async () => {
      const atlasWeights = [1, 1];
      const atlasCounts = [5, 5];

      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(8))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(33))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(5000))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(5001))).to.equal(1);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(9999))).to.equal(1);
    });

    it('for two tiers of same count one with bigger weight is more likely to be selected', async () => {
      const atlasWeights = [9, 1];
      const atlasCounts = [5, 5];

      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(0))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(101))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(5000))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(8999))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(9000))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(9001))).to.equal(1);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(9999))).to.equal(1);
    });

    it('for two tiers of same weight one with bigger count is more likely to be selected', async () => {
      const atlasWeights = [3, 3];
      const atlasCounts = [1, 9];

      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(0))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(101))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(1000))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(1001))).to.equal(1);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(5000))).to.equal(1);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(8999))).to.equal(1);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(9000))).to.equal(1);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(9999))).to.equal(1);
    });

    it('for three tiers probability is proportional to product of weight and count', async () => {
      const atlasWeights = [1, 2, 7];
      const atlasCounts = [14, 7, 2];

      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(0))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(1))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(3333))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(3334))).to.equal(1);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(6666))).to.equal(1);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(6667))).to.equal(2);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(9999))).to.equal(2);
    });

    it('for three tiers when one tier is much more likely to be selected, rest still has some chance to get selected', async () => {
      const atlasWeights = [1, 4, 12];
      const atlasCounts = [2, 1, 66];
      // 0,0012/0,005/0,992 => [0-24, 25-75, 75-9999]
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(0))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(25))).to.equal(0);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(26))).to.equal(1);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(75))).to.equal(1);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(76))).to.equal(2);
      expect(await selectTier(atlasCounts, atlasWeights, hashGivingRandomOf(9999))).to.equal(2);
    });

    it('correct index is returned if last tier has no atlases', async () => {
      const atlasWeights = [1, 2, 7];
      const atlasCountsNoLast = [2, 4, 0];

      expect(await selectTier(atlasCountsNoLast, atlasWeights, hashGivingRandomOf(1000))).to.equal(0);
      expect(await selectTier(atlasCountsNoLast, atlasWeights, hashGivingRandomOf(3200))).to.equal(1);
      expect(await selectTier(atlasCountsNoLast, atlasWeights, hashGivingRandomOf(5000))).to.equal(1);
      expect(await selectTier(atlasCountsNoLast, atlasWeights, hashGivingRandomOf(9999))).to.equal(1);
    });
  });

  describe('Resolves Atlas in-tier', () => {
    function tries(count) {
      return new Array(count).fill(0);
    }

    function countOccurrences(array) {
      return array.reduce(
        ({[value]: count = 0, ...rest}, value) => ({...rest, [value]: count + 1}),
        {}
      );
    }

    it('each Atlas gets the same probability of being selected for same challenge', async () => {
      const numberOfTries = 400;
      const sheltererInEachRound = await Promise.all(tries(numberOfTries)
        .map(async (__, index) => web3.utils.toBN(await qualifyShelterer(dmpBaseHash, 20, index)).toNumber()
        ));

      const countMap = countOccurrences(sheltererInEachRound);

      const expectedCountForEachShelterer = numberOfTries / 20;
      const tolerance = expectedCountForEachShelterer * 0.45;
      Object
        .values(countMap)
        .forEach((count) => expect(count).to.be.closeTo(expectedCountForEachShelterer, tolerance));
    });

    it('each Atlas gets the same probability of being selected for same round of different challenge', async () => {
      const numberOfTries = 400;
      const sheltererForEachChallenge = await Promise.all(tries(numberOfTries)
        .map(async (__, index) => web3.utils.toBN(await qualifyShelterer(utils.keccak256(`${index}`), 20, 1)).toNumber()
        ));

      const countMap = countOccurrences(sheltererForEachChallenge);

      const expectedCountForEachShelterer = numberOfTries / 20;
      const tolerance = expectedCountForEachShelterer * 0.45;
      Object
        .values(countMap)
        .forEach((count) => expect(count).to.be.closeTo(expectedCountForEachShelterer, tolerance));
    });
  });
});

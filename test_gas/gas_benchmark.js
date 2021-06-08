/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {createWeb3} from '../src/utils/web3_tools';
import TimeMockJson from '../src/contracts/TimeMock.json';
import deploy from '../test/helpers/deploy';
import {
  ATLAS,
  ATLAS1_STAKE,
  HERMES
} from '../src/constants';
import BN from 'bn.js';

let web3;
let gasUsed;
let from;
let hermes;
let perseus;
let challengesEventEmitter;
let challenges;
let time;
let kycWhitelist;
let roles;
let fees;
let uploads;
let incorrectResolver;
const atlassian = [];


const now = 1500000000;
const storagePeriods = 1;
const bundleId = '0xbeef';

const runGasBenchmark = async () => {
  await setupEnvironment();
  require('events').EventEmitter.prototype._maxListeners = 0;
  console.log(`\n Basic AMB-NET operations gas costs:\n`);

  gasUsed  = getGasUsed(await onboardAsHermes(hermes));
  console.log(`                  Hermes onboarding: ${gasUsed}`);

  gasUsed  = getGasUsed(await onboardAsAtlas(atlassian[0]));
  console.log(`                   Atlas onboarding: ${gasUsed}`);

  await onboardAsAtlas(atlassian[1]);
  await onboardAsAtlas(atlassian[2]);

  const feeForUpload = await getFeeForUpload(storagePeriods);
  gasUsed  = getGasUsed(await registerBundle(hermes, bundleId, storagePeriods, feeForUpload));
  console.log(`                    Register bundle: ${gasUsed}`);

  const systemChallengeId = await lastChallengeId();
  const systemResolver = await getChallengeDesignatedShelterer(systemChallengeId);
  gasUsed  = getGasUsed(await resolveChallenge(systemChallengeId, systemResolver));
  console.log(`           Resolve system challenge: ${gasUsed}`);

  const feeForChallenge = await getFeeForChallenge(storagePeriods);
  gasUsed  = getGasUsed(await startChallenge(systemResolver, bundleId, perseus, feeForChallenge));
  console.log(`               Start user challenge: ${gasUsed}`);

  const userChallengeId = await lastChallengeId();
  const resolver = await getChallengeDesignatedShelterer(userChallengeId);
  gasUsed  = getGasUsed(await resolveChallenge(userChallengeId, resolver));
  console.log(`Successfully resolve user challenge: ${gasUsed}`);

  const lastSystemResolver = await getChallengeDesignatedShelterer(systemChallengeId);
  if (lastSystemResolver !== atlassian[0]) {
    [incorrectResolver] = atlassian;
  } else if (lastSystemResolver !== atlassian[1]) {
    [, incorrectResolver] = atlassian;
  } else {
    [, , incorrectResolver] = atlassian;
  }

  try {
    await resolveChallenge(systemChallengeId, incorrectResolver);
  } catch (error) {
    gasUsed = extractGasUsedFromError(error);
    console.log(`      Fail resolving user challenge: ${gasUsed}`);
  }

  console.log('\n');
};

const setupEnvironment = async () => {
  web3 = await createWeb3();
  [from, hermes, perseus, atlassian[0], atlassian[1], atlassian[2]] = await web3.eth.getAccounts();
  ({challenges, time, kycWhitelist, roles, fees, uploads, challengesEventEmitter} = await deploy({
    web3,
    contracts: {
      challenges: true,
      bundleStore: true,
      fees: true,
      sheltering: true,
      uploads: true,
      atlasStakeStore: true,
      apolloDepositStore: true,
      time: TimeMockJson,
      roles: true,
      kycWhitelist: true,
      kycWhitelistStore: true,
      config: true,
      payouts: true,
      payoutsStore: true,
      rolesStore: true,
      shelteringTransfersStore: true,
      challengesStore: true,
      rolesEventEmitter: true,
      rewardsEventEmitter: true,
      challengesEventEmitter: true,
      transfersEventEmitter: true
    }}));
  await setTimestamp(now);
  await kycWhitelist.methods.add(atlassian[0], ATLAS, ATLAS1_STAKE).send({from});
  await kycWhitelist.methods.add(atlassian[1], ATLAS, ATLAS1_STAKE).send({from});
  await kycWhitelist.methods.add(atlassian[2], ATLAS, ATLAS1_STAKE).send({from});
  await kycWhitelist.methods.add(hermes, HERMES, 0).send({from});
};

const setTimestamp = async (timestamp) => time.methods.setCurrentTimestamp(timestamp).send({from});

const onboardAsAtlas = async (address) => {
  const url = `${address}@atlasUrl.com`;
  return roles.methods.onboardAsAtlas(url).send({from: address, value: ATLAS1_STAKE});
};

const onboardAsHermes = async (address) => {
  const url = `${address}@hermesUrl.com`;
  return roles.methods.onboardAsHermes(url).send({from: address});
};

const getFeeForUpload = async (storagePeriods) => new BN(await fees.methods.getFeeForUpload(storagePeriods).call());

const registerBundle = async (uploaderId, bundleId, storagePeriods, fee) => uploads.methods.registerBundle(bundleId, storagePeriods).send({from: uploaderId, value: fee});

const resolveChallenge = async (challengeId, resolverId) => challenges.methods.resolve(challengeId).send({from: resolverId});

const getFeeForChallenge = async (storagePeriods) => new BN(await fees.methods.getFeeForChallenge(storagePeriods).call());

const startChallenge = async (sheltererId, bundleId, challengerId, fee) => challenges.methods.start(sheltererId, bundleId).send({from: challengerId, value: fee});

const getChallengeDesignatedShelterer = async (challengeId) => challenges.methods.getChallengeDesignatedShelterer(challengeId).call();

const lastChallengeId = async () => {
  const [challengeCreationEvent] = await challengesEventEmitter.getPastEvents('allEvents');
  return challengeCreationEvent.returnValues.challengeId;
};

const getGasUsed = (tx) => tx.gasUsed;

const extractGasUsedFromError = (error) => {
  const {message} = error;
  const regex = /"gasUsed": (\d+)/g;
  const result = regex.exec(message);
  return result ? result[1] : undefined;
};

runGasBenchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});

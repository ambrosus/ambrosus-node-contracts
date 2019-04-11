/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const Ganache = require('ganache-core');
const {exec} = require('child_process');
const fs = require('fs');
const dotenv = require('dotenv');

const PORT = 8777;

const adminUser = {
  privateKey: '0x0437b4d845f99fd40155fe63379c961d93c1f4fbd1eb42b75328f7baf754ab48',
  address: '0x2C72a45FC3A7A48C9dB1ab40c31df0f58c27fcdb'
};

const apolloUser = {
  privateKey: '0x8deeb01a11f8dab88027556125eadc7110caa0d938464c5ac33bcd4e2b79c7de',
  address: '0xD09f1d3855159bDBC3D2a292e3960786C701Eb0B'
};

const atlasUser = {
  privateKey: '0x1572c318193427f664b526e2c1710f441122f5929acb0dcc5054fbed1f5c966f',
  address: '0xD392341D72e1B2B3b6dE02604e7913A60D7B21Ae'
};

const hermesUser = {
  privateKey: '0x2c6d57b31ca7c55ca76417d16650136ae625d37ef2824553eb52153dd86a91e7',
  address: '0xC04c60FB732724a287f147f8bfC1cEF108a0C45b'
};

const approvalPublicKeys = `${adminUser.address},${hermesUser.address}`;

const printError = (message) => console.error('\x1b[31m', message, '\x1b[0m');

const startGanacheServer = (privateKeys) => new Promise((resolve, reject) => {
  const accountRequests = privateKeys.map((value) => ({
    balance: '10000000000000000000000000000000000',
    secretKey: value
  }));
  const server = Ganache.server({
    accounts: [
      ...accountRequests,
      ...Array(9).fill({balance: '10000000000000000000000000000000000'})
    ]
  });
  server.listen(PORT, (err) => {
    if (err) {
      reject(err);
    } else {
      resolve(server);
    }
  });
});

const execute = (command, env = {}) => new Promise((resolve, reject) => {
  console.log(command);
  exec(command, {env: {...process.env, ...env}, cwd: __dirname},
    (error, stdout, stderr) => {
      if (stderr) {
        printError(stderr);
      }
      if (error) {
        console.log(stdout);
        reject(error);
      } else {
        console.log(stdout);
        resolve(stdout);
      }
    }
  );
});

const updateEnvs = (deployEnvFile) => {
  const envForUser = (account) => ({
    WEB3_RPC: `http://localhost:${PORT}`,
    WEB3_NODEPRIVATEKEY: account.privateKey,
    MULTISIG_APPROVAL_ADDRESSES: approvalPublicKeys
  });

  const deployConfig = dotenv.parse(fs.readFileSync(deployEnvFile));
  return {
    adminEnv: {
      ...envForUser(adminUser),
      ...deployConfig
    }, apolloEnv: {
      ...envForUser(apolloUser),
      ...deployConfig
    }, atlasEnv: {
      ...envForUser(atlasUser),
      ...deployConfig
    }, hermesEnv: {
      ...envForUser(hermesUser),
      ...deployConfig
    }
  };
};

startGanacheServer(
  [
    adminUser.privateKey,
    apolloUser.privateKey,
    atlasUser.privateKey,
    hermesUser.privateKey
  ])
  .then(async (server) => {
    let failed = false;
    try {
      const deployEnvFile = `${__dirname}/test_cli_head.env`;
      await fs.writeFileSync(deployEnvFile, '');
      await execute(`yarn task deployGenesis --save ${deployEnvFile}`, adminEnv);
      let {adminEnv, apolloEnv, atlasEnv, hermesEnv} = await updateEnvs(deployEnvFile);
      await execute(`yarn task deploy initial`, adminEnv);

      const verifyFails = async (work) => {
        let failed = false;
        try {
          await work();
        } catch (err) {
          failed = true;
        }
        if (!failed) {
          throw new Error('Should have failed');
        }
      };

      console.log('------ test deploy update ------');
      await execute(`yarn task deploy update --save ${deployEnvFile}`, adminEnv);
      ({adminEnv, apolloEnv, atlasEnv, hermesEnv} = await updateEnvs(deployEnvFile));
      await verifyFails(async () => {
        await execute(`yarn task deploy update`, apolloEnv);
      });

      await execute(`yarn task deployMultisig --save ${deployEnvFile} --required 1`, adminEnv);
      ({adminEnv, apolloEnv, atlasEnv, hermesEnv} = await updateEnvs(deployEnvFile));

      const verifyNodeState = async (address, whitelistedRole, onboardedRole, stake, url) => {
        const ret = await execute(`yarn task whitelist get ${address}`, adminEnv);
        const regexStr = `Address ${address} is whitelisted for the ${whitelistedRole} role with ${stake} AMB deposit/stake\\W+Address ${address} is onboarded for the ${onboardedRole} role with url:\\W*${url}`;
        const regex = new RegExp(regexStr, 'g');
        if (!regex.test(ret)) {
          throw new Error('Expected whitelist/onboard state not present');
        }
      };

      const verifyOwnershipState = async (address, expectedOwner) => {
        const ret = await execute(`yarn task checkOwnership ${address}`, adminEnv);
        const regex = new RegExp(expectedOwner, 'g');
        if (!regex.test(ret)) {
          throw new Error(`Expected contract owner to be ${expectedOwner} but got ${ret}`);
        }
      };

      console.log('------ test multiplexer ------');
      await verifyOwnershipState(adminEnv.MULTIPLEXER_CONTRACT_ADDRESS, adminEnv.MULTISIG_CONTRACT_ADDRESS);
      await execute(`yarn task moveOwnershipToMultiplexer ${adminEnv.MULTIPLEXER_CONTRACT_ADDRESS}`, adminEnv);
      await verifyOwnershipState(adminEnv.HEAD_CONTRACT_ADDRESS, adminEnv.MULTIPLEXER_CONTRACT_ADDRESS);
      await execute(`yarn task moveOwnershipFromMultiplexer ${adminUser.address}`, adminEnv);
      await verifyOwnershipState(adminEnv.HEAD_CONTRACT_ADDRESS, adminUser.address);

      console.log('------ test whitelisting ------');
      await verifyNodeState(apolloUser.address, 'NONE', 'NONE', '0', '');
      await execute(`yarn task whitelist add ${apolloUser.address} APOLLO 250000`, adminEnv);
      await verifyNodeState(apolloUser.address, 'APOLLO', 'NONE', '250000', '');
      await execute(`yarn task whitelist remove ${apolloUser.address}`, adminEnv);
      await verifyNodeState(apolloUser.address, 'NONE', 'NONE', '0', '');

      console.log('------ test APOLLO onboarding ------');
      await execute(`yarn task whitelist add ${apolloUser.address} APOLLO 250000`, adminEnv);
      await verifyNodeState(apolloUser.address, 'APOLLO', 'NONE', '250000', '');
      await execute(`yarn task onboard APOLLO 250000`, apolloEnv);
      await verifyNodeState(apolloUser.address, 'APOLLO', 'APOLLO', '250000', '');
      await execute(`yarn task retire`, apolloEnv);
      await verifyNodeState(apolloUser.address, 'APOLLO', 'NONE', '250000', '');

      console.log('------ test ATLAS onboarding ------');
      await execute(`yarn task whitelist add ${atlasUser.address} ATLAS 75000`, adminEnv);
      await verifyNodeState(atlasUser.address, 'ATLAS', 'NONE', '75000', '');
      await execute(`yarn task onboard ATLAS 75000 http://example.com`, atlasEnv);
      await verifyNodeState(atlasUser.address, 'ATLAS', 'ATLAS', '75000', 'http://example.com');
      await execute(`yarn task nodeService setUrl http://amazon.com`, atlasEnv);
      await verifyNodeState(atlasUser.address, 'ATLAS', 'ATLAS', '75000', 'http://amazon.com');
      await execute(`yarn task retire`, atlasEnv);
      await verifyNodeState(atlasUser.address, 'ATLAS', 'NONE', '75000', '');

      console.log('------ test HERMES onboarding ------');
      await execute(`yarn task whitelist add ${hermesUser.address} HERMES 0`, adminEnv);
      await verifyNodeState(hermesUser.address, 'HERMES', 'NONE', '0', '');
      await execute(`yarn task onboard HERMES http://example.com`, hermesEnv);
      await verifyNodeState(hermesUser.address, 'HERMES', 'HERMES', '0', 'http://example.com');
      await execute(`yarn task nodeService setUrl http://google.com`, hermesEnv);
      await verifyNodeState(hermesUser.address, 'HERMES', 'HERMES', '0', 'http://google.com');
      await execute(`yarn task retire`, hermesEnv);
      await verifyNodeState(hermesUser.address, 'HERMES', 'NONE', '0', '');
    } catch (err) {
      printError(err);
      failed = true;
    }
    server.close();
    if (failed) {
      process.exit(1);
    }
  });

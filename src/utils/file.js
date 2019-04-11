/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import fs from 'fs';

const writeFile = (path, data) =>
  new Promise((resolve, reject) => {
    fs.writeFile(path, data, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

const readFile = (path) =>
  new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

const appendFile = (path, data) =>
  new Promise((resolve, reject) => {
    fs.appendFile(path, data, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

const checkFileExists = (path) =>
  new Promise((resolve) => {
    fs.access(path, (err) => {
      resolve(!err);
    });
  });

const listDirectory = (path) =>
  new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });

const appendEnvFile = async (envFilePath, envFileData) => {
  try {
    await appendFile(envFilePath, envFileData);
    console.log(`Env updated in ${envFilePath}.`);
  } catch (err) {
    console.error(`Unable to save configuration: ${err}`);
  }
};

export {writeFile, appendFile, readFile, checkFileExists, listDirectory, appendEnvFile};

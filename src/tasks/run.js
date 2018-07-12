/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import WhitelistTask from './whitelist';
import DeployTask from './deploy';
import GanacheTask from './ganache';
import List from './base/list';


const runTask = () => {
  const list = new List();
  const args = process.argv.slice(2);
  list.add('deploy', new DeployTask());
  list.add('ganache', new GanacheTask());
  list.add('whitelist', new WhitelistTask());  
  list.run(args[0], args.slice(1));
};

runTask();

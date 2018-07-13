/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class TaskList {
  constructor() {
    this.tasks = {};
  }

  add(name, task) {
    this.tasks[name] = task;
  }

  printAvailableTasks() {
    console.log('Available tasks:');
    for (const [name, task] of Object.entries(this.tasks)) {
      console.log(` ${name} ${task.description()}`);
    }
    console.log();
  }

  run(name, args) {
    const task = this.tasks[name];
    if (task) {
      task.execute(args)
        .then(() => {
          console.log('Done.');
        })
        .catch((error) => {
          console.error(error);
        });  
    } else {
      console.error(`Error: Could not find and execute task '${name}'.\n`);
      this.printAvailableTasks();
    }
  }
}

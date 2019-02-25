/*
Copyright: Ambrosus Inc.
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

  printHelp() {
    console.log('Available tasks:');
    const prepared = Object.entries(this.tasks).reduce(
      (acc, [name, task]) => {
        const help = task.help();
        const leftColumn = name + (help.options ? ` ${help.options}` : '');
        if (leftColumn.length > acc.leftColumnMax) {
          acc.leftColumnMax = leftColumn.length;
        }
        acc.entries.push([leftColumn, help.description]);
        return acc;
      },
      {
        leftColumnMax: 0,
        entries: []
      }
    );
    prepared.entries.forEach(([leftColumn, rightColumn]) => {
      console.log(` ${leftColumn.padEnd(prepared.leftColumnMax)}  - ${rightColumn}`);
    });
    console.log();
  }

  async run(name, args) {
    const task = this.tasks[name];
    if (task) {
      await task.execute(args);
    } else {
      console.error(`Error: Could not find and execute task '${name}'.\n`);
      this.printHelp();
    }
  }
}

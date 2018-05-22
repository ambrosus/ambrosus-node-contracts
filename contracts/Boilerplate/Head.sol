/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Context.sol";

contract Head is Ownable {
  event ContextChange(Context context);

  Context public context;

  function setContext(Context _context) public onlyOwner {
    context = _context;
    emit ContextChange(context);
  }
}

contract Base {
  Head head;

  constructor(Head _head) public {
    head = _head;
  }

  modifier canCall() {
    require(context().canCall(address(this)), "This contract has been changed");
    _;
  }

  function context() view public returns (Context) {
    return head.context();
  }
}

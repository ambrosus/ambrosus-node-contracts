/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "./Context.sol";
import "../Consensus/ConstructorOwnable.sol";


contract Head is ConstructorOwnable {
    Context public context;

    event ContextChange(Context context);

    /**
    @notice Constructor
    @param _owner the owner of this contract.
    */
    constructor(address _owner) public ConstructorOwnable(_owner) {
    }
        
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

    modifier onlyContextInternalCalls() {
        require(context().isInternalToContext(address(msg.sender)), "The message sender is not whitelisted by the context");
        _;
    }

    function context() view public returns (Context) {
        return head.context();
    }

    function migrateFunds(address targetContractAddress) public onlyContextInternalCalls {
        require(!context().isInternalToContext(address(this)), "Called contract can not be context internal");
        require(context().isInternalToContext(targetContractAddress), "Targeted address must be context internal");
        targetContractAddress.transfer(address(this).balance);
    }
}

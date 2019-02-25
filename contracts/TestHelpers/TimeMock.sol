/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Configuration/Time.sol";


contract TimeMock is Time {
    uint64 public mockedTimestamp = 0;

    function setCurrentTimestamp(uint64 _mockedTimestamp) public {
        mockedTimestamp = _mockedTimestamp;
    }

    function currentTimestamp() public view returns(uint64) {
        return mockedTimestamp;
    }
}

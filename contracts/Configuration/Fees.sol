/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../Lib/SafeMathExtensions.sol";
import "../Boilerplate/Head.sol";
import "../Configuration/Config.sol";
import "../Configuration/Time.sol";


contract Fees is Base, Ownable {

    using SafeMath for uint;
    using SafeMathExtensions for uint;

    uint constant private MILLION = 1000000;
    uint constant public CHALLENGER_FEE_DIVIDER = 10;
    uint constant public CHALLENGER_FEE_MULTIPLIER = 7;
    uint constant public UPLOAD_FEE_TO_CHALLENGE_FEE_RATIO = 10;

    uint public baseUploadFee = 10 ether;
    uint public supportFeePPM = 0;
    uint public developerFeePPM = 0;
    uint public developerUploadFeePPM = 0;
    address public developer;
    address public support;
    Config private config;
    Time private time;

    mapping (address => bool) public isAdmin;
    address[] public admins;

    constructor(Head _head, Config _config, Time _time) public Base(_head) {
        config = _config;
        time = _time;
    }

    function setDeveloper(address _developer) public onlyOwner {
        developer = _developer;
    }

    function setSupport(address _support) public onlyOwner {
        support = _support;
    }

    function setDeveloperFee(uint fee) public onlyOwner {
        require(fee >= 0 && fee <= MILLION);
        developerFeePPM = fee;
    }

    function setDeveloperUploadFee(uint fee) public onlyOwner {
        require(fee >= 0);
        developerUploadFeePPM = fee;
    }

    function setSupportFee(uint fee) public onlyOwner {
        require(fee >= 0);
        supportFeePPM = fee;
    }

    function getDeveloperUploadFee(uint amount) public view returns (uint) {
        if (developerUploadFeePPM > 0) {
            uint fee = amount.sub(amount.mul(developerUploadFeePPM).div(MILLION)).div(UPLOAD_FEE_TO_CHALLENGE_FEE_RATIO).mul(UPLOAD_FEE_TO_CHALLENGE_FEE_RATIO);
            return amount - fee;
        } else {
            return 0;
        }
    }

    function setBaseUploadFee(uint fee) public onlyOwner {
        require(fee > 0 && fee.mod(UPLOAD_FEE_TO_CHALLENGE_FEE_RATIO) == 0);
        baseUploadFee = fee;
    }

    function getFeeForUpload(uint64 storagePeriods) public view returns(uint) {
        require(storagePeriods > 0);
        return baseUploadFee.mul(storagePeriods);
    }

    function getFeeForChallenge(uint64 storagePeriods) public view returns (uint) {
        if (developerUploadFeePPM > 0) {
            uint fee = getFeeForUpload(storagePeriods);
            return fee.sub(fee.mul(developerUploadFeePPM).div(MILLION)).div(UPLOAD_FEE_TO_CHALLENGE_FEE_RATIO).mul(UPLOAD_FEE_TO_CHALLENGE_FEE_RATIO).div(UPLOAD_FEE_TO_CHALLENGE_FEE_RATIO);
        } else {
            return getFeeForUpload(storagePeriods).div(UPLOAD_FEE_TO_CHALLENGE_FEE_RATIO);
        }
    }

    function calculateFeeSplit(uint value) public pure returns (uint challengeFee, uint validatorsFee) {
        challengeFee = value.mul(CHALLENGER_FEE_MULTIPLIER).div(CHALLENGER_FEE_DIVIDER);
        validatorsFee = value.sub(challengeFee);
    }

    function getPenalty(uint nominalStake, uint penaltiesCount, uint lastPenaltyTime) public view returns(uint penalty, uint newPenaltiesCount) {
        if ((time.currentTimestamp() - lastPenaltyTime) > config.PENALTY_ESCALATION_TIMEOUT()) {
            return (nominalStake.div(config.PENALTY_DIVIDER()), 1);
        } else {
            return (nominalStake.mul(penaltiesCount.safePow2()).div(config.PENALTY_DIVIDER()), penaltiesCount + 1);
        }
    }

    function getAdmins() public view returns (address[]) {
        return admins;
    }

    function addAdmin(address admin) public onlyOwner {
        isAdmin[admin] = true;
        admins.push(admin);
    }

    function removeAdmin(address admin) public onlyOwner {
        if (isAdmin[admin]) {
            isAdmin[admin] = false;
            for (uint i=0; i<admins.length - 1; i++) {
                if (admins[i] == admin) {
                    admins[i] = admins[admins.length - 1];
                    break;
                }
            }
            admins.length -= 1;
        }
    }
}

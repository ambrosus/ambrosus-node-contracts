pragma solidity ^0.4.15;

import "../Boilerplate/Head.sol";

contract RolesPrivilagesStore is Base {
    string public constant SUPER_ADMIN_ROLE_STR = "SUPER_ADMIN_ROLE";
    bytes32 public constant SUPER_ADMIN_ROLE = keccak256(abi.encodePacked(SUPER_ADMIN_ROLE_STR));

    mapping(bytes32 => mapping(bytes4 => bool)) rolesScope;
    bytes32[] private _rolesList;
    mapping(bytes32 => string) private rolesNames;
    mapping(string => bytes32) private rolesHexes;
    mapping(address => bytes32[]) private usersRoles;

    constructor(Head _head) public Base(_head) {}

    function setAdminUsers(address[] adminUsers)
        external
    {
        if (rolesScope[SUPER_ADMIN_ROLE][0x0]) {
            return;
        }
        for (uint256 i = 0; i < adminUsers.length; i++) {
            usersRoles[adminUsers[i]].push(SUPER_ADMIN_ROLE);
        }
        rolesScope[SUPER_ADMIN_ROLE][0x0] = true;
    }

    function hasPrivilage(address sender, bytes4 selector)
        public
        view
        returns (bool)
    {
        bytes32[] storage userRoles = usersRoles[sender];
        for (uint256 i = 0; i < userRoles.length; i++) {
            if (userRoles[i] == SUPER_ADMIN_ROLE) {
                return true;
            }
            if (rolesScope[userRoles[i]][selector]) {
                return true;
            }
        }
        return false;
    }

    function setRole(
        string roleName,
        bytes4[] trueSelector,
        bytes4[] falseSelectors
    )
	public
        onlyContextInternalCalls
    {
        if (rolesHexes[roleName] != SUPER_ADMIN_ROLE) {
            uint256 i;
            if (rolesHexes[roleName] == "") {
                bytes32 roleHex = keccak256(abi.encodePacked(roleName));
                rolesNames[roleHex] = roleName;
                rolesHexes[roleName] = roleHex;

                for (i = 0; i < trueSelector.length; i++) {
                    rolesScope[roleHex][trueSelector[i]] = true;
                }
            } else {
                for (i = 0; i < trueSelector.length; i++) {
                    rolesScope[rolesHexes[roleName]][trueSelector[i]] = true;
                }

                for (i = 0; i < falseSelectors.length; i++) {
                    rolesScope[rolesHexes[roleName]][falseSelectors[i]] = false;
                }
            }
        }
    }

    function getRoleNameByHex(bytes32 roleHex) public view returns (string) {
        return rolesNames[roleHex];
    }

    function getRoleHexByName(string roleName) public view returns (bytes32) {
        return rolesHexes[roleName];
    }

    function getRoleHexes() public view returns (bytes32[]) {
        return _rolesList;
    }

    function getRoles(address account) public view returns (bytes32[] memory) {
        return usersRoles[account];
    }

    function setRoles(address user, bytes32[] roles)
        external
        onlyContextInternalCalls
    {
        usersRoles[user] = roles;
    }
}

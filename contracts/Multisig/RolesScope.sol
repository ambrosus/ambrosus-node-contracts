pragma solidity ^0.4.15;

import "../Boilerplate/Head.sol";
import "../AccessControl/AccessControl.sol";

contract RolesScopes is Base {
    // AccessControl fields
    struct RoleData {
        mapping(address => bool) members;
        bytes32 adminRole;
    }
    mapping(bytes32 => RoleData) private _roles;
    bytes32[] private _rolesList;
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    event RoleGranted(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );
    event RoleRevoked(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );

    // RolesScopes fields
    mapping(bytes32 => mapping(bytes4 => bool)) rolesScope;
    mapping(bytes32 => string) private rolesNames;
    mapping(string => bytes32) private rolesHexes;

    constructor(Head _head, address[] memory adminUsers) public Base(_head) {
        for (uint256 i = 0; i < adminUsers.length; i++) {
            _setupRole(DEFAULT_ADMIN_ROLE, adminUsers[i]);
        }
    }

    function hasPrivilage(bytes32 roleName, bytes4 selector)
        public
        view
        returns (bool)
    {
        return rolesScope[roleName][selector];
    }

    // only internal context call
    function setRole(string roleName,bytes4 selector,bool hasPrivilage) public onlyContextInternalCalls {
        string memory d = "DEFAULT_ADMIN_ROLE";
        if (
            keccak256(abi.encodePacked((roleName))) ==
            keccak256(abi.encodePacked((d)))
        ) {
            rolesNames[0x00] = roleName;
            rolesHexes[roleName] = 0x00;
        } else {
            if (rolesHexes[roleName] == "") {
                bytes32 roleHex = keccak256(roleName);
                rolesScope[roleHex][selector] = hasPrivilage;
                rolesNames[roleHex] = roleName;
                rolesHexes[roleName] = roleHex;
            }
            else {
                rolesScope[rolesHexes[roleName]][selector] = hasPrivilage;
            }
        }
    }

    function getRoleNameByHex(bytes32 roleHex) public view returns (string) {
        return rolesNames[roleHex];
    }

    function getRoleHexByName(string roleName) public view returns (bytes32) {
        return rolesHexes[roleName];
    }

    function getRoles(address account) public returns (bytes32[] memory) {
        bytes32[] roles;
        for (uint256 i = 0; i < _rolesList.length; i++) {
            if (_roles[_rolesList[i]].members[account]) {
                roles.push(_rolesList[i]);
            }
        }
        return roles;
    }

    function _setupRole(bytes32 role, address account)
        onlyContextInternalCalls
    {
        _grantRole(role, account);
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role].members[account];
    }

    function revokeRole(bytes32 role, address account) public {
        _revokeRole(role, account);
    }

    function _revokeRole(bytes32 role, address account)
        onlyContextInternalCalls
    {
        if (hasRole(role, account)) {
            _roles[role].members[account] = false;
            emit RoleRevoked(role, account, _msgSender());
        }
    }

    function _checkRole(bytes32 role, address account)
        view
    {
        if (!hasRole(role, account)) {
            revert(
                string(
                    abi.encodePacked(
                        "AccessControl: account ",
                        Strings.toHexString(uint160(account), 20),
                        " is missing role ",
                        Strings.toHexString(uint256(role), 32)
                    )
                )
            );
        }
    }

    function _checkRole(bytes32 role) view {
        _checkRole(role, _msgSender());
    }

    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    function _grantRole(bytes32 role, address account)
        onlyContextInternalCalls
    {
        if (!hasRole(role, account)) {
            _roles[role].members[account] = true;
            bool haveRole = false;
            for (uint256 i = 0; i < _rolesList.length; i++) {
                if (_rolesList[i] == role) {
                    haveRole = true;
                    break;
                }
            }
            if (!haveRole) {
                _rolesList.push(role);
            }
            emit RoleGranted(role, account, _msgSender());
        }
    }

    function _msgSender() view returns (address) {
        return msg.sender;
    }
}

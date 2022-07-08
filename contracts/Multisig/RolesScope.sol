pragma solidity ^0.4.15;

import "../Boilerplate/Head.sol";

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

    modifier isAdmin(address user) {
        require(hasRole(DEFAULT_ADMIN_ROLE, user), "Caller is not an admin");
        _;
    }

    function _hasPrivilage(bytes32 roleName, bytes4 selector)
        private
        view
        returns (bool)
    {
        return rolesScope[roleName][selector];
    }

    function hasPrivilage(address sender, bytes memory data)
        public
        view
        onlyContextInternalCalls
        returns (bool)
    {
        bool isConfirmed = false;
        bytes4 selector = _convertBytesToBytes4(data);
        bytes32[] memory userRoles = getRoles(sender);
        for (uint256 i = 0; i < userRoles.length; i++) {
            if (_hasPrivilage(userRoles[i], selector)) {
                isConfirmed = true;
                break;
            }
        }
        return isConfirmed;
    }

    function _convertBytesToBytes4(bytes inBytes)
        private
        pure
        returns (bytes4 outBytes4)
    {
        if (inBytes.length == 0) {
            return 0x0;
        }

        assembly {
            outBytes4 := mload(add(inBytes, 32))
        }
    }

    // array of selectors, clear roleName before set selectors
    function setRole(
        string roleName,
        bytes4 selector,
        bool havePrivilage
    ) public onlyContextInternalCalls {
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
                rolesNames[roleHex] = roleName;
                rolesHexes[roleName] = roleHex;
                rolesScope[roleHex][selector] = havePrivilage;
            } else {
                rolesScope[rolesHexes[roleName]][selector] = havePrivilage;
            }
        }
    }

    function setFullRole(
        string roleName,
        bytes4[] trueSelector,
        bytes4[] falseSelectors
    ) public onlyContextInternalCalls {
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
                rolesNames[roleHex] = roleName;
                rolesHexes[roleName] = roleHex;
                for (uint256 i = 0; i < falseSelectors.length; i++) {
                    rolesScope[roleHex][falseSelectors[i]] = false;
                }
                for (i = 0; i < trueSelector.length; i++) {
                    rolesScope[roleHex][trueSelector[i]] = true;
                }
            } else {
                for (i = 0; i < falseSelectors.length; i++) {
                    rolesScope[rolesHexes[roleName]][falseSelectors[i]] = false;
                }
                for (i = 0; i < trueSelector.length; i++) {
                    rolesScope[rolesHexes[roleName]][trueSelector[i]] = true;
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

    function getRoles(address account) public returns (bytes32[] memory) {
        bytes32[] roles;
        for (uint256 i = 0; i < _rolesList.length; i++) {
            if (_roles[_rolesList[i]].members[account]) {
                roles.push(_rolesList[i]);
            }
        }
        return roles;
    }

    function _setupRole(bytes32 role, address account) private {
        grantRole(role, account);
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role].members[account];
    }

    function revokeRole(bytes32 role, address account)
        public
        isAdmin(msg.sender)
    {
        _revokeRole(role, account);
    }

    function _revokeRole(bytes32 role, address account) private {
        if (hasRole(role, account)) {
            _roles[role].members[account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }

    function grantRole(bytes32 role, address account)
        isAdmin(msg.sender)
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
            emit RoleGranted(role, account, msg.sender);
        }
    }

    function grantRoles(bytes32[] roleHexes, address user)
        isAdmin(msg.sender)
        onlyContextInternalCalls
    {
        for (uint256 i = 0; i < _rolesList.length; i++) {
            if (_rolesList[i] == roleHexes[i]) {
                grantRole(roleHexes[i], user);
            } else {
                _revokeRole(roleHexes[i], user);
            }
        }
    }
}

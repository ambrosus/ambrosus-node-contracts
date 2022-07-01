pragma solidity ^0.4.15;

contract RolesScopes {
    mapping(string => mapping(bytes4 => bool)) rolesScope;
    mapping(bytes32 => string) private rolesNames;
    mapping(string => bytes32) private rolesHexes;

    function hasPrivilage(string roleName, bytes4 selector)
        public
        view
        returns (bool)
    {
        return rolesScope[roleName][selector];
    }

    function setRole(
        string roleName,
        bytes4 selector,
        bool hasPrivilage
    ) public {
        rolesScope[roleName][selector] = hasPrivilage;
        if (roleName == "DEFAULT_ADMIN_ROLE") {
            rolesNames[0x00] = roleName;
            rolesHexes[roleName] = 0x00;
        } else {
            bytes32 roleHex = keccak256(roleName);
            rolesNames[roleHex] = roleName;
            rolesHexes[roleName] = roleHex;
        }
    }

    function getRoleNameByHex(bytes32 roleHex) public view returns (string) {
        return rolesNames[roleHex];
    }

    function getRoleHexByName(string roleName) public view returns (bytes32) {
        return rolesHexes[roleName];
    }
}

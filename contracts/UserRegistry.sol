// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UserRegistry {
    // Option A: no Administrator role
    enum Role {
        None,
        Shipper,
        Carrier,
        Warehouse,
        Customs
    }

    struct User {
        string name;
        Role role;
        bool registered;
        bool suspended;
    }

    // Technical contract owner, not a dispute-resolution role
    address public owner;

    mapping(address => User) private users;

    event UserRegistered(
        address indexed userAddress,
        string name,
        Role role
    );

    event UserSuspensionUpdated(
        address indexed userAddress,
        bool suspended
    );

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only contract owner can perform this action"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerUser(
        string calldata name,
        Role role
    ) external {
        require(
            !users[msg.sender].registered,
            "User is already registered"
        );

        require(
            bytes(name).length > 0,
            "Name cannot be empty"
        );

        require(
            role != Role.None,
            "A valid role is required"
        );

        users[msg.sender] = User({
            name: name,
            role: role,
            registered: true,
            suspended: false
        });

        emit UserRegistered(
            msg.sender,
            name,
            role
        );
    }

    function setUserSuspension(
        address userAddress,
        bool suspended
    ) external onlyOwner {
        require(
            users[userAddress].registered,
            "User is not registered"
        );

        users[userAddress].suspended = suspended;

        emit UserSuspensionUpdated(
            userAddress,
            suspended
        );
    }

    function getUser(
        address userAddress
    ) external view returns (User memory) {
        require(
            users[userAddress].registered,
            "User is not registered"
        );

        return users[userAddress];
    }

    function getRole(
        address userAddress
    ) external view returns (Role) {
        require(
            users[userAddress].registered,
            "User is not registered"
        );

        return users[userAddress].role;
    }

    function isRegistered(
        address userAddress
    ) external view returns (bool) {
        return users[userAddress].registered;
    }

    function isSuspended(
        address userAddress
    ) external view returns (bool) {
        return users[userAddress].suspended;
    }

    function hasRole(
        address userAddress,
        Role requiredRole
    ) external view returns (bool) {
        return (
            users[userAddress].registered &&
            !users[userAddress].suspended &&
            users[userAddress].role == requiredRole
        );
    }
}
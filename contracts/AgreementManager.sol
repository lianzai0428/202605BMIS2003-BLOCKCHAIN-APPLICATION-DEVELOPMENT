// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserRegistry.sol";

contract AgreementManager {
    enum AgreementStatus {
        Draft,
        Posted,
        Active,
        PendingApproval,
        Completed,
        Cancelled,
        Expired
    }

    // Groups the editable agreement information into one input.
    struct AgreementDetails {
        string product;
        uint256 quantity;
        string unitOfMeasurement;
        string origin;
        string destination;
        uint256 escrowAmount;
        uint256 deadline;
        uint256 templateId;
        uint256 minimumStake;
    }

    struct Agreement {
        uint256 id;
        address shipper;
        address carrier;
        string product;
        uint256 quantity;
        string unitOfMeasurement;
        string origin;
        string destination;
        uint256 escrowAmount;
        uint256 deadline;
        uint256 templateId;
        uint256 minimumStake;
        AgreementStatus status;
    }

    UserRegistry public userRegistry;

    uint256 public nextAgreementId = 1;

    mapping(uint256 => Agreement) private agreements;
    mapping(address => uint256[]) private shipperAgreementIds;

    event AgreementCreated(
        uint256 indexed agreementId,
        address indexed shipper,
        uint256 escrowAmount,
        uint256 deadline
    );

    event DraftAgreementUpdated(
        uint256 indexed agreementId,
        address indexed shipper
    );

    constructor(address userRegistryAddress) {
        require(
            userRegistryAddress != address(0),
            "Invalid UserRegistry address"
        );

        userRegistry = UserRegistry(userRegistryAddress);
    }

    modifier onlyActiveShipper() {
        require(
            userRegistry.hasRole(
                msg.sender,
                UserRegistry.Role.Shipper
            ),
            "Only an active Shipper can perform this action"
        );
        _;
    }

    modifier agreementExists(uint256 agreementId) {
        require(
            agreements[agreementId].shipper != address(0),
            "Agreement does not exist"
        );
        _;
    }

    modifier onlyAgreementShipper(uint256 agreementId) {
        require(
            agreements[agreementId].shipper == msg.sender,
            "Only the agreement Shipper can perform this action"
        );
        _;
    }

    function createAgreement(
        AgreementDetails calldata details
    ) external onlyActiveShipper returns (uint256) {
        _validateAgreementDetails(details);

        uint256 agreementId = nextAgreementId;
        nextAgreementId++;

        Agreement storage agreement = agreements[agreementId];

        agreement.id = agreementId;
        agreement.shipper = msg.sender;
        agreement.carrier = address(0);
        agreement.product = details.product;
        agreement.quantity = details.quantity;
        agreement.unitOfMeasurement = details.unitOfMeasurement;
        agreement.origin = details.origin;
        agreement.destination = details.destination;
        agreement.escrowAmount = details.escrowAmount;
        agreement.deadline = details.deadline;
        agreement.templateId = details.templateId;
        agreement.minimumStake = details.minimumStake;
        agreement.status = AgreementStatus.Draft;

        shipperAgreementIds[msg.sender].push(agreementId);

        emit AgreementCreated(
            agreementId,
            msg.sender,
            details.escrowAmount,
            details.deadline
        );

        return agreementId;
    }

    function updateDraftAgreement(
        uint256 agreementId,
        AgreementDetails calldata details
    )
        external
        agreementExists(agreementId)
        onlyAgreementShipper(agreementId)
    {
        Agreement storage agreement = agreements[agreementId];

        require(
            agreement.status == AgreementStatus.Draft,
            "Only Draft agreements can be updated"
        );

        _validateAgreementDetails(details);

        agreement.product = details.product;
        agreement.quantity = details.quantity;
        agreement.unitOfMeasurement = details.unitOfMeasurement;
        agreement.origin = details.origin;
        agreement.destination = details.destination;
        agreement.escrowAmount = details.escrowAmount;
        agreement.deadline = details.deadline;
        agreement.templateId = details.templateId;
        agreement.minimumStake = details.minimumStake;

        emit DraftAgreementUpdated(
            agreementId,
            msg.sender
        );
    }

    function getAgreement(
        uint256 agreementId
    )
        external
        view
        agreementExists(agreementId)
        returns (Agreement memory)
    {
        return agreements[agreementId];
    }

    function getShipperAgreementIds(
        address shipper
    ) external view returns (uint256[] memory) {
        return shipperAgreementIds[shipper];
    }

    function _validateAgreementDetails(
        AgreementDetails calldata details
    ) internal view {
        require(
            bytes(details.product).length > 0,
            "Product cannot be empty"
        );

        require(
            details.quantity > 0,
            "Quantity must be greater than zero"
        );

        require(
            bytes(details.unitOfMeasurement).length > 0,
            "Unit of measurement cannot be empty"
        );

        require(
            bytes(details.origin).length > 0,
            "Origin cannot be empty"
        );

        require(
            bytes(details.destination).length > 0,
            "Destination cannot be empty"
        );

        require(
            details.escrowAmount > 0,
            "Escrow amount must be greater than zero"
        );

        require(
            details.deadline > block.timestamp,
            "Deadline must be in the future"
        );

        require(
            details.templateId > 0,
            "Invalid template"
        );
    }
}
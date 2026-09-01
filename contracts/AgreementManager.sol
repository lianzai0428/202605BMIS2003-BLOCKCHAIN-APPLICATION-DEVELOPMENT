// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserRegistry.sol";

interface IEscrowManager {
    function isFullyFunded(
        uint256 agreementId
    ) external view returns (bool);
}

interface IStakeManager {
    function hasRequiredStake(
        address carrier,
        uint256 requiredAmount
    ) external view returns (bool);
}

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

    address public owner;

    IEscrowManager public escrowManager;
    IStakeManager public stakeManager;

    uint256 public nextAgreementId = 1;

    mapping(uint256 => Agreement) private agreements;
    mapping(address => uint256[]) private shipperAgreementIds;
    mapping(address => uint256[]) private carrierAgreementIds;

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

    event EscrowManagerUpdated(
        address indexed escrowManagerAddress
    );

    event StakeManagerUpdated(
        address indexed stakeManagerAddress
    );

    event AgreementPosted(
        uint256 indexed agreementId,
        address indexed shipper
    );

    event AgreementAccepted(
        uint256 indexed agreementId,
        address indexed carrier
    );

    constructor(address userRegistryAddress) {
        require(
            userRegistryAddress != address(0),
            "Invalid UserRegistry address"
        );

        require(
            userRegistryAddress.code.length > 0,
            "UserRegistry address has no contract"
        );

        userRegistry = UserRegistry(userRegistryAddress);
        owner = msg.sender;
    }

    modifier onlyActiveShipper() {
        require(
            userRegistry.isRegistered(msg.sender),
            "Caller is not registered"
        );

        require(
            !userRegistry.isSuspended(msg.sender),
            "Caller is suspended"
        );

        require(
            userRegistry.getRole(msg.sender) ==
                UserRegistry.Role.Shipper,
            "Caller is not a Shipper"
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

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only contract owner can perform this action"
        );
        _;
    }

    function setEscrowManager(
        address escrowManagerAddress
    ) external onlyOwner {
        require(
            escrowManagerAddress != address(0),
            "Invalid EscrowManager address"
        );

        escrowManager = IEscrowManager(
            escrowManagerAddress
        );

        emit EscrowManagerUpdated(
            escrowManagerAddress
        );
    }

    function setStakeManager(
        address stakeManagerAddress
    ) external onlyOwner {
        require(
            stakeManagerAddress != address(0),
            "Invalid StakeManager address"
        );

        stakeManager = IStakeManager(
            stakeManagerAddress
        );

        emit StakeManagerUpdated(
            stakeManagerAddress
        );
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

    function postAgreement(
        uint256 agreementId
    )
        external
        agreementExists(agreementId)
        onlyAgreementShipper(agreementId)
    {
        Agreement storage agreement =
            agreements[agreementId];

        require(
            agreement.status == AgreementStatus.Draft,
            "Only Draft agreements can be posted"
        );

        require(
            address(escrowManager) != address(0),
            "EscrowManager is not configured"
        );

        require(
            escrowManager.isFullyFunded(agreementId),
            "Agreement escrow is not fully funded"
        );

        agreement.status = AgreementStatus.Posted;

        emit AgreementPosted(
            agreementId,
            msg.sender
        );
    }

    function acceptAgreement(
        uint256 agreementId
    )
        external
        agreementExists(agreementId)
    {
        Agreement storage agreement =
            agreements[agreementId];

        require(
            userRegistry.hasRole(
                msg.sender,
                UserRegistry.Role.Carrier
            ),
            "Only an active Carrier can accept agreements"
        );

        require(
            agreement.status == AgreementStatus.Posted,
            "Agreement is not available for acceptance"
        );

        require(
            agreement.carrier == address(0),
            "Agreement already has a Carrier"
        );

        require(
            block.timestamp < agreement.deadline,
            "Agreement deadline has passed"
        );

        if (agreement.minimumStake > 0) {
            require(
                address(stakeManager) != address(0),
                "StakeManager is not configured"
            );

            require(
                stakeManager.hasRequiredStake(
                    msg.sender,
                    agreement.minimumStake
                ),
                "Carrier does not satisfy minimum stake"
            );
        }

        agreement.carrier = msg.sender;
        agreement.status = AgreementStatus.Active;

        carrierAgreementIds[msg.sender].push(
            agreementId
        );

        emit AgreementAccepted(
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

    function getCarrierAgreementIds(
        address carrier
    ) external view returns (uint256[] memory) {
        return carrierAgreementIds[carrier];
    }

    function getOpenAgreementIds()
        external
        view
        returns (uint256[] memory)
    {
        uint256 openCount = 0;

        for (
            uint256 i = 1;
            i < nextAgreementId;
            i++
        ) {
            if (
                agreements[i].status ==
                AgreementStatus.Posted
            ) {
                openCount++;
            }
        }

        uint256[] memory openIds =
            new uint256[](openCount);

        uint256 currentIndex = 0;

        for (
            uint256 i = 1;
            i < nextAgreementId;
            i++
        ) {
            if (
                agreements[i].status ==
                AgreementStatus.Posted
            ) {
                openIds[currentIndex] = i;
                currentIndex++;
            }
        }

        return openIds;
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
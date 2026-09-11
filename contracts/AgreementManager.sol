// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserRegistry.sol";

interface IEscrowManager {
    function isFullyFunded(
        uint256 agreementId
    ) external view returns (bool);

    function getFundedAmount(
        uint256 agreementId
    ) external view returns (uint256);

    function getEscrowBalance(
        uint256 agreementId
    ) external view returns (uint256);

    function getReleasedAmount(
        uint256 agreementId
    ) external view returns (uint256);

    function refundDraftEscrow(
        uint256 agreementId
    ) external;

    function refundRemaining(
        uint256 agreementId
    ) external;
}

interface IAGRIToken {
    function getStake(
        uint256 agreementId,
        address carrier
    ) external view returns (uint256);

    function releaseStake(
        uint256 agreementId,
        address carrier
    ) external;

    function rewardCarrier(
        uint256 agreementId,
        address carrier,
        uint256 amount
    ) external;

    function burnStake(
        uint256 agreementId,
        address carrier,
        uint256 amount
    ) external;
}

interface IMilestoneManager {
    function getMilestoneCount(
        uint256 agreementId
    ) external view returns (uint256);

    function startMilestones(
        uint256 agreementId
    ) external;

    function isCarrierDeadlineFailure(
        uint256 agreementId
    ) external view returns (bool);
    function getRemainingMilestonePercentage(
        uint256 agreementId
    ) external view returns (uint256);
}

contract AgreementManager {
    enum AgreementStatus {
        Draft,
        Posted,
        Active,
        PendingApproval,
        Completed,
        Cancelled,
        Expired,
        Failed
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

    struct AgreementTemplate {
        uint256 id;
        address creator;
        string name;
        string product;
        string unitOfMeasurement;
        string origin;
        string destination;
        uint256 minimumStake;
        bool active;
    }

    uint256 public nextTemplateId = 1;

    mapping(uint256 => AgreementTemplate) private agreementTemplates;

    UserRegistry public userRegistry;
    IEscrowManager public escrowManager;
    IAGRIToken public agriToken;
    address public owner;
    address public milestoneManagerAddress;

    uint256 public nextAgreementId = 1;

    uint256 public defaultCompletionReward;
    mapping(uint256 => uint256) private agreementCompletionReward;

    mapping(uint256 => Agreement) private agreements;
    mapping(address => uint256[]) private shipperAgreementIds;
    mapping(address => uint256[]) private carrierAgreementIds;

    event AgreementTemplateCreated(
        uint256 indexed templateId,
        address indexed creator,
        string name
    );

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

    event AGRITokenUpdated(
        address indexed agriTokenAddress
    );

    event MilestoneManagerUpdated(
        address indexed milestoneManagerAddress
    );

    event AgreementPosted(
        uint256 indexed agreementId,
        address indexed shipper
    );

    event AgreementCancelled(
        uint256 indexed agreementId,
        address indexed shipper,
        uint256 timestamp
    );

    event AgreementExpired(
        uint256 indexed agreementId,
        uint256 timestamp
    );

    event AgreementAccepted(
        uint256 indexed agreementId,
        address indexed carrier
    );

    event AgreementPendingApproval(
        uint256 indexed agreementId,
        uint256 timestamp
    );

    event AgreementReturnedActive(
        uint256 indexed agreementId,
        uint256 timestamp
    );

    event AgreementCompleted(
        uint256 indexed agreementId,
        uint256 timestamp
    );

    event AgreementFailed(
        uint256 indexed agreementId,
        address indexed carrier,
        uint256 stakeBurned,
        uint256 timestamp
    );

    event UnusedStakeWithdrawn(
        uint256 indexed agreementId,
        address indexed carrier,
        uint256 amount,
        uint256 timestamp
    );

    event DefaultCompletionRewardUpdated(
        uint256 amount
    );

    event AgreementCompletionRewardSet(
        uint256 indexed agreementId,
        uint256 amount
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

    modifier onlyMilestoneManager() {
        require(
            msg.sender == milestoneManagerAddress,
            "Only MilestoneManager"
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

        require(
            escrowManagerAddress.code.length > 0,
            "EscrowManager address has no contract"
        );

        escrowManager = IEscrowManager(
            escrowManagerAddress
        );

        emit EscrowManagerUpdated(
            escrowManagerAddress
        );
    }

    function createTemplate(
        string calldata name,
        string calldata product,
        string calldata unitOfMeasurement,
        string calldata origin,
        string calldata destination,
        uint256 minimumStake
    )
        external
        onlyActiveShipper
        returns (uint256)
    {
        require(bytes(name).length > 0, "Template name cannot be empty");
        require(bytes(product).length > 0, "Product cannot be empty");
        require(bytes(unitOfMeasurement).length > 0, "Unit cannot be empty");
        require(bytes(origin).length > 0, "Origin cannot be empty");
        require(bytes(destination).length > 0, "Destination cannot be empty");

        uint256 templateId = nextTemplateId++;

        agreementTemplates[templateId] = AgreementTemplate({
            id: templateId,
            creator: msg.sender,
            name: name,
            product: product,
            unitOfMeasurement: unitOfMeasurement,
            origin: origin,
            destination: destination,
            minimumStake: minimumStake,
            active: true
        });

        emit AgreementTemplateCreated(
            templateId,
            msg.sender,
            name
        );

        return templateId;
    }

    function getAgreementTemplate(
        uint256 templateId
    )
        external
        view
        returns (AgreementTemplate memory)
    {
        require(
            agreementTemplates[templateId].active,
            "Template does not exist"
        );

        return agreementTemplates[templateId];
    }

    function setAGRIToken(
        address agriTokenAddress
    ) external onlyOwner {
        require(
            agriTokenAddress != address(0),
            "Invalid AGRIToken address"
        );

        require(
            agriTokenAddress.code.length > 0,
            "AGRIToken address has no contract"
        );

        agriToken = IAGRIToken(agriTokenAddress);

        emit AGRITokenUpdated(agriTokenAddress);
    }

    function setMilestoneManager(
        address milestoneManager
    ) external onlyOwner {
        require(
            milestoneManager != address(0),
            "Invalid MilestoneManager address"
        );

        require(
            milestoneManager.code.length > 0,
            "MilestoneManager address has no contract"
        );

        milestoneManagerAddress = milestoneManager;

        emit MilestoneManagerUpdated(milestoneManager);
    }

    function setDefaultCompletionReward(
        uint256 amount
    )
        external
        onlyOwner
    {
        require(
            amount > 0,
            "Reward must be greater than zero"
        );

        defaultCompletionReward = amount;

        emit DefaultCompletionRewardUpdated(amount);
    }

    function isActiveShipper(
        address shipper
    )
        external
        view
        returns (bool)
    {
        return userRegistry.hasRole(
            shipper,
            UserRegistry.Role.Shipper
        );
    }

    function isActiveCarrier(
        address carrier
    )
        external
        view
        returns (bool)
    {
        return userRegistry.hasRole(
            carrier,
            UserRegistry.Role.Carrier
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

        require(
            block.timestamp < agreement.deadline,
            "Agreement deadline has passed"
        );

        _validateAgreementDetails(details);
        // If the required escrow amount changes after
        // funding has started, refund the old escrow
        // and require the Shipper to fund again.
        if (
            details.escrowAmount !=
                agreement.escrowAmount &&
            address(escrowManager) != address(0)
        ) {
            uint256 funded =
                escrowManager.getFundedAmount(
                    agreementId
                );

            if (funded > 0) {
                escrowManager.refundDraftEscrow(
                    agreementId
                );
            }
        }
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
            milestoneManagerAddress != address(0),
            "MilestoneManager is not configured"
        );

        require(
            escrowManager.isFullyFunded(agreementId),
            "Agreement escrow is not fully funded"
        );

        require(
            block.timestamp < agreement.deadline,
            "Agreement deadline has passed"
        );

        require(
            IMilestoneManager(
                milestoneManagerAddress
            ).getMilestoneCount(agreementId) > 0,
            "Agreement requires at least one milestone"
        );
        require(
            address(agriToken) != address(0),
            "AGRIToken is not configured"
        );

        require(
            defaultCompletionReward > 0,
            "Completion reward is not configured"
        );
        require(
            userRegistry.hasRole(
                msg.sender,
                UserRegistry.Role.Shipper
            ),
            "Shipper is suspended or inactive"
        );

        agreementCompletionReward[agreementId] =
            defaultCompletionReward;

        emit AgreementCompletionRewardSet(
            agreementId,
            defaultCompletionReward
        );

        agreement.status = AgreementStatus.Posted;

        emit AgreementPosted(
            agreementId,
            msg.sender
        );
    }

    function getAgreementCompletionReward(
        uint256 agreementId
    )
        external
        view
        agreementExists(agreementId)
        returns (uint256)
    {
        return agreementCompletionReward[agreementId];
    }

    function withdrawUnusedStake(
        uint256 agreementId
    )
        external
        agreementExists(agreementId)
    {
        require(
            address(agriToken) != address(0),
            "AGRIToken is not configured"
        );

        Agreement storage agreement =
            agreements[agreementId];

        uint256 stake =
            agriToken.getStake(
                agreementId,
                msg.sender
            );

        require(
            stake > 0,
            "No stake to withdraw"
        );

        require(
            agreement.carrier != msg.sender,
            "Assigned Carrier stake is locked"
        );

        agriToken.releaseStake(
            agreementId,
            msg.sender
        );

        emit UnusedStakeWithdrawn(
            agreementId,
            msg.sender,
            stake,
            block.timestamp
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
                address(agriToken) != address(0),
                "AGRIToken is not configured"
            );

            require(
                agriToken.getStake(
                    agreementId,
                    msg.sender
                ) >= agreement.minimumStake,
                "Carrier does not satisfy minimum stake"
            );
        }

        agreement.carrier = msg.sender;
        agreement.status = AgreementStatus.Active;
        IMilestoneManager(
            milestoneManagerAddress
        ).startMilestones(agreementId);

        carrierAgreementIds[msg.sender].push(
            agreementId
        );

        emit AgreementAccepted(
            agreementId,
            msg.sender
        );
    }

    function cancelAgreement(
        uint256 agreementId
    )
        external
        agreementExists(agreementId)
        onlyAgreementShipper(agreementId)
    {
        Agreement storage agreement =
            agreements[agreementId];

        require(
            agreement.status == AgreementStatus.Draft ||
            agreement.status == AgreementStatus.Posted ||
            agreement.status == AgreementStatus.Active,
            "Agreement cannot be cancelled in current status"
        );

        require(
            block.timestamp < agreement.deadline,
            "Deadline passed; process expiry instead"
        );

        // Rule 13:
        // Active agreement can only be cancelled
        // before first milestone payment.
        if (agreement.status == AgreementStatus.Active) {
            require(
                address(escrowManager) != address(0),
                "EscrowManager is not configured"
            );

            require(
                escrowManager.getReleasedAmount(
                    agreementId
                ) == 0,
                "Cannot cancel after milestone payment"
            );
        }

        agreement.status =
            AgreementStatus.Cancelled;

        // Refund any remaining ETH.
        if (
            address(escrowManager) != address(0) &&
            escrowManager.getEscrowBalance(
                agreementId
            ) > 0
        ) {
            escrowManager.refundRemaining(
                agreementId
            );
        }

        // If a Carrier already accepted,
        // Shipper cancellation should return its AGRI stake.
        if (
            agreement.carrier != address(0) &&
            address(agriToken) != address(0)
        ) {
            uint256 stake =
                agriToken.getStake(
                    agreementId,
                    agreement.carrier
                );

            if (stake > 0) {
                agriToken.releaseStake(
                    agreementId,
                    agreement.carrier
                );
            }
        }

        emit AgreementCancelled(
            agreementId,
            msg.sender,
            block.timestamp
        );
    }

    function markPendingApproval(
        uint256 agreementId
    )
        external
        agreementExists(agreementId)
        onlyMilestoneManager
    {
        Agreement storage agreement =
            agreements[agreementId];

        require(
            agreement.status == AgreementStatus.Active,
            "Agreement must be Active"
        );

        agreement.status =
            AgreementStatus.PendingApproval;

        emit AgreementPendingApproval(
            agreementId,
            block.timestamp
        );
    }

    function processExpiredAgreement(
        uint256 agreementId
    )
        external
        agreementExists(agreementId)
    {
        Agreement storage agreement =
            agreements[agreementId];
        require(
            agreement.status == AgreementStatus.Draft ||
            agreement.status == AgreementStatus.Posted ||
            agreement.status == AgreementStatus.Active,
            "Agreement cannot expire in current status"
        );
        require(
            block.timestamp >= agreement.deadline,
            "Agreement deadline has not passed"
        );
        bool carrierFailure = false;

        if (
            agreement.status == AgreementStatus.Active &&
            agreement.carrier != address(0)
        ) {
            carrierFailure =
                IMilestoneManager(
                    milestoneManagerAddress
                ).isCarrierDeadlineFailure(
                    agreementId
                );
        }

        // Determine Failed vs Expired
        if (carrierFailure) {
            agreement.status = AgreementStatus.Failed;
        } else {
            agreement.status = AgreementStatus.Expired;
        }

        // Refund remaining ETH
        if (
            address(escrowManager) != address(0) &&
            escrowManager.getEscrowBalance(agreementId) > 0
        ) {
            escrowManager.refundRemaining(agreementId);
        }

        // Burn proportional stake on Carrier failure,
        // otherwise return the full stake.
        uint256 stakeBurned = 0;

        if (
            agreement.carrier != address(0) &&
            address(agriToken) != address(0)
        ) {
            uint256 stake = agriToken.getStake(
                agreementId,
                agreement.carrier
            );

            if (stake > 0) {
                if (carrierFailure) {
                    // Proven Carrier fault = full slashing
                    stakeBurned = stake;

                    agriToken.burnStake(
                        agreementId,
                        agreement.carrier,
                        stake
                    );
                } else {
                    // Non-fault incomplete agreement:
                    // slash according to unfinished milestones
                    uint256 remainingPercentage =
                        IMilestoneManager(
                            milestoneManagerAddress
                        ).getRemainingMilestonePercentage(
                            agreementId
                        );

                    stakeBurned =
                        (stake * remainingPercentage) / 100;

                    if (stakeBurned > 0) {
                        agriToken.burnStake(
                            agreementId,
                            agreement.carrier,
                            stakeBurned
                        );
                    }

                    uint256 remainingStake =
                        agriToken.getStake(
                            agreementId,
                            agreement.carrier
                        );

                    if (remainingStake > 0) {
                        agriToken.releaseStake(
                            agreementId,
                            agreement.carrier
                        );
                    }
                }
            }

        // Event
        if (carrierFailure) {
            emit AgreementFailed(
                agreementId,
                agreement.carrier,
                stakeBurned,
                block.timestamp
            );
        } else {
            emit AgreementExpired(
                agreementId,
                block.timestamp
            );
        }
    }

    function markActive(
        uint256 agreementId
    )
        external
        agreementExists(agreementId)
        onlyMilestoneManager
    {
        Agreement storage agreement =
            agreements[agreementId];

        require(
            agreement.status ==
                AgreementStatus.PendingApproval,
            "Agreement must be PendingApproval"
        );

        agreement.status =
            AgreementStatus.Active;

        emit AgreementReturnedActive(
            agreementId,
            block.timestamp
        );
    }

    function markCompleted(
        uint256 agreementId
    )
        external
        agreementExists(agreementId)
        onlyMilestoneManager
    {
        Agreement storage agreement =
            agreements[agreementId];

        require(
            agreement.status ==
                AgreementStatus.PendingApproval,
            "Agreement must be PendingApproval"
        );

        require(
            address(escrowManager) != address(0),
            "EscrowManager is not configured"
        );

        require(
            escrowManager.getEscrowBalance(
                agreementId
            ) == 0,
            "Escrow balance must be zero"
        );

        require(
            address(agriToken) != address(0),
            "AGRIToken is not configured"
        );

        require(
            agreement.carrier != address(0),
            "Agreement has no Carrier"
        );

        uint256 reward =
            agreementCompletionReward[agreementId];

        require(
            reward > 0,
            "Completion reward is not configured"
        );

        agreement.status =
            AgreementStatus.Completed;

        // Return any AGRI stake locked by the winning Carrier.
        uint256 stake =
            agriToken.getStake(
                agreementId,
                agreement.carrier
            );

        if (stake > 0) {
            agriToken.releaseStake(
                agreementId,
                agreement.carrier
            );
        }

        // Reward successful Carrier.
        agriToken.rewardCarrier(
            agreementId,
            agreement.carrier,
            reward
        );

        emit AgreementCompleted(
            agreementId,
            block.timestamp
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
                AgreementStatus.Posted &&
                block.timestamp < agreements[i].deadline
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
                AgreementStatus.Posted &&
                block.timestamp < agreements[i].deadline
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
        if (details.templateId > 0) {
            require(
                agreementTemplates[details.templateId].active,
                "Invalid template"
            );
        }
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

    }

    function carrierAbandonAgreement(
        uint256 agreementId
    )
        external
        agreementExists(agreementId)
    {
        Agreement storage agreement =
            agreements[agreementId];

        require(
            agreement.status == AgreementStatus.Active,
            "Agreement must be Active"
        );

        require(
            msg.sender == agreement.carrier,
            "Only assigned Carrier"
        );

        agreement.status = AgreementStatus.Failed;

        // Refund unreleased ETH.
        if (
            address(escrowManager) != address(0) &&
            escrowManager.getEscrowBalance(agreementId) > 0
        ) {
            escrowManager.refundRemaining(agreementId);
        }

        // Explicit Carrier abandonment = full stake slashing.
        uint256 stakeBurned = 0;

        if (address(agriToken) != address(0)) {
            uint256 stake = agriToken.getStake(
                agreementId,
                agreement.carrier
            );

            if (stake > 0) {
                stakeBurned = stake;

                agriToken.burnStake(
                    agreementId,
                    agreement.carrier,
                    stake
                );
            }
        }

        emit AgreementFailed(
            agreementId,
            agreement.carrier,
            stakeBurned,
            block.timestamp
        );
    }


    function isEligibleMilestoneApprover(
        address approver
    )
        external
        view
        returns (bool)
    {
        return (
            userRegistry.hasRole(
                approver,
                UserRegistry.Role.Warehouse
            )
            ||
            userRegistry.hasRole(
                approver,
                UserRegistry.Role.Customs
            )
        );
    }


    function canStakeOnAgreement(
        uint256 agreementId,
        address carrier
    )
        external
        view
        returns (bool)
    {
        Agreement storage agreement =
            agreements[agreementId];

        return (
            agreement.shipper != address(0) &&
            agreement.status == AgreementStatus.Posted &&
            userRegistry.hasRole(
                carrier,
                UserRegistry.Role.Carrier
            )
        );
    }
}
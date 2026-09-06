// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAgreementManager {
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

    function getAgreement(
        uint256 agreementId
    ) external view returns (Agreement memory);

    function markPendingApproval(
        uint256 agreementId
    ) external;

    function markActive(
        uint256 agreementId
    ) external;

    function markCompleted(
        uint256 agreementId
    ) external;

    function isEligibleMilestoneApprover(
        address approver
    ) external view returns (bool);

    function isActiveShipper(
        address shipper
    ) external view returns (bool);

    function isActiveCarrier(
        address carrier
    ) external view returns (bool);
}

interface IEscrowManager {
    function releasePayment(uint256 agreementId, address payable carrier, uint256 amount) external;
    function getEscrowBalance(uint256 agreementId) external view returns (uint256);
}

// ==========================
// MAIN CONTRACT
// ==========================

contract MilestoneManager {

    // -----------------
    // Enum and Structs
    // -----------------

    enum MilestoneStatus { Pending, Submitted, Approved, Rejected }

    struct Milestone {
        string description;
        string proofRequirement;
        uint256 paymentPercentage;
        address approver;
        MilestoneStatus status;
    }

    struct MilestoneProof {
        string cid;
        uint256 submittedAt;
    }

    // ----------------
    // State Variables
    // ----------------

    // agreementId => array of milestones (index = milestoneId)
    mapping(uint256 => Milestone[]) private milestones;

    // agreementId => array of proofs (parallel to milestones array)
    mapping(uint256 => MilestoneProof[]) private proofs;

    // tracks which milestone index is currently active (must do sequentially)
    mapping(uint256 => uint256) private currentMilestoneIndex;

    mapping(uint256 => uint256) private currentMilestoneStartedAt;  //remember when the current milestone became available

    address public agreementManagerAddress;
    address public escrowManagerAddress;
    address public owner;

    // -------
    // Events
    // -------

    event MilestonesCreated(
        uint256 indexed agreementId,
        uint256 count,
        uint256 timestamp
    );

    event ProofSubmitted(
        uint256 indexed agreementId,
        uint256 indexed milestoneId,
        string cid,
        uint256 timestamp
    );

    event MilestoneApproved (
        uint256 indexed agreementId,
        uint256 indexed milestoneId,
        address approver,
        uint256 paymentReleased,
        uint256 timestamp
    );

    event MilestoneRejected(
        uint256 indexed agreementId,
        uint256 indexed milestoneId,
        address approver,
        uint256 timestamp
    );



    // ------------
    // Constructor
    // ------------

    constructor() {
        owner = msg.sender;
    }

    // Fix
    function setAgreementManager(
        address _addr
    ) external {
        require(msg.sender == owner, "Only owner");
        require(_addr != address(0), "Invalid address");
        require(
            _addr.code.length > 0,
            "AgreementManager address has no contract"
        );

        agreementManagerAddress = _addr;
    }

    function setEscrowManager(address _addr) external {
        require(msg.sender == owner, "Only owner");
        require(_addr != address(0), "Invalid address");
        require(
            _addr.code.length > 0,
            "EscrowManager address has no contract"
        );
        escrowManagerAddress = _addr;
    }

    // ----------
    // Modifiers
    // ----------

    modifier onlyActiveAgreement(uint256 agreementId) {
        IAgreementManager.Agreement memory agreement =
            IAgreementManager(agreementManagerAddress)
                .getAgreement(agreementId);

        require(
            agreement.status ==
                IAgreementManager.AgreementStatus.Active ||
            agreement.status ==
                IAgreementManager.AgreementStatus.PendingApproval,
            "Agreement not active"
        );

        _;
    }

    modifier onlyCarrier(uint256 agreementId) {
        IAgreementManager am =
            IAgreementManager(agreementManagerAddress);

        IAgreementManager.Agreement memory agreement =
            am.getAgreement(agreementId);

        require(
            msg.sender == agreement.carrier,
            "Only assigned carrier"
        );

        require(
            am.isActiveCarrier(msg.sender),
            "Carrier is suspended or inactive"
        );

        _;
    }

    modifier beforeDeadline(uint256 agreementId) {
        IAgreementManager.Agreement memory agreement =
            IAgreementManager(agreementManagerAddress)
                .getAgreement(agreementId);

        require(
            block.timestamp < agreement.deadline,
            "Agreement deadline passed"
        );

        _;
    }

    // ---------------
    // Core Functions
    // ---------------

    function startMilestones(
        uint256 agreementId
    ) external {
        require(
            msg.sender == agreementManagerAddress,
            "Only AgreementManager"
        );

        require(
            milestones[agreementId].length > 0,
            "No milestones created"
        );

        currentMilestoneStartedAt[agreementId] =
            block.timestamp;
    }

    // Carrier accept an agreement
    function createMilestone(
        uint256 agreementId,
        string[] calldata descriptions,
        string[] calldata proofRequirements,
        uint256[] calldata paymentPercentages,
        address[] calldata approvers
    ) external {
        IAgreementManager am =
            IAgreementManager(agreementManagerAddress);

        IAgreementManager.Agreement memory agreement =
            am.getAgreement(agreementId);

        require(
            agreement.status ==
                IAgreementManager.AgreementStatus.Draft,
            "Milestones can only be created for Draft agreements"
        );
        require(
            block.timestamp < agreement.deadline,
            "Agreement deadline has passed"
        );

        // only AgreementManager or shipper can call this
        require(
            msg.sender == agreement.shipper ||
            msg.sender == agreementManagerAddress,
            "Only agreement Shipper or AgreementManager"
        );
        if (msg.sender == agreement.shipper) {
            require(
                am.isActiveShipper(msg.sender),
                "Shipper is suspended or inactive"
            );
        }
        require(milestones[agreementId].length == 0, "Milestones already created");
        require(descriptions.length > 0, "Must have at least one milestone");
        require(
            descriptions.length == proofRequirements.length &&
            descriptions.length == paymentPercentages.length &&
            descriptions.length == approvers.length,
            "Array length mismatch"
        );

        // Validate percentages sum to 100
        uint256 total = 0;
        for (uint256 i = 0; i < paymentPercentages.length; i++) {
            require(
                paymentPercentages[i] > 0,
                "Payment percentage must be greater than zero"
            );
            total += paymentPercentages[i];
        }
        require(total == 100, "Payment percentages must sum to 100");

        // Store milestones
        for (uint256 i = 0; i < descriptions.length; i++) {
            require(
                bytes(descriptions[i]).length > 0,
                "Milestone description cannot be empty"
            );

            require(
                bytes(proofRequirements[i]).length > 0,
                "Proof requirement cannot be empty"
            );
            require(approvers[i] != address(0), "Approver cannot be zero address");
            require(
                am.isEligibleMilestoneApprover(
                    approvers[i]
                ),
                "Approver must be active Warehouse or Customs"
            );
            milestones[agreementId].push(Milestone({
                description: descriptions[i],
                proofRequirement: proofRequirements[i],
                paymentPercentage: paymentPercentages[i],
                approver: approvers[i],
                status: MilestoneStatus.Pending
            }));
            // Push empty proof placeholder
            proofs[agreementId].push(MilestoneProof({ cid: "", submittedAt: 0 }));
        }

        currentMilestoneIndex[agreementId] = 0;

        emit MilestonesCreated(agreementId, descriptions.length, block.timestamp);
    }

    // Carrier upload IPFS CID as proof for the current milestone
    function submitProof(
        uint256 agreementId,
        uint256 milestoneId,
        string calldata cid
    )
        external
        onlyActiveAgreement(agreementId)
        onlyCarrier(agreementId)
        beforeDeadline(agreementId)
    {
        require(milestones[agreementId].length > 0, "No milestones created");
        require(milestoneId < milestones[agreementId].length, "Invalid milestone ID");
        require(milestoneId == currentMilestoneIndex[agreementId], "Must complete milestones sequentially");
        require(bytes(cid).length > 0, "CID cannot be empty");

        Milestone storage m = milestones[agreementId][milestoneId];
        require(m.status == MilestoneStatus.Pending || m.status == MilestoneStatus.Rejected, "Already submitted or approved");

        m.status = MilestoneStatus.Submitted;
        proofs[agreementId][milestoneId] = MilestoneProof({
            cid: cid,
            submittedAt: block.timestamp
        });

        IAgreementManager(
            agreementManagerAddress
        ).markPendingApproval(agreementId);

        emit ProofSubmitted(agreementId, milestoneId, cid, block.timestamp);
    }

    // Desinated approver review and approve the milestone
    function approveMilestone(uint256 agreementId, uint256 milestoneId) external {
        require(milestones[agreementId].length > 0, "No milestones created");
        require(milestoneId < milestones[agreementId].length, "Invalid milestone ID");

        IAgreementManager am = IAgreementManager(agreementManagerAddress);

        Milestone storage m = milestones[agreementId][milestoneId];
        require(msg.sender == m.approver, "Only designated approver");
        require(
            am.isEligibleMilestoneApprover(msg.sender),
            "Approver is not active or eligible"
        );
        require(m.status == MilestoneStatus.Submitted, "No proof submitted yet");

        m.status = MilestoneStatus.Approved;

        // Calculate payment amount based on percentage of total escrow
        // ExcrowManager store total, here calc the portion
        IEscrowManager escrow = IEscrowManager(escrowManagerAddress);
        uint256 totalBalance = escrow.getEscrowBalance(agreementId);

        uint256 paymentAmount = (totalBalance * m.paymentPercentage) / _getRemainingPercentage(agreementId, milestoneId);


        IAgreementManager.Agreement memory agreement =
            am.getAgreement(agreementId);

        address payable carrier =
            payable(agreement.carrier);

        escrow.releasePayment(agreementId, carrier, paymentAmount);

        emit MilestoneApproved(agreementId, milestoneId, msg.sender, paymentAmount, block.timestamp);

        // Advance to next milestone
        uint256 nextIndex = milestoneId + 1;
        currentMilestoneIndex[agreementId] = nextIndex;

        // Check if all milestones completed
        if (nextIndex == milestones[agreementId].length) {
            am.markCompleted(agreementId);

        } else {
            currentMilestoneStartedAt[agreementId] = block.timestamp;

            // More milestones remain
            am.markActive(agreementId);
        }
    }

    function isCarrierDeadlineFailure(
        uint256 agreementId
    )
        external
        view
        returns (bool)
    {
        uint256 index =
            currentMilestoneIndex[agreementId];

        if (index >= milestones[agreementId].length) {
            return false;
        }

        MilestoneStatus status =
            milestones[agreementId][index].status;

        IAgreementManager.Agreement memory agreement =
            IAgreementManager(
                agreementManagerAddress
            ).getAgreement(agreementId);

        return (
            currentMilestoneStartedAt[agreementId] > 0 &&
            currentMilestoneStartedAt[agreementId]
                < agreement.deadline &&
            (
                status == MilestoneStatus.Pending ||
                status == MilestoneStatus.Rejected
            )
        );
    }

    // Designated approver reject the milestone
    // Carrier may resubmit
    function rejectMilestone(uint256 agreementId, uint256 milestoneId) external {
        require(milestones[agreementId].length > 0, "No milestones created");
        require(milestoneId < milestones[agreementId].length, "Invalid milestone ID");
        IAgreementManager am =
            IAgreementManager(agreementManagerAddress);
        Milestone storage m = milestones[agreementId][milestoneId];
        require(msg.sender == m.approver, "Only designated approver");
        require(
            am.isEligibleMilestoneApprover(msg.sender),
            "Approver is not active or eligible"
        );
        require(m.status == MilestoneStatus.Submitted, "No proof submitted");

        m.status = MilestoneStatus.Rejected;
        am.markActive(agreementId);

        // Latest CID remains in milestone storage.
        // previous submission is traceable through events.

        emit MilestoneRejected(agreementId, milestoneId, msg.sender, block.timestamp);
    }

    // ---------------
    // View Functions
    // ---------------

    // Return full milestone data for a given agreement and milestone index
    function getMilestone(uint256 agreementId, uint256 milestoneId)
    	external
    	view
    	returns (
            string memory description,
            string memory proofRequirement,
            uint256 paymentPercentage,
            address approver,
            MilestoneStatus status,
            string memory proofCid,
            uint256 proofSubmittedAt
        )
    {
        require(milestoneId < milestones[agreementId].length, "Invalid milestone ID");
        Milestone storage m = milestones[agreementId][milestoneId];
        MilestoneProof storage p = proofs[agreementId][milestoneId];
        return (
            m.description,
            m.proofRequirement,
            m.paymentPercentage,
            m.approver,
            m.status,
            p.cid,
            p.submittedAt
        );
    }

    // Return how many milestones an agreement has
    function getMilestoneCount(uint256 agreementId) external view returns (uint256) {
        return milestones[agreementId].length;
    }

    // Return the index of the current active milestone
    function getCurrentMilestoneIndex(uint256 agreementId) external view returns (uint256) {
        return currentMilestoneIndex[agreementId];
    }

    function _getRemainingPercentage(uint256 agreementId, uint256 fromMilestoneId)
        internal
        view
        returns (uint256)
    {
        uint256 remaining = 0;
        for (uint256 i = fromMilestoneId; i < milestones[agreementId].length; i++) {
            remaining += milestones[agreementId][i].paymentPercentage;
        }
        return remaining;
    }
}
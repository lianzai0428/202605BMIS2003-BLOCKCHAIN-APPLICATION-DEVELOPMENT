// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAgreementManager {
    enum AgreementStatus { Draft, Posted, Active, PendingApproval, Completed, Cancelled, Expired }

    function getCarrier(uint256 agreementId) external view returns (address);
    function getShipper(uint256 agreementId) external view returns (address);
    function getDeadline(uint256 agreementId) external view returns (uint256);
    function getStatus(uint256 agreementId) external view returns (AgreementStatus);
    function markCompleted(uint256 agreementId) external;
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

    event AgreementCompleted(
        uint256 indexed agreementId,
        uint256 timestamp
    );

    // ------------
    // Constructor
    // ------------

    constructor() {
        owner = msg.sender;
    }

    // Fix 
    function setAgreementManager(address _addr) external {
        require(msg.sender == owner, "Only owner");
        agreementManagerAddress = _addr;
    }

    function setEscrowManager(address _addr) external {
        require(msg.sender == owner, "Only owner");
        escrowManagerAddress = _addr;
    }

    // ----------
    // Modifiers
    // ----------

    modifier onlyActiveAgreement(uint256 agreementId) {
        IAgreementManager am = IAgreementManager(agreementManagerAddress);
        require(
            am.getStatus(agreementId) == IAgreementManager.AgreementStatus.Active ||
            am.getStatus(agreementId) == IAgreementManager.AgreementStatus.PendingApproval,
            "Agreement not active"
        );
        _;
    }

    modifier onlyCarrier(uint256 agreementId) {
        IAgreementManager am = IAgreementManager(agreementManagerAddress);
        require(msg.sender == am.getCarrier(agreementId), "Only assigned carrier");
        _;
    }

    modifier beforeDeadline(uint256 agreementId) {
        IAgreementManager am = IAgreementManager(agreementManagerAddress);
        require(block.timestamp <= am.getDeadline(agreementId), "Agreement deadline passed");
        _;
    }

    // ---------------
    // Core Functions
    // ---------------

    // Carrier accept an agreement 
    function createMilestone(
        uint256 agreementId, 
        string[] calldata descriptions,
        string[] calldata proofRequirements,
        uint256[] calldata paymentPercentages,
        address[] calldata approvers
    ) external {
        // only AgreementManager or deployer can call this
        require(
            msg.sender == agreementManagerAddress || msg.sender == owner, "Not authorised to create milestones"
        );
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
            total += paymentPercentages[i];
        }
        require(total == 100, "Payment percentages must sum to 100");

        // Store milestones
        for (uint256 i = 0; i < descriptions.length; i++) {
            require(approvers[i] != address(0), "Approver cannot be zero address");
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

        emit ProofSubmitted(agreementId, milestoneId, cid, block.timestamp);
    }

    // Desinated approver review and approve the milestone
    function approveMilestone(uint256 agreementId, uint256 milestoneId) external {
        require(milestones[agreementId].length > 0, "No milestones created");
        require(milestoneId < milestones[agreementId].length, "Invalid milestone ID");

        Milestone storage m = milestones[agreementId][milestoneId];
        require(msg.sender == m.approver, "Only designated approver");
        require(m.status == MilestoneStatus.Submitted, "No proof submitted yet");

        m.status = MilestoneStatus.Approved;

        // Calculate payment amount based on percentage of total escrow
        // ExcrowManager store total, here calc the portion
        IEscrowManager escrow = IEscrowManager(escrowManagerAddress);
        uint256 totalBalance = escrow.getEscrowBalance(agreementId);

        uint256 paymentAmount = (totalBalance * m.paymentPercentage) / _getRemainingPercentage(agreementId, milestoneId);

        IAgreementManager am = IAgreementManager(agreementManagerAddress);
        address payable carrier = payable(am.getCarrier(agreementId));

        escrow.releasePayment(agreementId, carrier, paymentAmount);

        emit MilestoneApproved(agreementId, milestoneId, msg.sender, paymentAmount, block.timestamp);

        // Advance to next milestone
        uint256 nextIndex = milestoneId + 1;
        currentMilestoneIndex[agreementId] = nextIndex;

        // Check if all milestones completed
        if (nextIndex == milestones[agreementId].length) {
            am.markCompleted(agreementId);
            emit AgreementCompleted(agreementId, block.timestamp);
        }
    }

    // Designated approver reject the milestone
    // Carrier may resubmit
    function rejectMilestone(uint256 agreementId, uint256 milestoneId) external {
        require(milestones[agreementId].length > 0, "No milestones created");
        require(milestoneId < milestones[agreementId].length, "Invalid milestone ID");

        Milestone storage m = milestones[agreementId][milestoneId];
        require(msg.sender == m.approver, "Only designated approver");
        require(m.status == MilestoneStatus.Submitted, "No proof submitted");

        m.status = MilestoneStatus.Rejected;
        // CID is kept on-chain as permanent record even after rejection

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
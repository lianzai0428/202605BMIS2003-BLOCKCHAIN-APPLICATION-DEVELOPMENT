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
        Expired
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

    function getAgreement(uint256 agreementId) external view returns (Agreement memory);
}

// ==========================
// MAIN CONTRACT
// ==========================

contract EscrowManager {

    // -----------------
    // State Variables
    // -----------------

    address public owner;
    address public agreementManagerAddress;
    address public milestoneManagerAddress;

    mapping(uint256 => uint256) private escrowBalance;

    mapping(uint256 => uint256) private fundedAmount;

    // -------
    // Events
    // -------

    event EscrowFunded(
        uint256 indexed agreementId,
        uint256 amount,
        uint256 timestamp
    );

    event PaymentReleased(
        uint256 indexed agreementId,
        address indexed carrier,
        uint256 amount,
        uint256 timestamp
    );

    event EscrowRefunded(
        uint256 indexed agreementId,
        address indexed shipper,
        uint256 amount,
        uint256 timestamp
    );

    // ------------
    // Constructor
    // ------------

    constructor() {
        owner = msg.sender;
    }

    // ----------
    // Modifiers
    // ----------

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyMilestoneManager() {
        require(msg.sender == milestoneManagerAddress, "Only MilestoneManager");
        _;
    }

    // -------------------------------
    // Configuration (owner only)
    // -------------------------------

    function setAgreementManager(address _addr) external onlyOwner {
        require(_addr != address(0), "Invalid address");
        agreementManagerAddress = _addr;
    }

    function setMilestoneManager(address _addr) external onlyOwner {
        require(_addr != address(0), "Invalid address");
        milestoneManagerAddress = _addr;
    }

    // ---------------
    // Core Functions
    // ---------------

    // Shipper deposits funds toward an agreement's escrow. May be called
    // more than once (partial funding), but the cumulative amount can
    // never exceed the agreement's required escrowAmount.
    function fundEscrow(uint256 agreementId) external payable {
        require(agreementManagerAddress != address(0), "AgreementManager not configured");
        require(msg.value > 0, "Funding amount must be greater than zero");

        IAgreementManager.Agreement memory agreement =
            IAgreementManager(agreementManagerAddress).getAgreement(agreementId);

        require(msg.sender == agreement.shipper, "Only the agreement Shipper can fund escrow");
        require(
            agreement.status == IAgreementManager.AgreementStatus.Draft,
            "Agreement must be in Draft status to fund"
        );

        uint256 newFundedAmount = fundedAmount[agreementId] + msg.value;
        require(newFundedAmount <= agreement.escrowAmount, "Funding exceeds required escrow amount");

        fundedAmount[agreementId] = newFundedAmount;
        escrowBalance[agreementId] += msg.value;

        emit EscrowFunded(agreementId, msg.value, block.timestamp);
    }

    // Called by MilestoneManager once a milestone has been approved.
    // MilestoneManager calculates 'amount'; this contract only verifies
    // the release is legitimate and moves the funds.
    function releasePayment(
        uint256 agreementId,
        address payable carrier,
        uint256 amount
    ) external onlyMilestoneManager {
        require(agreementManagerAddress != address(0), "AgreementManager not configured");
        require(carrier != address(0), "Invalid carrier address");
        require(amount > 0, "Amount must be greater than zero");

        IAgreementManager.Agreement memory agreement =
            IAgreementManager(agreementManagerAddress).getAgreement(agreementId);

        require(
            agreement.status == IAgreementManager.AgreementStatus.Active ||
            agreement.status == IAgreementManager.AgreementStatus.PendingApproval,
            "Agreement is not active"
        );
        require(carrier == agreement.carrier, "Carrier does not match agreement");
        require(amount <= escrowBalance[agreementId], "Insufficient escrow balance");

        // Effects before interaction (checks-effects-interactions)
        escrowBalance[agreementId] -= amount;

        emit PaymentReleased(agreementId, carrier, amount, block.timestamp);

        (bool success, ) = carrier.call{value: amount}("");
        require(success, "Payment transfer failed");
    }

    // Refunds whatever remains in escrow back to the Shipper once an
    // agreement has been Cancelled or has Expired.
    function refundRemaining(uint256 agreementId) external {
        require(agreementManagerAddress != address(0), "AgreementManager not configured");

        IAgreementManager.Agreement memory agreement =
            IAgreementManager(agreementManagerAddress).getAgreement(agreementId);

        require(
            agreement.status == IAgreementManager.AgreementStatus.Cancelled ||
            agreement.status == IAgreementManager.AgreementStatus.Expired,
            "Agreement must be Cancelled or Expired to refund"
        );

        uint256 remaining = escrowBalance[agreementId];
        require(remaining > 0, "No remaining escrow to refund");

        // Effects before interaction
        escrowBalance[agreementId] = 0;

        emit EscrowRefunded(agreementId, agreement.shipper, remaining, block.timestamp);

        (bool success, ) = payable(agreement.shipper).call{value: remaining}("");
        require(success, "Refund transfer failed");
    }

    // ---------------
    // View Functions
    // ---------------

    function getEscrowBalance(uint256 agreementId) external view returns (uint256) {
        return escrowBalance[agreementId];
    }

    function isFullyFunded(uint256 agreementId) external view returns (bool) {
        require(agreementManagerAddress != address(0), "AgreementManager not configured");
        IAgreementManager.Agreement memory agreement =
            IAgreementManager(agreementManagerAddress).getAgreement(agreementId);
        return fundedAmount[agreementId] >= agreement.escrowAmount;
    }

    function getFundedAmount(uint256 agreementId) external view returns (uint256) {
        return fundedAmount[agreementId];
    }

    // ---------------------
    // Safety net
    // ---------------------
    // Rejects plain ETH transfers so every deposit is properly attributed
    // to an agreementId through fundEscrow().
    receive() external payable {
        revert("Direct payments not accepted, use fundEscrow()");
    }
}

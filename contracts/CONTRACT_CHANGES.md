Final Solidity integration

This commit integrates the current finalized versions of the five core contracts. The large insertion count is expected because several contract files on feature/token were previously placeholders/minimal versions.


UserRegistry

Registration for Shipper, Carrier, Warehouse and Customs roles
Unique wallet registration
Suspension support
Active-role validation used by other contracts



AgreementManager

Full agreement lifecycle: Draft → Posted → Active → PendingApproval → Completed
Terminal states: Cancelled, Expired, Failed
Draft editing and escrow-reset handling
Full-funding requirement before posting
Carrier acceptance
Cancellation before first milestone payment
Completion reward locking
Reusable agreement templates
templateId = 0 supports custom agreements
Losing Carrier unused-stake withdrawal
Carrier abandonment handling
Objective deadline-failure handling
Full AGRI stake slashing for Carrier failure
Ordinary expiry returns stake
canStakeOnAgreement() validates AGRI staking eligibility
Live Shipper/Carrier suspension checks



EscrowManager

Partial funding
Overfund prevention
Draft-only funding
Deadline checks
Milestone-only payment release
Released-payment tracking
Draft escrow reset/refund
Cancellation, expiry and failed-agreement refunds
Direct ETH transfers rejected



MilestoneManager

Sequential milestone enforcement
Percentages must total 100%
Warehouse/Customs approver validation
IPFS CID proof submission
Proof rejection and resubmission
PendingApproval lifecycle
Milestone-based escrow release
Deadline tracking using currentMilestoneStartedAt
Carrier deadline-failure detection
Protects Carrier from slashing when the next milestone only becomes available after the deadline



AGRIToken

ERC-20 AGRI reward token
AgreementManager-only completion reward minting
Per-agreement Carrier staking
Stake release
Full stake burning on objective Carrier failure
Staking restricted to eligible Posted agreements through canStakeOnAgreement()




Important: copied AgreementStatus enums must remain in this exact order across contracts:

Draft, Posted, Active, PendingApproval, Completed, Cancelled, Expired, Failed
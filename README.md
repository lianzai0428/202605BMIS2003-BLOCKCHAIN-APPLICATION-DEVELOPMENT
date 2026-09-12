# Agricultural Export Logistics DApp

BMIS2003 Blockchain Application Development Assignment

## Project Overview

This project is a decentralized agricultural export logistics application built using Ethereum smart contracts.

The system allows a Shipper to create logistics agreements, fund escrow, define milestone-based payments, and publish agreements for eligible Carriers. A Carrier accepts an agreement by staking AGRI tokens. Warehouse and Customs users verify milestone proof, while escrow payments are automatically released according to approved milestones.

The application uses Ethereum Sepolia for blockchain deployment and IPFS/Pinata for milestone proof storage.

## GitHub Repository

GitHub Repository:

https://github.com/YOUR-USERNAME/202605BMIS2003-BLOCKCHAIN-APPLICATION-DEVELOPMENT

## Main Features

- User registration with Shipper, Carrier, Warehouse and Customs roles
- Creation and editing of logistics agreements
- Milestone configuration with designated approvers
- ETH escrow funding
- Carrier AGRI token staking
- Carrier agreement acceptance
- IPFS milestone proof submission
- Milestone approval and rejection
- Automatic milestone-based escrow payment
- Proof resubmission after rejection
- Agreement cancellation
- Agreement expiry and failure handling
- AGRI stake return and slashing
- AGRI completion rewards
- Carrier abandonment handling
- Unused stake withdrawal
- Transaction and audit history
- Role-based dashboards
- MetaMask wallet integration

## Smart Contracts

### UserRegistry.sol

Manages user registration, roles and user status.

Supported roles:

- Shipper
- Carrier
- Warehouse Operator
- Customs Authority

### AgreementManager.sol

Manages the agreement lifecycle including:

Draft → Posted → Active → PendingApproval → Completed

It also manages cancellation, expiry and failure conditions.

### EscrowManager.sol

Manages ETH escrow funding, milestone payment releases and refunds.

### MilestoneManager.sol

Manages agreement milestones, proof submission, approval, rejection and milestone progression.

### AGRIToken.sol

ERC-20 utility token used for Carrier staking and completion rewards.

Carriers may have their stake returned, partially burned or fully burned depending on agreement outcome.

## Technology Stack

- Solidity 0.8.21
- Ethereum Sepolia Testnet
- Truffle
- OpenZeppelin Contracts
- React
- Vite
- ethers.js
- MetaMask
- Pinata / IPFS
- Node.js
- npm

## Project Structure

```text
.
├── contracts/
│   ├── AgreementManager.sol
│   ├── AGRIToken.sol
│   ├── EscrowManager.sol
│   ├── MilestoneManager.sol
│   └── UserRegistry.sol
│
├── docs/
│
├── frontend/
│   ├── api/
│   ├── public/
│   ├── src/
│   │   ├── ABIs/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── config/
│   │   ├── mock/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── .env.local
│   ├── package.json
│   └── vite.config.js
│
├── logs/
├── package.json
├── package-lock.json
├── truffle-config.js
└── README.md



Installation
1. Install Smart Contract Dependencies

From the project root:

npm install

Compile the smart contracts:

truffle compile --all

The contracts compile using Solidity 0.8.21.



2. Install Frontend Dependencies
cd frontend
npm install


3. Environment Configuration

Create or configure:

frontend/.env.local

with the required Pinata/IPFS environment variables.


4. Run the Frontend

From the frontend directory:

npm run dev

Open the local Vite URL shown in the terminal.


MetaMask Setup

The application requires MetaMask.

Connect MetaMask to the Ethereum Sepolia test network and select an account containing sufficient Sepolia ETH for transaction gas.

Users must register through the application before accessing role-specific functionality.


Typical Workflow

Shipper registers
        ↓
Creates agreement
        ↓
Creates milestones
        ↓
Funds ETH escrow
        ↓
Posts agreement
        ↓
Carrier stakes AGRI
        ↓
Carrier accepts agreement
        ↓
Carrier submits milestone proof
        ↓
Designated approver reviews proof
        ↓
Approve → milestone payment released
or
Reject → Carrier may resubmit before deadline
        ↓
All milestones approved
        ↓
Agreement completed
        ↓
Carrier stake returned
        ↓
Completion AGRI reward issued



AGRI Token Rules

AGRI is the ERC-20 utility token used by Carriers.

A Carrier must satisfy the minimum AGRI staking requirement before accepting an agreement.

Normal agreement completion returns the Carrier's stake and awards the configured completion reward.

Carrier fault or abandonment may result in stake burning.

For non-fault incomplete expiry, stake penalties may be calculated proportionally according to unfinished milestone percentages.


Escrow Rules

The Shipper funds the required ETH escrow before an agreement can be posted.

Each milestone contains a payment percentage.

When a milestone is approved, the corresponding escrow amount is automatically transferred to the assigned Carrier.

Previously released milestone payments are irreversible.

Remaining escrow may be refunded when an agreement is cancelled, expired or failed according to the applicable business rules.


Deadline Behaviour

Milestone proof must be submitted before the agreement deadline.

Proof already submitted before the deadline may still be reviewed afterward.

If submitted proof is rejected after the deadline and the milestone remains unresolved, the agreement may be processed as Carrier failure according to the implemented business rules.


Final Deployed Contracts

Network: Ethereum Sepolia

UserRegistry:
0x5f5b685BB7a576Ba656a443df72eE6DdB8d6f32E

AgreementManager:
0xcbbA915a17B8e964C74B44e815dF71Cfa03322A1

EscrowManager:
0x09748C7B4CD43Bed6fDc17A02465D7CdF6B6723E

MilestoneManager:
0xb7877858bB367e1FE7b839a24BEA1488955563bb 

AGRIToken:
0x746beB902C91590826FA4d3c421f262a452a39c3

The frontend contract configuration is located at:

frontend/src/config/contracts.js
Important Notes

Do not include node_modules directories when distributing the project. Dependencies can be restored using npm install.

The .env.local file used for the submitted demonstration environment may contain configuration required by the frontend. Secrets should not be published to a public GitHub repository.

Team Project

This project was developed for:

BMIS2003 Blockchain Application Development
Assignment 202605
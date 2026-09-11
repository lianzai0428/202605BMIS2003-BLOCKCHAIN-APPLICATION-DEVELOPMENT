import { ethers } from "ethers";

import UserRegistryABI from "../ABIs/UserRegistry.json";
import AgreementManagerABI from "../ABIs/AgreementManager.json";
import EscrowManagerABI from "../ABIs/EscrowManager.json";
import MilestoneManagerABI from "../ABIs/MilestoneManager.json";
import AGRITokenABI from "../ABIs/AGRIToken.json";

import {
  CONTRACT_ADDRESSES,
  SEPOLIA_CHAIN_ID,
} from "../config/contracts";

import {
  formatEthWithMyr,
} from "../utils/currency";


// ============================================================
// ABI HELPER
// Supports either:
// 1. raw ABI array
// 2. Remix/compiled JSON object containing { abi: [...] }
// ============================================================

const AUDIT_LOOKBACK_BLOCKS = 30000;
const AUDIT_CHUNK_SIZE = 2000;

function getAbi(importedJson) {
  return importedJson.abi ?? importedJson;
}


// ============================================================
// METAMASK
// ============================================================

export function hasMetaMask() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}


export async function getProvider() {
  if (!hasMetaMask()) {
    throw new Error("MetaMask is not installed");
  }

  return new ethers.BrowserProvider(window.ethereum);
}


export async function getChainId() {
  const provider = await getProvider();
  const network = await provider.getNetwork();

  return Number(network.chainId);
}


export async function ensureSepolia() {
  const chainId = await getChainId();

  if (chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error(
      `Wrong network. Please switch MetaMask to Sepolia (${SEPOLIA_CHAIN_ID}).`
    );
  }

  return true;
}


export async function connectWallet() {
  if (!hasMetaMask()) {
    throw new Error("MetaMask is not installed");
  }

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  await ensureSepolia();

  return accounts[0];
}


export async function getSigner() {
  await ensureSepolia();

  const provider = await getProvider();
  return await provider.getSigner();
}


export async function getConnectedAddress() {
  const signer = await getSigner();
  return await signer.getAddress();
}


// ============================================================
// CONTRACT INSTANCES
// ============================================================

export async function getUserRegistry() {
  const signer = await getSigner();

  return new ethers.Contract(
    CONTRACT_ADDRESSES.userRegistry,
    getAbi(UserRegistryABI),
    signer
  );
}


export async function getAgreementManager() {
  const signer = await getSigner();

  return new ethers.Contract(
    CONTRACT_ADDRESSES.agreementManager,
    getAbi(AgreementManagerABI),
    signer
  );
}


export async function getEscrowManager() {
  const signer = await getSigner();

  return new ethers.Contract(
    CONTRACT_ADDRESSES.escrowManager,
    getAbi(EscrowManagerABI),
    signer
  );
}


export async function getMilestoneManager() {
  const signer = await getSigner();

  return new ethers.Contract(
    CONTRACT_ADDRESSES.milestoneManager,
    getAbi(MilestoneManagerABI),
    signer
  );
}


export async function getAGRIToken() {
  const signer = await getSigner();

  return new ethers.Contract(
    CONTRACT_ADDRESSES.agriToken,
    getAbi(AGRITokenABI),
    signer
  );
}


// ============================================================
// FIRST SIMPLE TEST
// ============================================================

export async function checkRegistration() {
  const address = await getConnectedAddress();
  const registry = await getUserRegistry();

  const registered = await registry.isRegistered(address);

  return {
    address,
    registered,
  };
}



export async function getCurrentUser() {
  const address = await getConnectedAddress();
  const registry = await getUserRegistry();

  const user = await registry.getUser(address);

  return {
    address,
    name: user.name,
    role: Number(user.role),
    registered: user.registered,
    suspended: user.suspended,
  };
}

export function getRoleName(role) {
  const roles = [
    "None",
    "Shipper",
    "Carrier",
    "Warehouse",
    "Customs",
  ];

  return roles[role] ?? "Unknown";
}


export async function registerUser(name, role) {
  const registry = await getUserRegistry();

  const tx = await registry.registerUser(
    name,
    role
  );

  // Wait until Sepolia confirms the transaction
  await tx.wait();

  return tx;
}


export async function createAgreement({
  product,
  quantity,
  unitOfMeasurement,
  origin,
  destination,
  escrowEth,
  deadline,
  minimumStakeAgri = "0",
  templateId = 0,
}) {
  await ensureSepolia();

  const contract =
    await getAgreementManager();

  const escrowAmount =
    ethers.parseEther(
      String(escrowEth)
    );

  const deadlineTimestamp =
    Math.floor(
      new Date(deadline).getTime() /
        1000
    );

  if (
    !deadlineTimestamp ||
    deadlineTimestamp <=
      Math.floor(Date.now() / 1000)
  ) {
    throw new Error(
      "Deadline must be in the future."
    );
  }

  const minimumStake =
    ethers.parseUnits(
      String(minimumStakeAgri || "0"),
      18
    );

  const details = [
    product,
    BigInt(quantity),
    unitOfMeasurement,
    origin,
    destination,
    escrowAmount,
    BigInt(deadlineTimestamp),

    BigInt(templateId),

    minimumStake,
  ];

  const tx =
    await contract.createAgreement(
      details
    );

  const receipt =
    await tx.wait();

  let agreementId = null;

  for (const log of receipt.logs) {
    try {
      const parsed =
        contract.interface.parseLog(
          log
        );

      if (
        parsed?.name ===
        "AgreementCreated"
      ) {
        agreementId =
          Number(
            parsed.args.agreementId
          );

        break;
      }
    } catch {
      // Ignore logs belonging to
      // other contracts.
    }
  }

  return {
    receipt,
    agreementId,
  };
}


export function getAgreementStatusName(
  status
) {
  const statuses = [
    "Draft",
    "Posted",
    "Active",
    "Pending Approval",
    "Completed",
    "Cancelled",
    "Expired",
    "Failed",
  ];

  return statuses[status] ?? "Unknown";
}


export async function getShipperAgreements() {
  const contract = await getAgreementManager();
  const address = await getConnectedAddress();

  // Get all agreement IDs belonging to this shipper
  const ids =
    await contract.getShipperAgreementIds(address);

  const agreements = [];

  for (const id of ids) {
    const agreement =
      await contract.getAgreement(id);

    agreements.push({
      id: Number(agreement.id),

      shipper: agreement.shipper,
      carrier: agreement.carrier,

      product: agreement.product,

      quantity:
        agreement.quantity.toString(),

      unitOfMeasurement:
        agreement.unitOfMeasurement,

      origin: agreement.origin,
      destination: agreement.destination,

      escrowEth:
        ethers.formatEther(
          agreement.escrowAmount
        ),

      deadline:
        new Date(
          Number(agreement.deadline) * 1000
        ).toLocaleString(),

      templateId:
        Number(agreement.templateId),

      minimumStake:
        ethers.formatUnits(
          agreement.minimumStake,
          18
        ),

      status:
        Number(agreement.status),
    });
  }

  return agreements;
}

export async function createMilestones({
  agreementId,
  descriptions,
  proofRequirements,
  paymentPercentages,
  approvers,
}) {
  const contract = await getMilestoneManager();

  if (
    descriptions.length !== proofRequirements.length ||
    descriptions.length !== paymentPercentages.length ||
    descriptions.length !== approvers.length
  ) {
    throw new Error("Milestone arrays do not match");
  }

  const total = paymentPercentages.reduce(
    (sum, value) => sum + Number(value),
    0
  );

  if (total !== 100) {
    throw new Error(
      "Payment percentages must total 100"
    );
  }

  const tx = await contract.createMilestone(
    agreementId,
    descriptions,
    proofRequirements,
    paymentPercentages,
    approvers
  );

  await tx.wait();

  return tx;
}


export async function fundEscrow(
  agreementId,
  amountEth
) {
  const contract =
    await getEscrowManager();

  const value =
    ethers.parseEther(
      String(amountEth)
    );

  const tx =
    await contract.fundEscrow(
      agreementId,
      {
        value,
      }
    );

  await tx.wait();

  return tx;
}


export async function postAgreement(agreementId) {
  const contract = await getAgreementManager();

  const tx = await contract.postAgreement(
    agreementId
  );

  await tx.wait();

  return tx;
}


export async function getOpenAgreements() {
  const contract = await getAgreementManager();

  const ids =
    await contract.getOpenAgreementIds();

  const agreements = [];

  for (const id of ids) {
    const agreement =
      await contract.getAgreement(id);

    agreements.push({
      id: Number(agreement.id),

      shipper: agreement.shipper,
      carrier: agreement.carrier,

      product: agreement.product,

      quantity:
        agreement.quantity.toString(),

      unitOfMeasurement:
        agreement.unitOfMeasurement,

      origin: agreement.origin,
      destination: agreement.destination,

      escrowEth:
        ethers.formatEther(
          agreement.escrowAmount
        ),

      deadline:
        new Date(
          Number(agreement.deadline) * 1000
        ).toLocaleString(),

      minimumStake:
        ethers.formatUnits(
          agreement.minimumStake,
          18
        ),

      status:
        Number(agreement.status),
    });
  }

  return agreements;
}




export async function acceptAgreement(
  agreementId
) {
  const contract =
    await getAgreementManager();

  const tx =
    await contract.acceptAgreement(
      agreementId
    );

  await tx.wait();

  return tx;
}


export async function getCarrierAgreements() {
  const contract = await getAgreementManager();
  const address = await getConnectedAddress();

  const ids =
    await contract.getCarrierAgreementIds(address);

  const agreements = [];

  for (const id of ids) {
    const agreement =
      await contract.getAgreement(id);

    agreements.push({
      id: Number(agreement.id),

      shipper: agreement.shipper,
      carrier: agreement.carrier,

      product: agreement.product,

      quantity:
        agreement.quantity.toString(),

      unitOfMeasurement:
        agreement.unitOfMeasurement,

      origin: agreement.origin,
      destination: agreement.destination,

      escrowEth:
        ethers.formatEther(
          agreement.escrowAmount
        ),

      deadline:
        new Date(
          Number(agreement.deadline) * 1000
        ).toLocaleString(),

      minimumStake:
        ethers.formatUnits(
          agreement.minimumStake,
          18
        ),

      status:
        Number(agreement.status),
    });
  }

  return agreements;
}


export function getMilestoneStatusName(status) {
  const statuses = [
    "Pending",
    "Submitted",
    "Approved",
    "Rejected",
  ];

  return statuses[status] ?? "Unknown";
}


export async function getMilestones(
  agreementId
) {
  const contract =
    await getMilestoneManager();

  const count =
    await contract.getMilestoneCount(
      agreementId
    );

  const currentIndex =
    await contract.getCurrentMilestoneIndex(
      agreementId
    );

  const milestones = [];

  for (
    let i = 0;
    i < Number(count);
    i++
  ) {
    const milestone =
      await contract.getMilestone(
        agreementId,
        i
      );

    milestones.push({
      id: i,

      description:
        milestone.description,

      proofRequirement:
        milestone.proofRequirement,

      paymentPercentage:
        Number(
          milestone.paymentPercentage
        ),

      approver:
        milestone.approver,

      status:
        Number(milestone.status),

      proofCid:
        milestone.proofCid,

      proofSubmittedAt:
        Number(
          milestone.proofSubmittedAt
        ),

      isCurrent:
        i === Number(currentIndex),
    });
  }

  return milestones;
}

export async function submitProof(
  agreementId,
  milestoneId,
  cid
) {
  const contract =
    await getMilestoneManager();

  if (!cid.trim()) {
    throw new Error("CID cannot be empty");
  }

  const tx =
    await contract.submitProof(
      agreementId,
      milestoneId,
      cid.trim()
    );

  await tx.wait();

  return tx;
}


export async function getApprovalTasks() {
  const address =
    await getConnectedAddress();

  const wallet =
    address.toLowerCase();

  const overview =
    await getDashboardOverview();

  const tasks = [];

  for (
    const agreement
    of overview.agreements
  ) {
    const milestones =
      await getMilestones(
        agreement.id
      );

    for (
      const milestone
      of milestones
    ) {
      if (
        milestone.approver
          ?.toLowerCase() ===
          wallet &&
        milestone.status === 1
      ) {
        tasks.push({
          agreement,
          milestone,
        });
      }
    }
  }

  return tasks;
}


export async function approveMilestone(
  agreementId,
  milestoneId
) {
  await ensureSepolia();

  const contract =
    await getMilestoneManager();

  const tx =
    await contract.approveMilestone(
      agreementId,
      milestoneId
    );

  return await tx.wait();
}


export async function rejectMilestone(
  agreementId,
  milestoneId
) {
  await ensureSepolia();

  const contract =
    await getMilestoneManager();

  const tx =
    await contract.rejectMilestone(
      agreementId,
      milestoneId
    );

  return await tx.wait();
}


export async function getDashboardOverview() {
  const agreementContract =
    await getAgreementManager();

  const milestoneContract =
    await getMilestoneManager();

  const nextId =
    Number(
      await agreementContract.nextAgreementId()
    );

  const agreements = [];
  let pendingMilestones = 0;

  for (
    let agreementId = 1;
    agreementId < nextId;
    agreementId++
  ) {
    const agreement =
      await agreementContract.getAgreement(
        agreementId
      );

    const status =
      Number(agreement.status);

    agreements.push({
      id: agreementId,

      product:
        agreement.product,

      shipper:
        agreement.shipper,

      carrier:
        agreement.carrier,

      escrowEth:
        ethers.formatEther(
          agreement.escrowAmount
        ),

      origin:
        agreement.origin,

      destination:
        agreement.destination,

      deadline:
        new Date(
          Number(agreement.deadline) * 1000
        ).toLocaleString(),

      statusNumber:
        status,

      status:
        getAgreementStatusName(status),
    });


    const milestoneCount =
      Number(
        await milestoneContract
          .getMilestoneCount(
            agreementId
          )
      );

    for (
      let milestoneId = 0;
      milestoneId < milestoneCount;
      milestoneId++
    ) {
      const milestone =
        await milestoneContract
          .getMilestone(
            agreementId,
            milestoneId
          );

      // Anything not Approved still
      // requires further progress/action.
      if (
        Number(milestone.status) !== 2
      ) {
        pendingMilestones++;
      }
    }
  }


  agreements.sort(
    (a, b) => b.id - a.id
  );


  return {
    agreements,

    stats: {
      totalAgreements:
        agreements.length,

      activeAgreements:
        agreements.filter(
          (agreement) =>
            agreement.statusNumber === 2 ||
            agreement.statusNumber === 3
        ).length,

      completedAgreements:
        agreements.filter(
          (agreement) =>
            agreement.statusNumber === 4
        ).length,

      pendingMilestones,
    },
  };
}


export async function getEscrowSummary(
  agreementId
) {
  const agreementManager =
    await getAgreementManager();

  const escrowManager =
    await getEscrowManager();

  const agreement =
    await agreementManager.getAgreement(
      agreementId
    );

  const funded =
    await escrowManager.getFundedAmount(
      agreementId
    );

  const balance =
    await escrowManager.getEscrowBalance(
      agreementId
    );

  const released =
    await escrowManager.getReleasedAmount(
      agreementId
    );

  const required =
    agreement.escrowAmount;

  const remainingToFund =
    required > funded
      ? required - funded
      : 0n;

  return {
    requiredEth:
      ethers.formatEther(required),

    fundedEth:
      ethers.formatEther(funded),

    balanceEth:
      ethers.formatEther(balance),

    releasedEth:
      ethers.formatEther(released),

    remainingToFundEth:
      ethers.formatEther(
        remainingToFund
      ),

    fullyFunded:
      funded >= required,
  };
}

export async function getProofSubmissionHistory(
  agreementId,
  milestoneId
) {
  const contract =
    await getMilestoneManager();

  const provider =
    await getProvider();

  const latestBlock =
    await provider.getBlockNumber();

  // Our Sepolia contracts were deployed recently.
  // Do not ask the RPC to scan Sepolia from block 0.
  const startBlock = Math.max(
    0,
    latestBlock - 50000
  );

  const chunkSize = 5000;

  const filter =
    contract.filters.ProofSubmitted(
      agreementId,
      milestoneId
    );

  const events = [];

  for (
    let fromBlock = startBlock;
    fromBlock <= latestBlock;
    fromBlock += chunkSize
  ) {
    const toBlock = Math.min(
      fromBlock + chunkSize - 1,
      latestBlock
    );

    const batch =
      await contract.queryFilter(
        filter,
        fromBlock,
        toBlock
      );

    events.push(...batch);
  }

  return events.map((event) => {
    const timestamp =
      Number(event.args.timestamp);

    return {
      cid: event.args.cid,

      timestamp,

      submittedAt:
        new Date(
          timestamp * 1000
        ).toLocaleString(),

      transactionHash:
        event.transactionHash,
    };
  });
}


export async function getMilestoneEventAnalytics(
  agreementIds,
  approverAddress = null
) {
  await ensureSepolia();

  const wantedIds =
    new Set(
      (agreementIds || []).map(
        (id) =>
          BigInt(id).toString()
      )
    );

  if (wantedIds.size === 0) {
    return {
      proofSubmissions: 0,
      approvals: 0,
      rejections: 0,
      resubmissions: 0,
      approvalRate: null,
    };
  }

  const provider =
    await getProvider();

  const contract =
    await getMilestoneManager();

  const latestBlock =
    await provider.getBlockNumber();

  const fromBlock =
    Math.max(
      0,
      latestBlock -
        AUDIT_LOOKBACK_BLOCKS
    );

  const logs =
    await getContractLogs(
      contract,
      fromBlock,
      latestBlock
    );

  const wantedApprover =
    approverAddress
      ?.toLowerCase();

  let proofSubmissions = 0;
  let approvals = 0;
  let rejections = 0;

  const submissionsPerMilestone =
    new Map();


  for (const log of logs) {
    try {
      const parsed =
        contract.interface.parseLog(
          log
        );

      if (!parsed) {
        continue;
      }

      const name =
        parsed.name;

      if (
        name !== "ProofSubmitted" &&
        name !== "MilestoneApproved" &&
        name !== "MilestoneRejected"
      ) {
        continue;
      }

      const agreementId =
        BigInt(
          parsed.args.agreementId
        ).toString();

      if (
        !wantedIds.has(
          agreementId
        )
      ) {
        continue;
      }

      const milestoneId =
        Number(
          parsed.args.milestoneId
        );


      // Historical proof submissions
      if (
        name === "ProofSubmitted"
      ) {
        proofSubmissions++;

        const key =
          `${agreementId}:${milestoneId}`;

        submissionsPerMilestone.set(
          key,
          (
            submissionsPerMilestone
              .get(key) || 0
          ) + 1
        );

        continue;
      }


      // Optional Warehouse / Customs
      // approver filtering.
      if (wantedApprover) {
        const eventApprover =
          parsed.args.approver
            ?.toLowerCase();

        if (
          eventApprover !==
          wantedApprover
        ) {
          continue;
        }
      }


      if (
        name ===
        "MilestoneApproved"
      ) {
        approvals++;
      }

      if (
        name ===
        "MilestoneRejected"
      ) {
        rejections++;
      }

    } catch {
      // Ignore unrelated or
      // unparsable logs.
    }
  }


  let resubmissions = 0;

  for (
    const count
    of submissionsPerMilestone.values()
  ) {
    if (count > 1) {
      resubmissions +=
        count - 1;
    }
  }


  const decisions =
    approvals + rejections;

  return {
    proofSubmissions,
    approvals,
    rejections,
    resubmissions,

    approvalRate:
      decisions === 0
        ? null
        : Math.round(
            (
              approvals /
              decisions
            ) * 100
          ),
  };
}


export async function getCarrierProofTargets() {
  const address =
    await getConnectedAddress();

  const wallet =
    address.toLowerCase();

  const overview =
    await getDashboardOverview();

  const carrierAgreements =
    overview.agreements.filter(
      (agreement) =>
        agreement.carrier
          ?.toLowerCase() === wallet &&
        (
          agreement.statusNumber === 2 ||
          agreement.statusNumber === 3
        )
    );

  const result = [];

  for (const agreement of carrierAgreements) {
    const milestones =
      await getMilestones(
        agreement.id
      );

    if (milestones.length === 0) {
      continue;
    }

    // Because milestones are sequential,
    // the first non-approved milestone
    // is the current one.
    const currentMilestone =
      milestones.find(
        (milestone) =>
          milestone.status !== 2
      );

    if (!currentMilestone) {
      continue;
    }

    const history =
      await getProofSubmissionHistory(
        agreement.id,
        currentMilestone.id
      );

    result.push({
        agreement,
        milestones,
        currentMilestone,
        history,
    });
  }

  return result;
}



export async function getAgreementDetails(
  agreementId
) {
  await ensureSepolia();

  const agreementManager =
    await getAgreementManager();

  const escrowManager =
    await getEscrowManager();

  const agriToken =
    await getAGRIToken();

  const id = BigInt(agreementId);

  const agreement =
    await agreementManager.getAgreement(
      id
    );

  const [
    fundedAmount,
    escrowBalance,
    releasedAmount,
    milestones,
  ] = await Promise.all([
    escrowManager.getFundedAmount(id),
    escrowManager.getEscrowBalance(id),
    escrowManager.getReleasedAmount(id),
    getMilestones(Number(agreementId)),
  ]);

  const shipperUser =
  await getBlockchainUserSummary(
    agreement.shipper
  );


let carrierUser = null;

if (
  agreement.carrier !==
  ethers.ZeroAddress
) {
  carrierUser =
    await getBlockchainUserSummary(
      agreement.carrier
    );
}


const uniqueApproverAddresses =
  [
    ...new Map(
      milestones
        .filter(
          milestone =>
            milestone.approver &&
            milestone.approver !==
              ethers.ZeroAddress
        )
        .map(
          milestone => [
            milestone.approver
              .toLowerCase(),

            milestone.approver,
          ]
        )
    ).values(),
  ];


const approverUsers =
  await Promise.all(
    uniqueApproverAddresses.map(
      address =>
        getBlockchainUserSummary(
          address
        )
    )
  );


const approvers =
  approverUsers.map(
    user => ({
      ...user,

      milestones:
        milestones
          .filter(
            milestone =>
              milestone.approver
                .toLowerCase() ===
              user.address
                .toLowerCase()
          )
          .map(
            milestone =>
              Number(
                milestone.id
              ) + 1
          ),
    })
  );

  let completionReward = 0n;

  try {
    completionReward =
      await agreementManager
        .getAgreementCompletionReward(
          id
        );
  } catch {
    completionReward = 0n;
  }

  let carrierStake = 0n;
  let carrierAgriBalance = 0n;

  if (
    agreement.carrier &&
    agreement.carrier !==
      ethers.ZeroAddress
  ) {
    try {
      carrierStake =
        await agriToken.getStake(
          id,
          agreement.carrier
        );

      carrierAgriBalance =
        await agriToken.balanceOf(
          agreement.carrier
        );
    } catch {
      // Leave values as zero if
      // unavailable.
    }
  }

  const statusNumber =
    Number(agreement.status);

  return {
    agreement: {
      id: Number(agreement.id),

      shipper:
        agreement.shipper,

      carrier:
        agreement.carrier,

      product:
        agreement.product,

      quantity:
        agreement.quantity.toString(),

      unitOfMeasurement:
        agreement.unitOfMeasurement,

      origin:
        agreement.origin,

      destination:
        agreement.destination,

      escrowAmountEth:
        ethers.formatEther(
          agreement.escrowAmount
        ),

      deadlineTimestamp:
        Number(
          agreement.deadline
        ),

      deadline:
        new Date(
          Number(
            agreement.deadline
          ) * 1000
        ).toLocaleString(),

      templateId:
        agreement.templateId.toString(),

      minimumStakeAgri:
        ethers.formatUnits(
          agreement.minimumStake,
          18
        ),

      statusNumber,

      status:
        getAgreementStatusName(
          statusNumber
        ),
    },

    escrow: {
      required:
        ethers.formatEther(
          agreement.escrowAmount
        ),

      funded:
        ethers.formatEther(
          fundedAmount
        ),

      released:
        ethers.formatEther(
          releasedAmount
        ),

      remaining:
        ethers.formatEther(
          escrowBalance
        ),
    },

    agri: {
      minimumStake:
        ethers.formatUnits(
          agreement.minimumStake,
          18
        ),

      carrierStake:
        ethers.formatUnits(
          carrierStake,
          18
        ),

      completionReward:
        ethers.formatUnits(
          completionReward,
          18
        ),

      carrierBalance:
        ethers.formatUnits(
          carrierAgriBalance,
          18
        ),
    },
    participants: {
        shipper:
            shipperUser,

        carrier:
            carrierUser,

        approvers,
        },

    milestones,
  };
}






async function getContractLogs(
  contract,
  fromBlock,
  toBlock
) {
  const provider = await getProvider();

  const address =
    await contract.getAddress();

  const logs = [];

  for (
    let start = fromBlock;
    start <= toBlock;
    start += AUDIT_CHUNK_SIZE
  ) {
    const end = Math.min(
      start + AUDIT_CHUNK_SIZE - 1,
      toBlock
    );

    const batch =
      await provider.getLogs({
        address,
        fromBlock: start,
        toBlock: end,
      });

    logs.push(...batch);
  }

  return logs;
}


async function getBlockchainUserSummary(
  address
) {
  if (
    !address ||
    address === ethers.ZeroAddress
  ) {
    return null;
  }

  try {
    const registry =
      await getUserRegistry();

    const registered =
      await registry.isRegistered(
        address
      );

    if (!registered) {
      return {
        address,
        name: "Unregistered Wallet",
        role: "Unknown",
      };
    }

    const user =
      await registry.getUser(address);

    const name =
      user.name ??
      user[0] ??
      "Registered User";

    const roleNumber =
      Number(
        user.role ??
        user[1] ??
        0
      );

    return {
      address,
      name,
      role:
        getRoleName(roleNumber),
    };

  } catch (error) {
    console.warn(
      "Unable to resolve user:",
      address,
      error
    );

    return {
      address,
      name: "Wallet",
      role: "Unknown",
    };
  }
}


export async function getAgreementAuditTrail(
  agreementId
) {
  await ensureSepolia();

  const provider =
    await getProvider();

  const [
    agreementManager,
    escrowManager,
    milestoneManager,
  ] = await Promise.all([
    getAgreementManager(),
    getEscrowManager(),
    getMilestoneManager(),
  ]);

  const latestBlock =
    await provider.getBlockNumber();

  const fromBlock = Math.max(
    0,
    latestBlock -
      AUDIT_LOOKBACK_BLOCKS
  );

  const [
    agreementLogs,
    escrowLogs,
    milestoneLogs,
  ] = await Promise.all([
    getContractLogs(
      agreementManager,
      fromBlock,
      latestBlock
    ),

    getContractLogs(
      escrowManager,
      fromBlock,
      latestBlock
    ),

    getContractLogs(
      milestoneManager,
      fromBlock,
      latestBlock
    ),
  ]);

  const wantedId =
    BigInt(agreementId);

  const rawEvents = [];


  function parseLogs(
    logs,
    contract,
    source
  ) {
    for (const log of logs) {
      try {
        const parsed =
          contract.interface.parseLog(
            log
          );

        if (!parsed) continue;

        const eventAgreementId =
          parsed.args
            ?.agreementId;

        if (
          eventAgreementId ===
            undefined ||
          BigInt(
            eventAgreementId
          ) !== wantedId
        ) {
          continue;
        }

        rawEvents.push({
          source,
          name: parsed.name,
          args: parsed.args,
          blockNumber:
            log.blockNumber,
          logIndex:
            log.index ?? 0,
          transactionHash:
            log.transactionHash,
        });

      } catch {
        // Ignore unrelated /
        // unparsable logs.
      }
    }
  }


  parseLogs(
    agreementLogs,
    agreementManager,
    "AgreementManager"
  );

  parseLogs(
    escrowLogs,
    escrowManager,
    "EscrowManager"
  );

  parseLogs(
    milestoneLogs,
    milestoneManager,
    "MilestoneManager"
  );


  const blockCache = new Map();


  async function getBlockTimestamp(
    blockNumber
  ) {
    if (
      blockCache.has(blockNumber)
    ) {
      return blockCache.get(
        blockNumber
      );
    }

    const block =
      await provider.getBlock(
        blockNumber
      );

    const timestamp =
      Number(block.timestamp);

    blockCache.set(
      blockNumber,
      timestamp
    );

    return timestamp;
  }


  const actorAddresses =
    new Set();


  for (const event of rawEvents) {
    const args = event.args;

    const possibleActors = [
      args.shipper,
      args.carrier,
      args.approver,
    ];

    for (
      const address
      of possibleActors
    ) {
      if (
        address &&
        address !==
          ethers.ZeroAddress
      ) {
        actorAddresses.add(
          address
        );
      }
    }
  }


  const actorEntries =
    await Promise.all(
      [...actorAddresses].map(
        async (address) => [
          address.toLowerCase(),
          await getBlockchainUserSummary(
            address
          ),
        ]
      )
    );

  const actors =
    new Map(actorEntries);


  function getActor(address) {
    if (!address) {
      return {
        name:
          "Smart Contract",
        role:
          "Automated Execution",
        address: null,
      };
    }

    return (
      actors.get(
        address.toLowerCase()
      ) || {
        name: "Wallet",
        role: "Unknown",
        address,
      }
    );
  }


  const events = [];


  for (const event of rawEvents) {
    const {
      name,
      args,
    } = event;

    const explicitTimestamp =
      args.timestamp !== undefined
        ? Number(args.timestamp)
        : null;

    const timestamp =
      explicitTimestamp ||
      await getBlockTimestamp(
        event.blockNumber
      );

    const base = {
      eventName: name,

      source:
        event.source,

      timestamp,

      time:
        formatAuditTime(
            timestamp
        ),

      blockNumber:
        event.blockNumber,

      logIndex:
        event.logIndex,

      transactionHash:
        event.transactionHash,

      explorerUrl:
        `https://sepolia.etherscan.io/tx/${event.transactionHash}`,
    };


    switch (name) {

      case "AgreementCreated":
        events.push({
          ...base,

          category:
            "Agreement",

          title:
            "Agreement Created",

          description:
            `Agreement #${agreementId} was created as a Draft.`,

          actor:
            getActor(
              args.shipper
            ),

          details: {
            "Initial Escrow":
                formatEthWithMyr(
                    ethers.formatEther(
                    args.escrowAmount
                    )
                ),

            "Initial Deadline":
              new Date(
                Number(
                  args.deadline
                ) * 1000
              ).toLocaleString(),
          },
        });
        break;


      case "DraftAgreementUpdated":
        events.push({
          ...base,

          category:
            "Agreement",

          title:
            "Draft Updated",

          description:
            "The Shipper updated the Draft agreement.",

          actor:
            getActor(
              args.shipper
            ),

          details: {},
        });
        break;


      case "MilestonesCreated":
        events.push({
          ...base,

          category:
            "Milestone",

          title:
            "Milestone Schedule Created",

          description:
            `${Number(
              args.count
            )} contractual milestone(s) were created.`,

          actor: {
            name:
              "Smart Contract",
            role:
              "MilestoneManager",
            address: null,
          },

          details: {
            "Milestone Count":
              Number(args.count),
          },
        });
        break;


      case "EscrowFunded":
        events.push({
          ...base,

          category:
            "Escrow",

          title:
            "Escrow Funded",

          description:
            "ETH was deposited into the agreement escrow.",

          actor: {
            name:
              "Shipper",
            role:
              "Funding Transaction",
            address: null,
          },

          details: {
            "Amount Funded":
                formatEthWithMyr(
                    ethers.formatEther(
                    args.amount
                    )
                ),
          },
        });
        break;


      case "AgreementCompletionRewardSet":
        events.push({
          ...base,

          category:
            "AGRI",

          title:
            "Completion Reward Locked In",

          description:
            "The AGRI completion reward for this agreement was recorded.",

          actor: {
            name:
              "Smart Contract",
            role:
              "AgreementManager",
            address: null,
          },

          details: {
            "AGRI Reward":
              `${ethers.formatUnits(
                args.amount,
                18
              )} AGRI`,
          },
        });
        break;


      case "AgreementPosted":
        events.push({
          ...base,

          category:
            "Agreement",

          title:
            "Agreement Posted",

          description:
            "The funded agreement became available to eligible Carriers.",

          actor:
            getActor(
              args.shipper
            ),

          details: {},
        });
        break;


      case "AgreementAccepted":
        events.push({
          ...base,

          category:
            "Agreement",

          title:
            "Carrier Accepted Agreement",

          description:
            "A Carrier accepted the agreement and transportation became Active.",

          actor:
            getActor(
              args.carrier
            ),

          details: {},
        });
        break;


      case "ProofSubmitted":
        events.push({
          ...base,

          category:
            "Proof",

          title:
            `Proof Submitted — Milestone ${
              Number(
                args.milestoneId
              ) + 1
            }`,

          description:
            "The Carrier submitted an IPFS proof CID for review.",

          actor: {
            name:
              "Assigned Carrier",
            role:
              "Carrier",
            address: null,
          },

          details: {
            "Milestone":
              Number(
                args.milestoneId
              ) + 1,

            "IPFS CID":
              args.cid,
          },
        });
        break;



      case "MilestoneApproved":
        events.push({
            ...base,

            category:
            "Milestone",

            title:
            `Milestone ${
                Number(
                args.milestoneId
                ) + 1
            } Approved & Payment Released`,

            description:
            "The designated approver accepted the proof and the corresponding escrow payment was automatically released to the Carrier.",

            actor:
            getActor(
                args.approver
            ),

            details: {
            "Milestone":
                Number(
                args.milestoneId
                ) + 1,

            "Payment Released":
                formatEthWithMyr(
                    ethers.formatEther(
                    args.paymentReleased
                    )
                ),
            },
        });

        break;


      case "MilestoneRejected":
        events.push({
          ...base,

          category:
            "Milestone",

          title:
            `Milestone ${
              Number(
                args.milestoneId
              ) + 1
            } Rejected`,

          description:
            "The designated approver rejected the submitted proof.",

          actor:
            getActor(
              args.approver
            ),

          details: {
            "Milestone":
              Number(
                args.milestoneId
              ) + 1,
          },
        });
        break;




      case "AgreementCompleted":
        events.push({
          ...base,

          category:
            "Agreement",

          title:
            "Agreement Completed",

          description:
            "All milestones were approved and the agreement was completed.",

          actor: {
            name:
              "Smart Contract",
            role:
              "AgreementManager",
            address: null,
          },

          details: {},
        });
        break;


      case "AgreementCancelled":
        events.push({
          ...base,

          category:
            "Agreement",

          title:
            "Agreement Cancelled",

          description:
            "The Shipper cancelled the agreement.",

          actor:
            getActor(
              args.shipper
            ),

          details: {},
        });
        break;


      case "AgreementExpired":
        events.push({
          ...base,

          category:
            "Agreement",

          title:
            "Agreement Expired",

          description:
            "The agreement deadline was processed as an expiry.",

          actor: {
            name:
              "Smart Contract",
            role:
              "AgreementManager",
            address: null,
          },

          details: {},
        });
        break;


      case "AgreementFailed":
        events.push({
          ...base,

          category:
            "Failure",

          title:
            "Agreement Failed",

          description:
            "The agreement was marked Failed and Carrier stake penalties were processed.",

          actor:
            getActor(
              args.carrier
            ),

          details: {
            "Stake Burned":
              `${ethers.formatUnits(
                args.stakeBurned,
                18
              )} AGRI`,
          },
        });
        break;


      case "EscrowRefunded":
        events.push({
          ...base,

          category:
            "Escrow",

          title:
            "Remaining Escrow Refunded",

          description:
            "Remaining ETH was returned to the Shipper.",

          actor:
            getActor(
              args.shipper
            ),

          details: {
            "Refund":
                formatEthWithMyr(
                    ethers.formatEther(
                    args.amount
                    )
                ),
          },
        });
        break;


      case "DraftEscrowRefunded":
        events.push({
          ...base,

          category:
            "Escrow",

          title:
            "Draft Escrow Refunded",

          description:
            "Draft funding was reset and returned to the Shipper.",

          actor:
            getActor(
              args.shipper
            ),

          details: {
            "Refund":
                formatEthWithMyr(
                    ethers.formatEther(
                    args.amount
                    )
                ),
          },
        });
        break;


      case "UnusedStakeWithdrawn":
        events.push({
          ...base,

          category:
            "AGRI",

          title:
            "Unused Stake Withdrawn",

          description:
            "An unassigned Carrier withdrew AGRI previously staked on the agreement.",

          actor:
            getActor(
              args.carrier
            ),

          details: {
            "AGRI Returned":
              `${ethers.formatUnits(
                args.amount,
                18
              )} AGRI`,
          },
        });
        break;


      default:
        // Intentionally skip
        // configuration events and
        // unrelated contract events.
        break;
    }
  }


  events.sort(
    (a, b) =>
      a.blockNumber -
        b.blockNumber ||
      a.logIndex -
        b.logIndex
  );


  return {
    events,

    scannedFromBlock:
      fromBlock,

    scannedToBlock:
      latestBlock,

    eventCount:
      events.length,
  };
}


export async function getUserTransactionHistory() {
  const address =
    await getConnectedAddress();

  const wallet =
    address.toLowerCase();

  const currentUser =
    await getCurrentUser();

  const roleNumber =
    Number(
      currentUser.role ??
      currentUser[1] ??
      0
    );

  const overview =
    await getDashboardOverview();

  const relevantAgreements = [];

  for (
    const agreement
    of overview.agreements
  ) {
    let include = false;

    // Shipper
    if (
      roleNumber === 1 &&
      agreement.shipper
        ?.toLowerCase() === wallet
    ) {
      include = true;
    }

    // Carrier
    if (
      roleNumber === 2 &&
      agreement.carrier
        ?.toLowerCase() === wallet
    ) {
      include = true;
    }

    // Warehouse / Customs
    if (
      roleNumber === 3 ||
      roleNumber === 4
    ) {
      const milestones =
        await getMilestones(
          agreement.id
        );

      include =
        milestones.some(
          milestone =>
            milestone.approver
              ?.toLowerCase() ===
            wallet
        );
    }

    if (include) {
      relevantAgreements.push(
        agreement
      );
    }
  }


  const groups =
    await Promise.all(
      relevantAgreements.map(
        async agreement => {
          const audit =
            await getAgreementAuditTrail(
              agreement.id
            );

          return {
            agreement,
            events:
              audit.events,
          };
        }
      )
    );


  const transactions =
    groups.flatMap(
      group =>
        group.events.map(
          event => ({
            ...event,

            agreementId:
              group.agreement.id,

            product:
              group.agreement.product,

            agreementStatus:
              group.agreement.status,
          })
        )
    );


  transactions.sort(
    (a, b) =>
      b.blockNumber -
        a.blockNumber ||
      b.logIndex -
        a.logIndex
  );


  return {
    transactions,

    agreementCount:
      relevantAgreements.length,

    transactionCount:
      transactions.length,

    role:
      getRoleName(
        roleNumber
      ),
  };
}


function formatAuditTime(timestamp) {
  return new Date(
    Number(timestamp) * 1000
  ).toLocaleString(
    "en-US",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }
  );
}




export async function processExpiredAgreement(
  agreementId
) {
  await ensureSepolia();

  const contract =
    await getAgreementManager();

  const tx =
    await contract.processExpiredAgreement(
      agreementId
    );

  const receipt =
    await tx.wait();

  return {
    transactionHash:
      receipt.hash,
  };
}


export async function carrierAbandonAgreement(
  agreementId
) {
  await ensureSepolia();

  const contract =
    await getAgreementManager();

  const tx =
    await contract.carrierAbandonAgreement(
      agreementId
    );

  const receipt =
    await tx.wait();

  return {
    transactionHash:
      receipt.hash,
  };
}


export async function cancelAgreement(
  agreementId
) {
  await ensureSepolia();

  const contract =
    await getAgreementManager();

  const tx =
    await contract.cancelAgreement(
      agreementId
    );

  const receipt =
    await tx.wait();

  return {
    transactionHash:
      receipt.hash,
  };
}


export async function withdrawUnusedStake(
  agreementId
) {
  await ensureSepolia();

  const contract =
    await getAgreementManager();

  const tx =
    await contract.withdrawUnusedStake(
      agreementId
    );

  const receipt =
    await tx.wait();

  return {
    transactionHash:
      receipt.hash,
  };
}



export async function getAgreementStake(
  agreementId,
  carrierAddress
) {
  await ensureSepolia();

  const token =
    await getAGRIToken();

  const stake =
    await token.getStake(
      agreementId,
      carrierAddress
    );

  return stake;
}


export async function stakeRequiredTokens(
  agreementId
) {
  await ensureSepolia();

  const agreementManager =
    await getAgreementManager();

  const token =
    await getAGRIToken();

  const carrier =
    await getConnectedAddress();

  const agreement =
    await agreementManager.getAgreement(
      agreementId
    );

  const requiredStake =
    BigInt(
      agreement.minimumStake
    );

  const currentStake =
    await token.getStake(
      agreementId,
      carrier
    );


  // No stake required
  if (requiredStake === 0n) {
    return {
      transactionHash: null,
      amountStaked: 0n,
      alreadySatisfied: true,
    };
  }


  // Carrier already satisfies requirement
  if (
    currentStake >=
    requiredStake
  ) {
    return {
      transactionHash: null,
      amountStaked: 0n,
      alreadySatisfied: true,
    };
  }


  // Only stake the missing amount
  const missingStake =
    requiredStake -
    currentStake;

  const tx =
    await token.stakeTokens(
      agreementId,
      missingStake
    );

  const receipt =
    await tx.wait();

  return {
    transactionHash:
      receipt.hash,

    amountStaked:
      missingStake,

    alreadySatisfied: false,
  };
}


export async function getStakeRequirement(
  agreementId,
  carrierAddress
) {
  await ensureSepolia();

  const manager =
    await getAgreementManager();

  const token =
    await getAGRIToken();

  const agreement =
    await manager.getAgreement(
      agreementId
    );

  const requiredStake =
    BigInt(
      agreement.minimumStake
    );

  const currentStake =
    await token.getStake(
      agreementId,
      carrierAddress
    );

  const availableBalance =
    await token.balanceOf(
      carrierAddress
    );

  const missingStake =
    currentStake >= requiredStake
      ? 0n
      : requiredStake -
        currentStake;

  return {
    requiredStake,
    currentStake,
    availableBalance,
    missingStake,

    satisfied:
      currentStake >=
      requiredStake,

    hasEnoughBalance:
      availableBalance >=
      missingStake,
  };
}


export async function updateDraftAgreement(
  agreementId,
    {
    product,
    quantity,
    unitOfMeasurement,
    origin,
    destination,
    escrowEth,
    deadline,
    minimumStakeAgri = "0",
    templateId = 0,
    }
) {
  await ensureSepolia();

  const contract =
    await getAgreementManager();

  const escrowAmount =
    ethers.parseEther(
      String(escrowEth)
    );

  const deadlineTimestamp =
    Math.floor(
      new Date(deadline).getTime() /
        1000
    );

  if (
    !deadlineTimestamp ||
    deadlineTimestamp <=
      Math.floor(Date.now() / 1000)
  ) {
    throw new Error(
      "Deadline must be in the future."
    );
  }

  const minimumStake =
    ethers.parseUnits(
      String(
        minimumStakeAgri || "0"
      ),
      18
    );

  const details = [
    product,
    BigInt(quantity),
    unitOfMeasurement,
    origin,
    destination,
    escrowAmount,
    BigInt(deadlineTimestamp),

    BigInt(templateId),

    minimumStake,
  ];

  const tx =
    await contract.updateDraftAgreement(
      agreementId,
      details
    );

  const receipt =
    await tx.wait();

  return {
    receipt,
    transactionHash:
      receipt.hash,
  };
}


export async function getDraftAgreementForEdit(
  agreementId
) {
  await ensureSepolia();

  const contract =
    await getAgreementManager();

  const agreement =
    await contract.getAgreement(
      agreementId
    );

  const statusNumber =
    Number(agreement.status);

  if (statusNumber !== 0) {
    throw new Error(
      "Only Draft agreements can be edited."
    );
  }

  return {
    id: Number(agreement.id),

    product:
      agreement.product,

    quantity:
      agreement.quantity.toString(),

    unitOfMeasurement:
      agreement.unitOfMeasurement,

    origin:
      agreement.origin,

    destination:
      agreement.destination,

    escrowEth:
      ethers.formatEther(
        agreement.escrowAmount
      ),

    deadlineTimestamp:
      Number(agreement.deadline),

    templateId:
      Number(agreement.templateId),

    minimumStakeAgri:
      ethers.formatUnits(
        agreement.minimumStake,
        18
      ),
  };
}

export async function getAgreementTemplates() {
  await ensureSepolia();

  const contract =
    await getAgreementManager();

  const nextId =
    Number(
      await contract.nextTemplateId()
    );

  const templates = [];

  for (
    let templateId = 1;
    templateId < nextId;
    templateId++
  ) {
    try {
      const template =
        await contract.getAgreementTemplate(
          templateId
        );

      if (!template.active) {
        continue;
      }

      templates.push({
        id:
          Number(template.id),

        creator:
          template.creator,

        name:
          template.name,

        product:
          template.product,

        unitOfMeasurement:
          template.unitOfMeasurement,

        origin:
          template.origin,

        destination:
          template.destination,

        minimumStakeAgri:
          ethers.formatUnits(
            template.minimumStake,
            18
          ),
      });

    } catch {
      // Skip unavailable template IDs.
    }
  }

  return templates;
}


export async function createAgreementTemplate({
  name,
  product,
  unitOfMeasurement,
  origin,
  destination,
  minimumStakeAgri = "0",
}) {
  await ensureSepolia();

  const contract =
    await getAgreementManager();

  const minimumStake =
    ethers.parseUnits(
      String(
        minimumStakeAgri || "0"
      ),
      18
    );

  const tx =
    await contract.createTemplate(
      name,
      product,
      unitOfMeasurement,
      origin,
      destination,
      minimumStake
    );

  const receipt =
    await tx.wait();

  let templateId = null;

  for (const log of receipt.logs) {
    try {
      const parsed =
        contract.interface.parseLog(
          log
        );

      if (
        parsed?.name ===
        "AgreementTemplateCreated"
      ) {
        templateId =
          Number(
            parsed.args.templateId
          );

        break;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  return {
    receipt,
    templateId,
    transactionHash:
      receipt.hash,
  };
}




export async function getAgriTotalSupply() {
  await ensureSepolia();

  const agreementManager =
    await getAgreementManager();

  const agriTokenAddress =
    await agreementManager.agriToken();

  if (
    !agriTokenAddress ||
    agriTokenAddress ===
      ethers.ZeroAddress
  ) {
    return "0";
  }

  const provider =
    await getProvider();

  const token =
    new ethers.Contract(
      agriTokenAddress,
      [
        "function totalSupply() view returns (uint256)",
        "function decimals() view returns (uint8)",
      ],
      provider
    );

  const [
    totalSupply,
    decimals,
  ] = await Promise.all([
    token.totalSupply(),
    token.decimals(),
  ]);

  const formatted =
    ethers.formatUnits(
      totalSupply,
      decimals
    );

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 2,
    }
  ).format(
    Number(formatted)
  );
}
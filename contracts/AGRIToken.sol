// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


interface IAgreementManagerForToken {
    function canStakeOnAgreement(
        uint256 agreementId,
        address carrier
    ) external view returns (bool);
}

contract AGRIToken is ERC20, Ownable {

    address public agreementManager;

    mapping(uint256 => mapping(address => uint256)) private stakes;

    event CarrierRewarded(
        uint256 indexed agreementId,
        address indexed carrier,
        uint256 amount,
        uint256 timestamp
    );

    event TokensStaked(
        uint256 indexed agreementId,
        address indexed carrier,
        uint256 amount,
        uint256 timestamp
    );

    event StakeReleased(
        uint256 indexed agreementId,
        address indexed carrier,
        uint256 amount,
        uint256 timestamp
    );

    event StakeBurned(
        uint256 indexed agreementId,
        address indexed carrier,
        uint256 amount,
        uint256 timestamp
    );


    constructor()
        ERC20("AGRI Token", "AGRI")
        Ownable(msg.sender)
    {}


    modifier onlyAgreementManager() {
        require(
            msg.sender == agreementManager,
            "Only AgreementManager"
        );
        _;
    }


    function setAgreementManager(address manager)
        external
        onlyOwner
    {
        require(manager != address(0), "Invalid address");
        require(
            manager.code.length > 0,
            "AgreementManager address has no contract"
        );
        agreementManager = manager;
    }

    function rewardCarrier(
        uint256 agreementId,
        address carrier,
        uint256 amount
    )
        external
        onlyAgreementManager
    {
        require(carrier != address(0), "Invalid carrier");
        require(amount > 0, "Amount must be greater than zero");

        _mint(carrier, amount);

        emit CarrierRewarded(
            agreementId,
            carrier,
            amount,
            block.timestamp
        );
    }

    function stakeTokens(
        uint256 agreementId,
        uint256 amount
    )
        external
    {
        require(
            agreementManager != address(0),
            "AgreementManager not configured"
        );
        require(
            amount > 0,
            "Amount must be greater than zero"
        );

        require(
            IAgreementManagerForToken(
                agreementManager
            ).canStakeOnAgreement(
                agreementId,
                msg.sender
            ),
            "Agreement is not available for staking"
        );

        _transfer(
            msg.sender,
            address(this),
            amount
        );

        stakes[agreementId][msg.sender] += amount;

        emit TokensStaked(
            agreementId,
            msg.sender,
            amount,
            block.timestamp
        );
    }

    function getStake(
        uint256 agreementId,
        address carrier
    )
        external
        view
        returns (uint256)
    {
        return stakes[agreementId][carrier];
    }

    function releaseStake(
        uint256 agreementId,
        address carrier
    )
        external
        onlyAgreementManager
    {
        uint256 amount = stakes[agreementId][carrier];

        require(amount > 0, "No stake to release");

        stakes[agreementId][carrier] = 0;

        _transfer(address(this), carrier, amount);

        emit StakeReleased(
            agreementId,
            carrier,
            amount,
            block.timestamp
        );
    }


    function burnStake(
        uint256 agreementId,
        address carrier,
        uint256 amount
    )
        external
        onlyAgreementManager
    {
        uint256 currentStake =
            stakes[agreementId][carrier];

        require(amount > 0, "Amount must be greater than zero");
        require(
            currentStake >= amount,
            "Insufficient staked amount"
        );

        stakes[agreementId][carrier] -= amount;

        _burn(address(this), amount);

        emit StakeBurned(
            agreementId,
            carrier,
            amount,
            block.timestamp
        );
    }
}
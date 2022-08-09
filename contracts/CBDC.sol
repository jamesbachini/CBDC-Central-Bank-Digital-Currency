// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/*
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
░░█████╗░██████╗░██████╗░░█████╗░░
░██╔══██╗██╔══██╗██╔══██╗██╔══██╗░
░██║░░╚═╝██████╦╝██║░░██║██║░░╚═╝░
░██║░░██╗██╔══██╗██║░░██║██║░░██╗░
░░█████╔╝██████╦╝██████╔╝░█████╔╝░
░░╚════╝░╚═════╝░╚═════╝░░╚════╝░░
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 

  Central Bank Digital Currency
 
  ERC20 token design for a CBDC complete with vesting/voting
  mechanism, sanctions on addresses, inflationary treasury
  bond staking.

  @title CBDC | Central Bank Digital Currency
  @author James Bachini
  @dev Untested, not suitable for financial transactions
*/

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CBDC is ERC20 {

    address public controllingParty;
    uint256 maxSupply = 5.5e12 ether; // US M0 Money Supply
    uint256 maxInflationBasisPoints = 500; // 5%
    uint256 interestRateBasisPoints = 250; // 2.5%
    uint256 lastSupplyIncrease = block.timestamp;
    uint256 constant electionPeriod = 1.261e8; // 4 years
    uint256 constant timeToVote = 2.628e6; // 1 month
    uint256 lastElectionTS = 0; // block.timestamp;
    string constant unfortunateTruth = "Two party politics is not a choice";
    mapping (address => bool) private blacklist;
    mapping(address => uint256) public stakedTreasuryBond;
    mapping(address => uint256) private stakedFromTS;
    uint256 public electionStartTS;
    address[] public candidates;
    mapping (address => uint256) public votes;
    mapping (address => uint256) public vested;
    event CallElection(uint256 timestamp);
    event VestAndVote(uint256 amount, address candidate);
    event CloseElection(uint256 timestamp);
    event UpdateBlacklist(address _criminal, bool _blocked);
    event IncreaseMoneySupply(uint256 amount, uint256 timestamp);
    event AdjustInterestRates(uint256 rate);
    event StakeTreasuryBonds(address user, uint256 amount);
    event UnstakeTreasuryBonds(address user, uint256 amount);
    event ClaimTreasuryBonds(address user, uint256 amount);
    
    constructor() ERC20("Central Bank Digital Currency", "CBDC") {
        controllingParty = msg.sender;
        _mint(msg.sender, maxSupply);
    }

    /* CBDC will need a voting system to elect a controlling party */
    function callElection() external {
        require(block.timestamp > lastElectionTS + electionPeriod, "Too early to call election");
        electionStartTS = block.timestamp;
        for (uint256 i = 0; i < candidates.length; i++) { // unbounded loop
            votes[candidates[i]] = 0;
        }
        delete candidates;
        emit CallElection(electionStartTS);
    }

    function vestAndVote(uint256 _amount, address _candidate) external {
        require(_amount > 0, "Amount is !> 0");
        require(balanceOf(msg.sender) >= _amount, "Your balance is too low");
        _transfer(msg.sender, address(this), _amount);
        require(candidates.length < 1000, "Too many candidates");
        if (votes[_candidate] == 0) candidates.push(_candidate);
        votes[_candidate] += _amount;
        vested[msg.sender] += _amount;
        emit VestAndVote(_amount, _candidate);
    }

    function closeElection() external {
        require(block.timestamp > electionStartTS + timeToVote, "Too early to close election");
        address electionLeader;
        uint256 leadingVotes;
        for (uint256 i = 0; i < candidates.length; i++) { // unbounded loop
            if (votes[candidates[i]] > leadingVotes) {
                electionLeader = candidates[i];
                leadingVotes = votes[candidates[i]];
            }
        }
        controllingParty = electionLeader;
        lastElectionTS = block.timestamp;
        emit CloseElection(lastElectionTS);
    }

    function unvest() external {
        require(block.timestamp > electionStartTS + timeToVote, "Too early to unvest");
        require(block.timestamp < lastElectionTS + electionPeriod, "Election has not closed yet");
        _transfer(address(this), msg.sender, vested[msg.sender]);
        vested[msg.sender] = 0;
    }

    /* CBDC will need a way to sanction or blacklist addresses */
    function updateBlacklist(address _criminal, bool _blocked) external {
        require(msg.sender == controllingParty, "Not authorized to update blacklist");
        blacklist[_criminal] = _blocked;
        emit UpdateBlacklist(_criminal, _blocked);
    }

    function _transfer(address from, address to, uint256 amount) internal virtual override {
        require(blacklist[from] == false, "Sender address is blacklisted");
        require(blacklist[to] == false, "Recipient address is blacklisted");
        super._transfer(from, to, amount);
    }

    /* CBDC will need a way to expand the money supply including treasury bond staking */
    function increaseMoneySupply() external {
        require(msg.sender == controllingParty, "Not authorized to update increase supply");
        uint256 inflationCapacity = (block.timestamp - lastSupplyIncrease) * maxSupply * maxInflationBasisPoints / 10000 / 3.154e7;
        maxSupply += inflationCapacity;
        lastSupplyIncrease = block.timestamp;
        uint256 capitalAvailable = maxSupply - totalSupply();
        _mint(msg.sender, capitalAvailable);
        emit IncreaseMoneySupply(capitalAvailable, lastSupplyIncrease);
    }

    function stakeTreasuryBonds(uint256 _amount) external {
        require(_amount > 0, "amount is <= 0");
        require(balanceOf(msg.sender) >= _amount, "balance is <= amount");
        _transfer(msg.sender, address(this), _amount);
        if (stakedTreasuryBond[msg.sender] > 0) claimTreasuryBonds();
        stakedFromTS[msg.sender] = block.timestamp;
        stakedTreasuryBond[msg.sender] += _amount;
        emit StakeTreasuryBonds(msg.sender, _amount);
    }

    function unstakeTreasuryBonds(uint256 _amount) external {
        require(_amount > 0, "amount is <= 0");
        require(stakedTreasuryBond[msg.sender] >= _amount, "amount is > staked");
        claimTreasuryBonds();
        stakedTreasuryBond[msg.sender] -= _amount;
        _transfer(address(this), msg.sender, _amount);
        emit UnstakeTreasuryBonds(msg.sender, _amount);
    }

    function claimTreasuryBonds() public {
        require(stakedTreasuryBond[msg.sender] > 0, "staked is <= 0");
        uint256 secondsStaked = block.timestamp - stakedFromTS[msg.sender];
        uint256 rewards = stakedTreasuryBond[msg.sender] * secondsStaked * interestRateBasisPoints / 10000 / 3.154e7;
        stakedFromTS[msg.sender] = block.timestamp;
        _mint(msg.sender, rewards);
        emit ClaimTreasuryBonds(msg.sender, rewards);
    }

    function adjustInterestRates(uint256 _newInterestRate) external {
        require(msg.sender == controllingParty, "Not authorized to update interest rate");
        interestRateBasisPoints = _newInterestRate;
        emit AdjustInterestRates(interestRateBasisPoints);
    }
}
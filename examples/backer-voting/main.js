import {
  createPublicClient,
  encodeFunctionData,
  getAddress,
  http,
  isAddress,
  defineChain,
} from 'viem';
import { onWalletChange, sendTransactions } from './miniapp-sdk.js';

/* ── Gnosis Chain Definition ─────────────────────────────────────── */

const gnosis = defineChain({
  id: 100,
  name: 'Gnosis',
  nativeCurrency: { name: 'xDai', symbol: 'XDAI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.aboutcircles.com/'] },
    public: { http: ['https://rpc.aboutcircles.com/'] },
  },
  blockExplorers: {
    default: { name: 'Gnosisscan', url: 'https://gnosisscan.io' },
  },
});

/* ── Config ──────────────────────────────────────────────────────── */

const RPC_URL = 'https://rpc.aboutcircles.com/';
const ENVIO_INDEXER_URL = 'https://gnosis-e702590.dedicated.hyperindex.xyz/v1/graphql';

// Contract addresses (deployed on Gnosis Chain)
// v6: ERC20 pattern - direct contract calls
const GROUP_TOKEN_ADDRESS = getAddress('0xeeF7B1f06B092625228C835Dd5D5B14641D1e54A');
const BACKER_VOTING_ADDRESS = getAddress('0x83FC1c9f5190dD4c862405EBE6418a81a04c17dC');

// Costs (1 token with 18 decimals)
const PROPOSAL_COST = 1000000000000000000n;  // 1e18
const VOTE_COST = 1000000000000000000n;      // 1e18

// Zero bytes32 for placeholder IPFS CID
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

// Base URL for API
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

/* ── ABIs ────────────────────────────────────────────────────────── */

const BACKER_VOTING_ABI = [
  {
    type: 'function',
    name: 'proposalCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'getProposal',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'ipfsCid', type: 'bytes32' },
      { name: 'deadline', type: 'uint256' },
      { name: 'quorum', type: 'uint256' },
      { name: 'yesVotes', type: 'uint256' },
      { name: 'noVotes', type: 'uint256' },
      { name: 'active', type: 'bool' }
    ]
  },
  {
    type: 'function',
    name: 'hasVotedOn',
    stateMutability: 'view',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'voter', type: 'address' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'getProposalStatus',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'passed', type: 'bool' },
      { name: 'quorumReached', type: 'bool' },
      { name: 'majorityYes', type: 'bool' }
    ]
  },
  {
    type: 'function',
    name: 'createProposal',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'ipfsCid', type: 'bytes32' },
      { name: 'duration', type: 'uint256' },
      { name: 'quorum', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'vote',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'bool' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'PROPOSAL_COST',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'VOTE_COST',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'GROUP_TOKEN',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  }
];

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'transferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  }
];

/* ── State ───────────────────────────────────────────────────────── */

let userType = 'neither';
let connectedAddress = null;
let proposals = [];
let lastTxHashes = [];

const publicClient = createPublicClient({
  chain: gnosis,
  transport: http(RPC_URL),
});

/* ── DOM Elements ────────────────────────────────────────────────── */

const badge = document.getElementById('badge');
const resultEl = document.getElementById('result');
const loginSection = document.getElementById('login-section');
const nonBackerSection = document.getElementById('non-backer-section');
const indirectBackerSection = document.getElementById('indirect-backer-section');
const backerSection = document.getElementById('backer-section');
const readonlyProposalsEl = document.getElementById('readonly-proposals');
const activeProposalsEl = document.getElementById('active-proposals');
const completedProposalsEl = document.getElementById('completed-proposals');
const indirectActiveProposalsEl = document.getElementById('indirect-active-proposals');
const indirectCompletedProposalsEl = document.getElementById('indirect-completed-proposals');
const proposalTitleInput = document.getElementById('proposal-title');
const proposalDescInput = document.getElementById('proposal-description');
const proposalDurationInput = document.getElementById('proposal-duration');
const createProposalBtn = document.getElementById('create-proposal-btn');

// Modal elements
const proposalModal = document.getElementById('proposal-modal');
const modalCloseBtn = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');

/* ── Helpers ─────────────────────────────────────────────────────── */

function showResult(type, html) {
  resultEl.className = `result result-${type}`;
  resultEl.innerHTML = html;
  resultEl.classList.remove('hidden');
}

function hideResult() {
  resultEl.classList.add('hidden');
}

function setStatus(text, type) {
  badge.textContent = text;
  badge.className = `badge badge-${type}`;
}

function decodeError(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.shortMessage) return err.shortMessage;
  if (err.message) return err.message;
  return String(err);
}

function truncAddr(a) {
  if (!a) return '';
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/\&/g, '\x26amp;')
    .replace(/</g, '\x26lt;')
    .replace(/>/g, '\x26gt;')
    .replace(/"/g, '\x26quot;')
    .replace(/'/g, '\x26#39;');
}

function toHexValue(value) {
  return value ? `0x${BigInt(value).toString(16)}` : '0x0';
}

function formatTxForHost(tx) {
  return {
    to: tx.to,
    data: tx.data || '0x',
    value: toHexValue(tx.value || 0n),
  };
}

function formatTimeRemaining(deadline) {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Number(deadline) - now;
  
  if (remaining <= 0) return 'Ended';
  if (remaining < 60) return `${remaining}s remaining`;
  if (remaining < 3600) return `${Math.floor(remaining / 60)}m remaining`;
  if (remaining < 86400) return `${Math.floor(remaining / 3600)}h remaining`;
  return `${Math.floor(remaining / 86400)}d remaining`;
}

function calculateVotePercentage(yesVotes, noVotes) {
  const total = Number(yesVotes) + Number(noVotes);
  if (total === 0) return 50;
  return (Number(yesVotes) / total) * 100;
}

/* ── IPFS Helpers ────────────────────────────────────────────────── */

function cidToBytes32(cid) {
  const encoder = new TextEncoder();
  const data = encoder.encode(cid);
  const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
  return '0x' + hex.slice(0, 64).padEnd(64, '0');
}

async function uploadToIPFS(title, description, creator) {
  try {
    const response = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, creator })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
    
    const result = await response.json();
    return result.cid;
  } catch (err) {
    console.error('[uploadToIPFS] Failed:', err);
    throw err;
  }
}

async function fetchFromIPFS(cid) {
  try {
    const response = await fetch(`${API_BASE}/api/fetch?cid=${cid}`);
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    return result.data;
  } catch (err) {
    console.error('[fetchFromIPFS] Failed:', err);
    return null;
  }
}

/* ── Backer Status Check ─────────────────────────────────────────── */

async function checkBackerStatus(address) {
  console.log('[checkBackerStatus] Input address:', address);
  
  if (!address || !isAddress(address)) {
    console.log('[checkBackerStatus] Invalid address');
    return 'neither';
  }
  
  try {
    const checksummedAddress = getAddress(address);
    console.log('[checkBackerStatus] Querying with checksummed:', checksummedAddress);
    
    const query = `
      query IsBacker($address: String!) {
        Avatar(
          where: { 
            id: { _eq: $address }, 
            avatarType: { _eq: "RegisterHuman" } 
          }
          limit: 1
        ) {
          id
          verificationBadge
          profile { name }
        }
      }
    `;
    
    const body = JSON.stringify({
      query,
      variables: { address: checksummedAddress }
    });
    
    const response = await fetch(ENVIO_INDEXER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    
    const data = await response.json();
    console.log('[checkBackerStatus] Response:', JSON.stringify(data, null, 2));
    
    if (data.errors) {
      console.warn('[checkBackerStatus] Indexer query errors:', data.errors);
      return 'neither';
    }
    
    const results = data?.data?.Avatar || [];
    
    if (results.length === 0) {
      console.log('[checkBackerStatus] No avatar found');
      return 'neither';
    }
    
    const badge = results[0].verificationBadge;
    console.log('[checkBackerStatus] verificationBadge:', badge);
    
    if (badge === 'VERIFIED') {
      return 'backer';
    }
    
    if (badge === 'QUASI_VERIFIED') {
      return 'indirect';
    }
    
    return 'neither';
  } catch (err) {
    console.error('[checkBackerStatus] Failed:', err);
    return 'neither';
  }
}

/* ── Proposal Loading ────────────────────────────────────────────── */

async function loadProposals() {
  try {
    const count = await publicClient.readContract({
      address: BACKER_VOTING_ADDRESS,
      abi: BACKER_VOTING_ABI,
      functionName: 'proposalCount',
    });
    
    const proposalCount = Number(count);
    proposals = [];
    
    for (let i = 1; i <= proposalCount; i++) {
      const proposal = await publicClient.readContract({
        address: BACKER_VOTING_ADDRESS,
        abi: BACKER_VOTING_ABI,
        functionName: 'getProposal',
        args: [BigInt(i)],
      });
      
      let hasVoted = false;
      if (connectedAddress) {
        hasVoted = await publicClient.readContract({
          address: BACKER_VOTING_ADDRESS,
          abi: BACKER_VOTING_ABI,
          functionName: 'hasVotedOn',
          args: [BigInt(i), connectedAddress],
        });
      }
      
      const status = await publicClient.readContract({
        address: BACKER_VOTING_ADDRESS,
        abi: BACKER_VOTING_ABI,
        functionName: 'getProposalStatus',
        args: [BigInt(i)],
      });
      
      const ipfsCidBytes32 = proposal[1];
      let proposalTitle = `Proposal #${i}`;
      let proposalDesc = `IPFS: ${ipfsCidBytes32}`;
      
      try {
        const hexStr = ipfsCidBytes32.slice(2);
        const cidBytes = new Uint8Array(hexStr.match(/.{2}/g).map(byte => parseInt(byte, 16)));
        const cidStr = new TextDecoder().decode(cidBytes).replace(/\0/g, '');
        
        if (cidStr && cidStr.length > 0 && cidStr !== ZERO_BYTES32) {
          const ipfsContent = await fetchFromIPFS(cidStr);
          if (ipfsContent) {
            proposalTitle = ipfsContent.title || proposalTitle;
            proposalDesc = ipfsContent.description || '';
          }
        }
      } catch (e) {
        console.warn('[loadProposals] IPFS fetch failed for proposal', i, e);
      }
      
      proposals.push({
        id: i,
        title: proposalTitle,
        description: proposalDesc,
        ipfsCid: proposal[1],
        deadline: proposal[2],
        quorum: proposal[3],
        yesVotes: proposal[4],
        noVotes: proposal[5],
        creator: proposal[0],
        active: proposal[6],
        passed: status[0],
        quorumReached: status[1],
        majorityYes: status[2],
        hasVoted,
      });
    }
    
    renderProposals();
  } catch (err) {
    console.error('Failed to load proposals:', err);
    const errorMsg = decodeError(err);
    activeProposalsEl.innerHTML = `<p class="muted">Error loading proposals: ${errorMsg}</p>`;
    completedProposalsEl.innerHTML = '<p class="muted">No proposals.</p>';
    readonlyProposalsEl.innerHTML = `<p class="muted">Error: ${errorMsg}</p>`;
  }
}

function renderProposals() {
  const active = proposals.filter(p => p.active);
  const completed = proposals.filter(p => !p.active);
  const canVote = userType === 'backer' || userType === 'indirect';
  
  if (active.length === 0) {
    activeProposalsEl.innerHTML = '<p class="muted">No active proposals.</p>';
  } else {
    activeProposalsEl.innerHTML = active.map(p => renderProposalCard(p, canVote)).join('');
    attachVoteHandlers();
  }
  
  if (completed.length === 0) {
    completedProposalsEl.innerHTML = '<p class="muted">No completed proposals yet.</p>';
  } else {
    completedProposalsEl.innerHTML = completed.map(p => renderProposalCard(p, false)).join('');
  }
  
  if (userType === 'indirect') {
    if (active.length === 0) {
      indirectActiveProposalsEl.innerHTML = '<p class="muted">No active proposals.</p>';
    } else {
      indirectActiveProposalsEl.innerHTML = active.map(p => renderProposalCard(p, true)).join('');
      attachVoteHandlers();
    }
    
    if (completed.length === 0) {
      indirectCompletedProposalsEl.innerHTML = '<p class="muted">No completed proposals yet.</p>';
    } else {
      indirectCompletedProposalsEl.innerHTML = completed.map(p => renderProposalCard(p, false)).join('');
    }
  }
  
  if (userType === 'neither') {
    readonlyProposalsEl.innerHTML = proposals.length === 0 
      ? '<p class="muted">No proposals yet.</p>'
      : proposals.map(p => renderProposalCard(p, false, true)).join('');
  }
  
  // Re-attach modal handlers for dynamically created proposal cards
  attachModalHandlers();
}

function renderProposalCard(proposal, canVote = false, readonly = false) {
  const votePercentage = calculateVotePercentage(proposal.yesVotes, proposal.noVotes);
  const statusClass = proposal.active ? 'status-active' : (proposal.passed ? 'status-passed' : 'status-failed');
  const statusText = proposal.active ? 'Active' : (proposal.passed ? 'Passed' : 'Failed');
  
  let actionsHtml = '';
  if (canVote && !readonly && proposal.active) {
    if (proposal.hasVoted) {
      actionsHtml = `<div class="already-voted">You voted ✅</div>`;
    } else {
      actionsHtml = `
        <button class="btn btn-success vote-btn" data-id="${proposal.id}" data-support="true">Vote YES (1 CRC)</button>
        <button class="btn btn-danger vote-btn" data-id="${proposal.id}" data-support="false">Vote NO (1 CRC)</button>
      `;
    }
  }
  
  return `
    <div class="proposal-card" data-id="${proposal.id}">
      <div class="proposal-header">
        <div>
          <div class="proposal-title">${escapeHtml(proposal.title)}</div>
          <div class="proposal-meta">
            Created by <span class="mono">${truncAddr(proposal.creator)}</span> · 
            ${formatTimeRemaining(proposal.deadline)}
          </div>
        </div>
        <span class="proposal-status ${statusClass}">${statusText}</span>
      </div>
      ${proposal.description ? `<div class="proposal-description">${escapeHtml(proposal.description)}</div>` : ''}
      <div class="proposal-votes">
        <span class="vote-count vote-count-yes">✅ Yes: ${proposal.yesVotes}</span>
        <span class="vote-count vote-count-no">❌ No: ${proposal.noVotes}</span>
      </div>
      <div class="vote-bar">
        <div class="vote-bar-fill" style="width: ${votePercentage}%"></div>
      </div>
      ${actionsHtml}
    </div>
  `;
}

function attachVoteHandlers() {
  document.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      vote(
        parseInt(btn.dataset.id),
        btn.dataset.support === 'true'
      );
    });
  });
}

/* ── Modal Functions ──────────────────────────────────────────────── */

function openProposalModal(proposalId) {
  const proposal = proposals.find(p => p.id === proposalId);
  if (!proposal) return;
  
  const votePercentage = calculateVotePercentage(proposal.yesVotes, proposal.noVotes);
  const canVote = userType === 'backer' || userType === 'indirect';
  const isOwnProposal = connectedAddress && proposal.creator.toLowerCase() === connectedAddress.toLowerCase();
  
  let actionsHtml = '';
  if (proposal.active && canVote && !isOwnProposal) {
    if (proposal.hasVoted) {
      actionsHtml = `<div class="modal-info">You have already voted on this proposal ✅</div>`;
    } else {
      actionsHtml = `
        <div class="modal-actions">
          <button class="btn btn-success" id="modal-vote-yes">Vote YES (1 CRC)</button>
          <button class="btn btn-danger" id="modal-vote-no">Vote NO (1 CRC)</button>
        </div>
      `;
    }
  } else if (!proposal.active) {
    actionsHtml = `<div class="modal-info">Voting has ended for this proposal</div>`;
  } else if (isOwnProposal) {
    actionsHtml = `<div class="modal-info">You cannot vote on your own proposal</div>`;
  }
  
  modalBody.innerHTML = `
    <div class="modal-proposal-header">
      <h2 class="modal-proposal-title">${escapeHtml(proposal.title)}</h2>
      <div class="modal-proposal-meta">
        Created by <a href="https://gnosisscan.io/address/${proposal.creator}" target="_blank">${truncAddr(proposal.creator)}</a> · 
        ${formatTimeRemaining(proposal.deadline)}
      </div>
    </div>
    
    ${proposal.description ? `
      <div class="modal-proposal-section">
        <h4>Description</h4>
        <div class="modal-proposal-description">${escapeHtml(proposal.description)}</div>
      </div>
    ` : ''}
    
    <div class="modal-proposal-section">
      <h4>Status</h4>
      <span class="proposal-status ${proposal.active ? 'status-active' : (proposal.passed ? 'status-passed' : 'status-failed')}">
        ${proposal.active ? 'Active' : (proposal.passed ? 'Passed' : 'Failed')}
      </span>
      ${proposal.quorumReached ? ' · Quorum reached' : ' · Quorum not reached'}
    </div>
    
    <div class="modal-proposal-stats">
      <div class="modal-stat">
        <div class="modal-stat-value">${proposal.yesVotes}</div>
        <div class="modal-stat-label">Yes Votes</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-value">${proposal.noVotes}</div>
        <div class="modal-stat-label">No Votes</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-value">${votePercentage.toFixed(1)}%</div>
        <div class="modal-stat-label">Yes Ratio</div>
      </div>
    </div>
    
    <div class="modal-vote-bar">
      <div class="modal-vote-bar-labels">
        <span class="modal-vote-yes">✅ Yes (${votePercentage.toFixed(1)}%)</span>
        <span class="modal-vote-no">❌ No (${(100 - votePercentage).toFixed(1)}%)</span>
      </div>
      <div class="vote-bar">
        <div class="vote-bar-fill" style="width: ${votePercentage}%"></div>
      </div>
    </div>
    
    ${actionsHtml}
  `;
  
  // Attach vote handlers if present
  const voteYesBtn = document.getElementById('modal-vote-yes');
  const voteNoBtn = document.getElementById('modal-vote-no');
  
  if (voteYesBtn) {
    voteYesBtn.addEventListener('click', () => {
      closeProposalModal();
      vote(proposalId, true);
    });
  }
  
  if (voteNoBtn) {
    voteNoBtn.addEventListener('click', () => {
      closeProposalModal();
      vote(proposalId, false);
    });
  }
  
  proposalModal.classList.remove('hidden');
}

function closeProposalModal() {
  proposalModal.classList.add('hidden');
}

function attachModalHandlers() {
  // Close modal on close button click
  modalCloseBtn.addEventListener('click', closeProposalModal);
  
  // Close modal on overlay click
  document.querySelector('.modal-overlay').addEventListener('click', closeProposalModal);
  
  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !proposalModal.classList.contains('hidden')) {
      closeProposalModal();
    }
  });
  
  // Attach click handlers to proposal cards
  document.querySelectorAll('.proposal-card').forEach(card => {
    card.addEventListener('click', () => {
      const proposalId = parseInt(card.dataset.id);
      openProposalModal(proposalId);
    });
  });
}

/* ── Create Proposal ─────────────────────────────────────────────── */

async function createProposal() {
  const title = proposalTitleInput.value.trim();
  const description = proposalDescInput.value.trim();
  const durationHours = parseInt(proposalDurationInput.value) || 24;
  
  if (!title) {
    showResult('error', 'Proposal title is required.');
    return;
  }
  
  if (!connectedAddress) {
    showResult('error', 'Connect your wallet first.');
    return;
  }
  
  if (userType !== 'backer') {
    showResult('error', 'Only full backers can create proposals.');
    return;
  }
  
  createProposalBtn.disabled = true;
  showResult('pending', 'Creating proposal...');
  
  try {
    lastTxHashes = [];
    
    // Check if user has Group CRC tokens (ERC20)
    const balance = await publicClient.readContract({
      address: GROUP_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [connectedAddress],
    });
    
    if (balance < PROPOSAL_COST) {
      showResult('error', `Insufficient Group CRC balance. You have ${balance} tokens, need ${PROPOSAL_COST}.`);
      createProposalBtn.disabled = false;
      return;
    }
    
    // Check if voting contract is approved for ERC20 transfers
    const allowance = await publicClient.readContract({
      address: GROUP_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [connectedAddress, BACKER_VOTING_ADDRESS],
    });
    
    // ERC4337: Send approval separately if needed
    if (allowance < PROPOSAL_COST) {
      showResult('pending', 'First, approving voting contract to transfer your Group CRC...');
      
      const approveTx = {
        to: GROUP_TOKEN_ADDRESS,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [BACKER_VOTING_ADDRESS, PROPOSAL_COST],
        }),
        value: 0n,
      };
      
      const approveHashes = await sendTransactions([formatTxForHost(approveTx)]);
      lastTxHashes = approveHashes;
      
      showResult('pending', `Approval sent! Now creating proposal...`);
      
      // Wait for state to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Upload proposal content to IPFS
    showResult('pending', 'Uploading proposal to IPFS...');
    const ipfsCidStr = await uploadToIPFS(title, description, connectedAddress);
    console.log('[createProposal] IPFS CID:', ipfsCidStr);
    
    const ipfsCid = cidToBytes32(ipfsCidStr);
    const durationSeconds = BigInt(durationHours * 3600);
    const quorum = 0n; // 0 = use DEFAULT_QUORUM
    
    showResult('pending', 'Creating proposal on-chain...');
    
    // Call createProposal directly on the voting contract
    const createTx = {
      to: BACKER_VOTING_ADDRESS,
      data: encodeFunctionData({
        abi: BACKER_VOTING_ABI,
        functionName: 'createProposal',
        args: [ipfsCid, durationSeconds, quorum],
      }),
      value: 0n,
    };
    
    const hashes = await sendTransactions([formatTxForHost(createTx)]);
    lastTxHashes = lastTxHashes.concat(hashes);
    
    showResult('success', `Proposal created! Transaction: <a href="https://gnosisscan.io/tx/${hashes[0]}" target="_blank">${truncAddr(hashes[0])}</a>`);
    
    // Clear form
    proposalTitleInput.value = '';
    proposalDescInput.value = '';
    proposalDurationInput.value = '24';
    
    await loadProposals();
  } catch (err) {
    showResult('error', `Failed to create proposal: ${decodeError(err)}`);
  } finally {
    createProposalBtn.disabled = false;
  }
}

/* ── Vote ────────────────────────────────────────────────────────── */

async function vote(proposalId, support) {
  if (!connectedAddress) {
    showResult('error', 'Connect your wallet first.');
    return;
  }
  
  if (userType === 'neither') {
    showResult('error', 'Only backers and indirect backers can vote.');
    return;
  }
  
  const voteBtns = document.querySelectorAll(`.vote-btn[data-id="${proposalId}"]`);
  voteBtns.forEach(btn => btn.disabled = true);
  
  showResult('pending', `Submitting your ${support ? 'YES' : 'NO'} vote...`);
  
  try {
    lastTxHashes = [];
    
    const alreadyVoted = await publicClient.readContract({
      address: BACKER_VOTING_ADDRESS,
      abi: BACKER_VOTING_ABI,
      functionName: 'hasVotedOn',
      args: [BigInt(proposalId), connectedAddress],
    });
    
    if (alreadyVoted) {
      showResult('error', 'You have already voted on this proposal.');
      voteBtns.forEach(btn => btn.disabled = false);
      return;
    }
    
    // Check balance (ERC20)
    const balance = await publicClient.readContract({
      address: GROUP_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [connectedAddress],
    });
    
    if (balance < VOTE_COST) {
      showResult('error', `Insufficient Group CRC balance. You have ${balance} tokens, need ${VOTE_COST}.`);
      voteBtns.forEach(btn => btn.disabled = false);
      return;
    }
    
    // Check if voting contract is approved
    const allowance = await publicClient.readContract({
      address: GROUP_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [connectedAddress, BACKER_VOTING_ADDRESS],
    });
    
    if (allowance < VOTE_COST) {
      showResult('pending', 'First, approving voting contract to transfer your Group CRC...');
      
      const approveTx = {
        to: GROUP_TOKEN_ADDRESS,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [BACKER_VOTING_ADDRESS, VOTE_COST],
        }),
        value: 0n,
      };
      
      const approveHashes = await sendTransactions([formatTxForHost(approveTx)]);
      lastTxHashes = approveHashes;
      
      showResult('pending', `Approval sent! Now submitting your ${support ? 'YES' : 'NO'} vote...`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Call vote directly on the voting contract
    const voteTx = {
      to: BACKER_VOTING_ADDRESS,
      data: encodeFunctionData({
        abi: BACKER_VOTING_ABI,
        functionName: 'vote',
        args: [BigInt(proposalId), support],
      }),
      value: 0n,
    };
    
    const hashes = await sendTransactions([formatTxForHost(voteTx)]);
    lastTxHashes = lastTxHashes.concat(hashes);
    
    showResult('success', `Vote submitted! Transaction: <a href="https://gnosisscan.io/tx/${hashes[0]}" target="_blank">${truncAddr(hashes[0])}</a>`);
    
    await loadProposals();
  } catch (err) {
    showResult('error', `Failed to vote: ${decodeError(err)}`);
    voteBtns.forEach(btn => btn.disabled = false);
  }
}

/* ── UI State Management ─────────────────────────────────────────── */

function hideAllSections() {
  loginSection.classList.add('hidden');
  nonBackerSection.classList.add('hidden');
  indirectBackerSection.classList.add('hidden');
  backerSection.classList.add('hidden');
}

function showDisconnectedState() {
  hideAllSections();
  hideResult();
  setStatus('Not connected', 'disconnected');
  createProposalBtn.disabled = true;
  loginSection.classList.remove('hidden');
}

async function showConnectedState() {
  hideAllSections();
  
  setStatus('Checking backer status...', 'pending');
  userType = await checkBackerStatus(connectedAddress);
  
  if (userType === 'backer') {
    setStatus('Verified Backer', 'success');
    backerSection.classList.remove('hidden');
    createProposalBtn.disabled = false;
  } else if (userType === 'indirect') {
    setStatus('Indirect Backer', 'info');
    indirectBackerSection.classList.remove('hidden');
    createProposalBtn.disabled = true;
  } else {
    setStatus('Not a Backer', 'warning');
    nonBackerSection.classList.remove('hidden');
    createProposalBtn.disabled = true;
  }
  
  await loadProposals();
}

/* ── Wallet Listener ─────────────────────────────────────────────── */

onWalletChange(async (address) => {
  console.log('[onWalletChange] Raw address from SDK:', address);
  
  try {
    connectedAddress = address ? getAddress(address) : null;
    console.log('[onWalletChange] Checksummed address:', connectedAddress);
  } catch (e) {
    console.error('[onWalletChange] Failed to parse address:', e);
    connectedAddress = null;
  }
  
  userType = 'neither';
  proposals = [];
  lastTxHashes = [];
  
  hideResult();
  
  if (!connectedAddress) {
    showDisconnectedState();
    return;
  }
  
  await showConnectedState();
});

/* ── Event Listeners ─────────────────────────────────────────────── */

createProposalBtn.addEventListener('click', createProposal);

proposalTitleInput.addEventListener('input', () => {
  createProposalBtn.disabled = !connectedAddress || userType !== 'backer' || !proposalTitleInput.value.trim();
});

/* ── Init ─────────────────────────────────────────────────────────── */

// Set up modal handlers (close buttons, overlay, escape key)
attachModalHandlers();

// Initial state
showDisconnectedState();

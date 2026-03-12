/**
 * Backer Voting - Governance for Circles Backers
 * 
 * This miniapp demonstrates how to fetch backer status from the envio indexer
 * and enable backers to participate in governance voting.
 */
import { onWalletChange, signMessage } from './miniapp-sdk.js';
import { getAddress } from 'viem';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENVIO_INDEXER_URL = 'https://gnosis-e702590.dedicated.hyperindex.xyz';

// ============================================================================
// STATE
// ============================================================================

let connectedAddress = null;
let backerStatus = null;
let currentProposal = null;
let proposals = [];
let pastProposalsVisible = false;

const $ = (id) => document.getElementById(id);

// ============================================================================
// UTILITIES
// ============================================================================

function shortenAddress(addr) {
  if (!addr) return '-';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showToast(message, type = 'info', ms = 4000) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), ms);
}

function decodeError(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.shortMessage) return err.shortMessage;
  if (err.message) return err.message;
  return String(err);
}

function showView(id) {
  document.querySelectorAll('.view').forEach((el) => el.classList.add('hidden'));
  $(id)?.classList.remove('hidden');
}

// ============================================================================
// ENVIO INDEXER - BACKER STATUS QUERIES
// ============================================================================

/**
 * Query the envio indexer to check if an address is a backer.
 * 
 * The envio indexer tracks:
 * - Backing instances created via the Hub
 * - Backing completion status (7-day waiting period)
 * - Indirect backers (trusted by a backer)
 */
async function queryEnvioIndexer(query, variables = {}) {
  const response = await fetch(ENVIO_INDEXER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`Indexer request failed: ${response.status}`);
  }

  const { data, errors } = await response.json();
  if (errors) {
    throw new Error(errors[0]?.message || 'GraphQL error');
  }
  return data;
}

/**
 * Fetch backer status for an address.
 * 
 * This queries the envio indexer for:
 * 1. Completed backing instances where the address is the backer
 * 2. The backing asset details
 * 3. Timestamp when backing completed
 */
async function getBackerStatus(address) {
  const query = `
    query GetBackerStatus($address: String!) {
      backingCompleteds(
        where: { backer: $address }
        orderBy: blockTimestamp
        orderDirection: desc
        first: 1
      ) {
        id
        backer
        backingInstance
        backingAsset
        personalCircles
        blockTimestamp
        transactionHash
      }
    }
  `;

  try {
    const data = await queryEnvioIndexer(query, { 
      address: address.toLowerCase() 
    });

    const backings = data?.backingCompleteds || [];
    if (backings.length === 0) {
      return null;
    }

    const backing = backings[0];
    return {
      isBacker: true,
      backingInstance: backing.backingInstance,
      backingAsset: backing.backingAsset,
      personalCircles: backing.personalCircles,
      completedAt: backing.blockTimestamp,
      transactionHash: backing.transactionHash
    };
  } catch (err) {
    console.error('Failed to fetch backer status:', err);
    return null;
  }
}

/**
 * Check if address is an indirect backer.
 * 
 * Indirect backers are addresses that have been trusted by a direct backer,
 * giving them derivative backer status through trust relationships.
 */
async function getIndirectBackerStatus(address) {
  const query = `
    query GetIndirectBackerStatus($address: String!) {
      trustRelations(
        where: { 
          trustee: $address,
          truster_isBacker: true 
        }
        first: 1
      ) {
        id
        truster
        trustee
        truster_isBacker
      }
    }
  `;

  try {
    const data = await queryEnvioIndexer(query, { 
      address: address.toLowerCase() 
    });

    const relations = data?.trustRelations || [];
    return relations.length > 0;
  } catch (err) {
    console.error('Failed to check indirect backer status:', err);
    return false;
  }
}

// ============================================================================
// PROPOSAL MANAGEMENT
// ============================================================================

/**
 * Fetch active proposals from the indexer.
 * 
 * Proposals are stored on-chain and indexed by envio.
 */
async function getProposals(activeOnly = true) {
  const now = Math.floor(Date.now() / 1000);
  
  const query = activeOnly ? `
    query GetActiveProposals($now: BigInt!) {
      proposals(
        where: { endTime_gte: $now }
        orderBy: createdAt
        orderDirection: desc
      ) {
        id
        title
        description
        status
        createdAt
        endTime
        yesVotes
        noVotes
        abstainVotes
        creator
      }
    }
  ` : `
    query GetPastProposals($now: BigInt!) {
      proposals(
        where: { endTime_lt: $now }
        orderBy: endTime
        orderDirection: desc
        first: 10
      ) {
        id
        title
        description
        status
        createdAt
        endTime
        yesVotes
        noVotes
        abstainVotes
        creator
      }
    }
  `;

  try {
    const data = await queryEnvioIndexer(query, { now: String(now) });
    return data?.proposals || [];
  } catch (err) {
    console.error('Failed to fetch proposals:', err);
    return [];
  }
}

/**
 * Check if a backer has already voted on a proposal.
 */
async function hasVoted(proposalId, voterAddress) {
  const query = `
    query CheckVote($proposalId: String!, $voter: String!) {
      voteCasts(
        where: { 
          proposalId: $proposalId,
          voter: $voter 
        }
        first: 1
      ) {
        id
        support
        votingPower
      }
    }
  `;

  try {
    const data = await queryEnvioIndexer(query, { 
      proposalId, 
      voter: voterAddress.toLowerCase() 
    });
    const votes = data?.voteCasts || [];
    if (votes.length === 0) {
      return { hasVoted: false, vote: null };
    }
    return { 
      hasVoted: true, 
      vote: votes[0].support // 0 = Against, 1 = For, 2 = Abstain
    };
  } catch (err) {
    console.error('Failed to check vote status:', err);
    return { hasVoted: false, vote: null };
  }
}

// ============================================================================
// UI RENDERING
// ============================================================================

function renderBackerStatus(status) {
  if (!status) return;

  if (status.isIndirect) {
    // Indirect backer — no backing-instance details available
    const detailsEl = document.querySelector('.backer-details');
    if (detailsEl) detailsEl.style.display = 'none';
    const badge = document.querySelector('.backer-badge');
    if (badge) badge.textContent = 'Indirect Backer';
    return;
  }

  const backingInstanceEl = $('backing-instance');
  const backingAssetEl = $('backing-asset');
  const personalCirclesEl = $('personal-circles');
  const completedAtEl = $('completed-at');

  if (backingInstanceEl) {
    backingInstanceEl.textContent = shortenAddress(status.backingInstance);
    backingInstanceEl.title = status.backingInstance || '';
  }
  if (backingAssetEl) {
    backingAssetEl.textContent = shortenAddress(status.backingAsset);
    backingAssetEl.title = status.backingAsset || '';
  }
  if (personalCirclesEl) {
    personalCirclesEl.textContent = shortenAddress(status.personalCircles);
    personalCirclesEl.title = status.personalCircles || '';
  }
  if (completedAtEl) {
    completedAtEl.textContent = formatDate(status.completedAt);
  }
}

function renderProposals(proposals, containerId) {
  const container = $(containerId);
  
  if (!proposals || proposals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No proposals found</p>
      </div>
    `;
    return;
  }

  container.innerHTML = proposals.map((p) => {
    const totalVotes = Number(p.yesVotes || 0) + Number(p.noVotes || 0) + Number(p.abstainVotes || 0);
    const yesPercent = totalVotes > 0 ? Math.round((Number(p.yesVotes || 0) / totalVotes) * 100) : 0;
    
    return `
      <div class="proposal-item" data-id="${p.id}">
        <div class="proposal-item-header">
          <span class="status-badge ${p.status?.toLowerCase() || 'active'}">${p.status || 'Active'}</span>
          <span class="proposal-date">${formatDate(p.endTime)}</span>
        </div>
        <h4 class="proposal-title">${p.title || 'Untitled Proposal'}</h4>
        <div class="proposal-preview">
          <div class="mini-result-bar">
            <div class="mini-yes" style="width: ${yesPercent}%"></div>
          </div>
          <span class="mini-percent">${yesPercent}% Yes</span>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  container.querySelectorAll('.proposal-item').forEach((item) => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const proposal = proposals.find((p) => p.id === id);
      if (proposal) showProposalDetail(proposal);
    });
  });
}

async function showProposalDetail(proposal) {
  currentProposal = proposal;
  showView('proposal-detail-view');

  $('detail-title').textContent = proposal.title || 'Untitled Proposal';
  $('detail-description').textContent = proposal.description || 'No description available.';
  $('detail-status').textContent = proposal.status || 'Active';
  $('detail-status').className = `status-badge ${proposal.status?.toLowerCase() || 'active'}`;
  $('detail-created').textContent = formatDate(proposal.createdAt);
  $('detail-ends').textContent = formatDate(proposal.endTime);

  // Check if already voted
  if (connectedAddress) {
    const { hasVoted: voted, vote } = await hasVoted(proposal.id, connectedAddress);
    
    if (voted) {
      $('voting-section').classList.add('hidden');
      $('voted-section').classList.remove('hidden');
      const voteText = vote === 1 ? 'Yes' : vote === 0 ? 'No' : 'Abstain';
      $('your-vote').textContent = voteText;
    } else {
      $('voting-section').classList.remove('hidden');
      $('voted-section').classList.add('hidden');
    }
  }

  // Render results
  const total = Number(proposal.yesVotes || 0) + Number(proposal.noVotes || 0) + Number(proposal.abstainVotes || 0);
  const yesPct = total > 0 ? (Number(proposal.yesVotes || 0) / total) * 100 : 0;
  const noPct = total > 0 ? (Number(proposal.noVotes || 0) / total) * 100 : 0;
  const abstainPct = total > 0 ? (Number(proposal.abstainVotes || 0) / total) * 100 : 0;

  const yesSegment = document.querySelector('.yes-segment');
  const noSegment = document.querySelector('.no-segment');
  const abstainSegment = document.querySelector('.abstain-segment');

  if (yesSegment) yesSegment.style.width = `${yesPct}%`;
  if (noSegment) noSegment.style.width = `${noPct}%`;
  if (abstainSegment) abstainSegment.style.width = `${abstainPct}%`;

  $('yes-count').textContent = proposal.yesVotes || '0';
  $('no-count').textContent = proposal.noVotes || '0';
  $('abstain-count').textContent = proposal.abstainVotes || '0';
}

// ============================================================================
// VOTING ACTIONS
// ============================================================================

async function castVote(proposalId, support) {
  if (!connectedAddress || !backerStatus) {
    showToast('You must be a backer to vote', 'error');
    return;
  }

  try {
    // Create vote message to sign
    const message = JSON.stringify({
      proposalId,
      support, // 1 = Yes, 0 = No, 2 = Abstain
      voter: connectedAddress,
      timestamp: Date.now()
    });

    showToast('Please sign the vote message...', 'info');

    // Request signature from wallet
    const { signature } = await signMessage(message);

    // In a real implementation, you would submit this to your backend
    // which would verify the signature and submit the on-chain vote
    console.log('Vote signed:', { proposalId, support, signature });

    showToast('Vote submitted successfully!', 'success');
    
    // Refresh proposal data
    if (currentProposal) {
      showProposalDetail(currentProposal);
    }
  } catch (err) {
    console.error('Vote error:', err);
    if (err.message?.includes('Rejected')) {
      showToast('Vote cancelled', 'warn');
    } else {
      showToast(`Failed to submit vote: ${decodeError(err)}`, 'error');
    }
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function setupEventListeners() {
  // Back to list
  $('back-to-list-btn')?.addEventListener('click', () => {
    currentProposal = null;
    showView('backer-view');
  });

  // Vote buttons
  $('vote-yes-btn')?.addEventListener('click', () => {
    if (currentProposal) castVote(currentProposal.id, 1);
  });

  $('vote-no-btn')?.addEventListener('click', () => {
    if (currentProposal) castVote(currentProposal.id, 0);
  });

  $('vote-abstain-btn')?.addEventListener('click', () => {
    if (currentProposal) castVote(currentProposal.id, 2);
  });

  // Toggle past proposals
  $('toggle-past-btn')?.addEventListener('click', async () => {
    pastProposalsVisible = !pastProposalsVisible;
    $('past-proposals-list').classList.toggle('hidden', !pastProposalsVisible);
    $('toggle-past-btn').textContent = pastProposalsVisible ? 'Hide' : 'Show';
    
    if (pastProposalsVisible) {
      const past = await getProposals(false);
      renderProposals(past, 'past-proposals-list');
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initializeApp(address) {
  showView('backer-view');

  // Prototype disclaimer — governance infrastructure (on-chain proposals, vote contract)
  // is not yet deployed. Voting signs a message locally; no on-chain effect.
  const disclaimer = document.createElement('div');
  disclaimer.id = 'prototype-disclaimer';
  disclaimer.style.cssText = `
    background: #fff8e1;
    border: 1px solid #f9c84a;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 12px;
    line-height: 1.5;
    color: #7a5500;
    margin-bottom: 16px;
  `;
  disclaimer.innerHTML = `
    <strong>⚠️ Prototype / Concept App</strong><br>
    The governance infrastructure (on-chain proposal contract, vote tallying) is not yet
    deployed. Backer status checks query the Envio indexer and may return no results.
    Vote signatures are captured locally only — no on-chain voting occurs.
    This app is a design reference for a future Circles governance system.
  `;
  const backerView = $('backer-view');
  if (backerView && !$('prototype-disclaimer')) {
    backerView.insertBefore(disclaimer, backerView.firstChild);
  }

  setupEventListeners();

  // First check if the connected address is a direct backer
  backerStatus = await getBackerStatus(address);

  if (!backerStatus) {
    // Check if indirect backer
    const isIndirect = await getIndirectBackerStatus(address);
    
    if (!isIndirect) {
      // Not a backer at all
      showView('not-backer-view');
      return;
    }

    // Indirect backer - show limited UI
    backerStatus = { isBacker: true, isIndirect: true };
    showToast('You are an indirect backer through trust relationships', 'info');
  }

  // Render backer info
  renderBackerStatus(backerStatus);

  // Load proposals
  proposals = await getProposals(true);
  $('proposal-count').textContent = proposals.length;
  renderProposals(proposals, 'proposals-list');
}

onWalletChange(async (address) => {
  if (!address) {
    connectedAddress = null;
    backerStatus = null;
    $('wallet-status').textContent = 'Not connected';
    $('wallet-status').className = 'badge';
    showView('disconnected-view');
    return;
  }

  try {
    connectedAddress = getAddress(address);
    $('wallet-status').textContent = shortenAddress(connectedAddress);
    $('wallet-status').className = 'badge badge-success';
    await initializeApp(connectedAddress);
  } catch (err) {
    console.error('[Backer Voting] Init error:', err);
    showToast(`Failed to initialise: ${decodeError(err)}`, 'error');
  }
});

// Standalone mode notice
if (window.parent === window) {
  document.body.insertAdjacentHTML(
    'afterbegin',
    '<div style="background:#fff9ea;padding:8px 16px;font-size:12px;text-align:center;border-bottom:1px solid #f8e4b3">' +
    'Running in standalone mode. Load via Circles host for full functionality.</div>'
  );
}
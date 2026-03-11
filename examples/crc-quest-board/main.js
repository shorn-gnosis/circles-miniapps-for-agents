/**
 * CRC Quest Board - Community bounty marketplace for Circles
 * 
 * Features:
 * - Create quests with CRC rewards
 * - Browse and claim open quests
 * - Submit completion and approve/reject
 * - Automatic CRC transfer on approval
 */
import { onWalletChange, sendTransactions } from './miniapp-sdk.js';
import { Sdk } from '@aboutcircles/sdk';
import { createPublicClient, http, getAddress, encodeFunctionData, parseUnits, formatUnits } from 'viem';
import { gnosis } from 'viem/chains';

// ── Constants ─────────────────────────────────────────────────────────────
const HUB_V2_ADDRESS = '0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8';
const RPC_URL = 'https://rpc.aboutcircles.com/';

const HUB_TRANSFER_ABI = [{
  type: 'function',
  name: 'safeTransferFrom',
  inputs: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'id', type: 'uint256' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },
  ],
}];

// ── State ──────────────────────────────────────────────────────────────────
let connectedAddress = null;
let userProfile = null;
let userBalance = 0n;
let userTrustScore = 0;
let userEarned = 0n;
let userCompleted = 0;
let quests = [];
let currentQuestId = null;

const publicClient = createPublicClient({
  chain: gnosis,
  transport: http(RPC_URL),
  cacheTime: 60_000,
  batch: { multicall: { wait: 50 } },
});

const sdk = new Sdk(RPC_URL, null);

// ── UI Helpers ─────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showView(id) {
  document.querySelectorAll('.view').forEach((el) => el.classList.add('hidden'));
  $(id)?.classList.remove('hidden');
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach((el) => el.classList.remove('active'));
  $(`tab-${tabId}`)?.classList.add('active');
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
  
  if (tabId === 'browse') loadAndRenderQuests();
  if (tabId === 'my-quests') renderMyQuests();
}

function showToast(message, type = 'info', ms = 5000) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), ms);
}

function showProcessing(message = 'Processing...') {
  $('processing-message').textContent = message;
  $('processing-overlay').classList.remove('hidden');
}

function hideProcessing() {
  $('processing-overlay').classList.add('hidden');
}

function formatCrc(wei) {
  const value = typeof wei === 'bigint' ? wei : BigInt(wei || 0);
  return parseFloat(formatUnits(value, 18)).toFixed(2);
}

function formatAddress(address) {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function timeUntil(timestamp) {
  const now = Date.now();
  const diff = timestamp - now;
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))}m`;
  return `${Math.floor(diff / (1000 * 60))}m`;
}

function decodeError(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.shortMessage) return err.shortMessage;
  if (err.message) return err.message;
  return String(err);
}

function isPasskeyAutoConnectError(err) {
  const msg = decodeError(err).toLowerCase();
  return msg.includes('passkey') || msg.includes('auto connect') || 
         (msg.includes('wallet address') && msg.includes('retrieve'));
}

// ── Data Management ────────────────────────────────────────────────────────
function loadQuests() {
  try {
    const stored = localStorage.getItem('crc_quest_board_quests');
    quests = stored ? JSON.parse(stored) : [];
    
    // Auto-close expired quests
    const now = Date.now();
    quests.forEach(q => {
      if (q.state === 'OPEN' && q.deadline < now) {
        q.state = 'CANCELLED';
      }
    });
    saveQuests();
  } catch (err) {
    console.error('Failed to load quests:', err);
    quests = [];
  }
}

function saveQuests() {
  try {
    localStorage.setItem('crc_quest_board_quests', JSON.stringify(quests));
  } catch (err) {
    console.error('Failed to save quests:', err);
    showToast('Failed to save quest data', 'error');
  }
}

function generateQuestId() {
  return `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ── Profile & Balance ──────────────────────────────────────────────────────
async function loadUserProfile(address) {
  try {
    const profile = await sdk.rpc.profile.getProfileByAddress(address);
    const avatar = await sdk.getAvatar(address);
    
    userProfile = {
      address,
      name: profile?.name || profile?.registeredName || formatAddress(address),
    };
    
    if (avatar) {
      const balances = await avatar.balances.getTokenBalances();
      userBalance = balances.reduce((sum, b) => sum + BigInt(b.attoCircles || 0n), 0n);
      
      const relations = await sdk.data.getTrustRelations(address);
      userTrustScore = relations.length;
    }
    
    // Calculate earned from completed quests
    userEarned = quests
      .filter(q => q.claimer === address && q.state === 'COMPLETED')
      .reduce((sum, q) => sum + BigInt(q.reward), 0n);
    
    userCompleted = quests.filter(q => q.claimer === address && q.state === 'COMPLETED').length;
    
    updateUserStats();
  } catch (err) {
    console.error('Failed to load profile:', err);
    userProfile = { address, name: formatAddress(address) };
    userBalance = 0n;
    userTrustScore = 0;
  }
}

function updateUserStats() {
  $('user-balance').textContent = `${formatCrc(userBalance)} CRC`;
  $('user-earned').textContent = `${formatCrc(userEarned)} CRC`;
  $('user-completed').textContent = userCompleted.toString();
  $('balance-hint').textContent = `${formatCrc(userBalance)} CRC`;
  $('user-stats').classList.remove('hidden');
}

// ── Quest Rendering ────────────────────────────────────────────────────────
function renderQuestCard(quest) {
  const isExpired = quest.deadline < Date.now();
  const creatorName = quest.creatorName || formatAddress(quest.creator);
  
  return `
    <div class="quest-card" data-quest-id="${quest.id}">
      <div class="quest-card-header">
        <h3 class="quest-title">${escapeHtml(quest.title)}</h3>
        <div class="quest-reward">${quest.rewardDisplay}</div>
      </div>
      <div class="quest-meta">
        <div class="quest-meta-item">
          <span>👤 ${creatorName}</span>
        </div>
        <div class="quest-meta-item">
          <span>⏱️ ${timeUntil(quest.deadline)}</span>
        </div>
        <div class="quest-meta-item">
          <span class="quest-state-badge ${quest.state.toLowerCase()}">${quest.state}</span>
        </div>
      </div>
      <p class="quest-description">${escapeHtml(quest.description.slice(0, 120))}${quest.description.length > 120 ? '...' : ''}</p>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function loadAndRenderQuests() {
  loadQuests();
  
  const sortBy = $('sort-select').value;
  const onlyTrusted = $('filter-trust').checked;
  
  let filtered = quests.filter(q => q.state === 'OPEN');
  
  if (onlyTrusted) {
    filtered = filtered.filter(q => q.minTrust <= userTrustScore);
  }
  
  // Sort
  if (sortBy === 'newest') {
    filtered.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sortBy === 'reward-high') {
    filtered.sort((a, b) => Number(BigInt(b.reward) - BigInt(a.reward)));
  } else if (sortBy === 'deadline-soon') {
    filtered.sort((a, b) => a.deadline - b.deadline);
  }
  
  if (filtered.length === 0) {
    $('quest-list').innerHTML = '<div class="empty-state">No open quests found.</div>';
  } else {
    $('quest-list').innerHTML = filtered.map(renderQuestCard).join('');
    attachQuestCardListeners();
  }
}

function renderMyQuests() {
  loadQuests();
  
  const myCreated = quests.filter(q => q.creator === connectedAddress);
  const myClaimed = quests.filter(q => q.claimer === connectedAddress);
  
  if (myCreated.length === 0) {
    $('my-created-quests').innerHTML = '<div class="empty-state">You haven\'t created any quests yet.</div>';
  } else {
    $('my-created-quests').innerHTML = myCreated.map(renderQuestCard).join('');
  }
  
  if (myClaimed.length === 0) {
    $('my-claimed-quests').innerHTML = '<div class="empty-state">You haven\'t claimed any quests yet.</div>';
  } else {
    $('my-claimed-quests').innerHTML = myClaimed.map(renderQuestCard).join('');
  }
  
  attachQuestCardListeners();
}

function attachQuestCardListeners() {
  document.querySelectorAll('.quest-card').forEach(card => {
    card.addEventListener('click', () => {
      const questId = card.dataset.questId;
      showQuestDetail(questId);
    });
  });
}

// ── Quest Detail View ──────────────────────────────────────────────────────
function showQuestDetail(questId) {
  const quest = quests.find(q => q.id === questId);
  if (!quest) {
    showToast('Quest not found', 'error');
    return;
  }
  
  currentQuestId = questId;
  const isCreator = quest.creator === connectedAddress;
  const isClaimer = quest.claimer === connectedAddress;
  const canClaim = quest.state === 'OPEN' && !isCreator;
  const canSubmit = quest.state === 'CLAIMED' && isClaimer;
  const canApprove = quest.state === 'PENDING_REVIEW' && isCreator;
  
  const actionsHtml = [];
  
  if (canClaim) {
    actionsHtml.push(`<button class="btn" onclick="window.claimQuest('${quest.id}')">Claim Quest</button>`);
  }
  
  if (canSubmit) {
    actionsHtml.push(`
      <div class="field">
        <label for="completion-proof">Completion Proof</label>
        <textarea id="completion-proof" rows="3" placeholder="Describe how you completed this quest..."></textarea>
      </div>
      <button class="btn" onclick="window.submitCompletion('${quest.id}')">Submit Completion</button>
    `);
  }
  
  if (canApprove) {
    actionsHtml.push(`
      <div class="quest-detail-section">
        <h3>Completion Proof</h3>
        <p>${escapeHtml(quest.completionProof || 'No proof provided')}</p>
      </div>
      <button class="btn" onclick="window.approveCompletion('${quest.id}')">Approve & Pay ${quest.rewardDisplay}</button>
      <button class="btn btn-secondary" onclick="window.rejectCompletion('${quest.id}')">Reject</button>
    `);
  }
  
  if (isCreator && quest.state === 'OPEN') {
    actionsHtml.push(`<button class="btn btn-danger" onclick="window.cancelQuest('${quest.id}')">Cancel Quest</button>`);
  }
  
  const deadlineStr = new Date(quest.deadline).toLocaleString();
  const createdStr = new Date(quest.createdAt).toLocaleString();
  
  $('quest-detail-content').innerHTML = `
    <div style="margin-top: 16px;">
      <div class="quest-state-badge ${quest.state.toLowerCase()}" style="margin-bottom: 12px; display: inline-block;">
        ${quest.state}
      </div>
      <h2 style="font-size: 24px; margin-bottom: 12px;">${escapeHtml(quest.title)}</h2>
      <p style="font-size: 15px; line-height: 1.6; color: var(--muted); margin-bottom: 20px;">
        ${escapeHtml(quest.description)}
      </p>
      
      <div class="quest-info-grid">
        <div class="quest-info-item">
          <div class="quest-info-label">Reward</div>
          <div class="quest-info-value">${quest.rewardDisplay}</div>
        </div>
        <div class="quest-info-item">
          <div class="quest-info-label">Deadline</div>
          <div class="quest-info-value">${deadlineStr}</div>
        </div>
        <div class="quest-info-item">
          <div class="quest-info-label">Creator</div>
          <div class="quest-info-value">${quest.creatorName || formatAddress(quest.creator)}</div>
        </div>
        <div class="quest-info-item">
          <div class="quest-info-label">Min Trust</div>
          <div class="quest-info-value">${quest.minTrust > 0 ? quest.minTrust : 'None'}</div>
        </div>
        <div class="quest-info-item">
          <div class="quest-info-label">Created</div>
          <div class="quest-info-value">${createdStr}</div>
        </div>
        ${quest.claimer ? `
        <div class="quest-info-item">
          <div class="quest-info-label">Claimed by</div>
          <div class="quest-info-value">${quest.claimerName || formatAddress(quest.claimer)}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="quest-actions">
        ${actionsHtml.join('')}
      </div>
    </div>
  `;
  
  showView('quest-detail-view');
}

// ── Quest Actions ───────────────────────────────────────────────────────────
window.claimQuest = async function(questId) {
  const quest = quests.find(q => q.id === questId);
  if (!quest) return showToast('Quest not found', 'error');
  
  if (quest.creator === connectedAddress) {
    return showToast('You cannot claim your own quest', 'error');
  }
  
  if (quest.minTrust > userTrustScore) {
    return showToast(`You need trust score of ${quest.minTrust} to claim this quest`, 'error');
  }
  
  quest.state = 'CLAIMED';
  quest.claimer = connectedAddress;
  quest.claimerName = userProfile?.name || formatAddress(connectedAddress);
  quest.claimedAt = Date.now();
  
  saveQuests();
  showToast('Quest claimed successfully!', 'success');
  showTab('my-quests');
};

window.submitCompletion = function(questId) {
  const quest = quests.find(q => q.id === questId);
  if (!quest) return showToast('Quest not found', 'error');
  
  const proof = $('completion-proof').value.trim();
  if (!proof) {
    return showToast('Please provide completion proof', 'error');
  }
  
  quest.state = 'PENDING_REVIEW';
  quest.completionProof = proof;
  
  saveQuests();
  showToast('Completion submitted for review', 'success');
  showQuestDetail(questId);
};

window.approveCompletion = async function(questId) {
  const quest = quests.find(q => q.id === questId);
  if (!quest) return showToast('Quest not found', 'error');
  
  showProcessing('Transferring CRC reward...');
  
  try {
    const amountWei = BigInt(quest.reward);
    const tokenId = BigInt(quest.creator);
    
    const data = encodeFunctionData({
      abi: HUB_TRANSFER_ABI,
      functionName: 'safeTransferFrom',
      args: [quest.creator, quest.claimer, tokenId, amountWei, '0x'],
    });
    
    const tx = {
      to: HUB_V2_ADDRESS,
      data,
      value: '0x0',
    };
    
    const hashes = await sendTransactions([tx]);
    const txHash = hashes[0];
    
    quest.state = 'COMPLETED';
    quest.completedAt = Date.now();
    quest.txHash = txHash;
    
    saveQuests();
    
    // Update user stats
    userEarned += amountWei;
    userCompleted += 1;
    updateUserStats();
    
    hideProcessing();
    showToast('Quest completed! Reward transferred.', 'success');
    showTab('my-quests');
  } catch (err) {
    hideProcessing();
    
    if (isPasskeyAutoConnectError(err)) {
      showToast('Passkey connection failed. Please reconnect your wallet.', 'error');
    } else {
      showToast(`Transfer failed: ${decodeError(err)}`, 'error');
    }
  }
};

window.rejectCompletion = function(questId) {
  const quest = quests.find(q => q.id === questId);
  if (!quest) return showToast('Quest not found', 'error');
  
  quest.state = 'CLAIMED';
  quest.completionProof = null;
  
  saveQuests();
  showToast('Completion rejected. Claimer can resubmit.', 'warn');
  showQuestDetail(questId);
};

window.cancelQuest = function(questId) {
  const quest = quests.find(q => q.id === questId);
  if (!quest) return showToast('Quest not found', 'error');
  
  if (!confirm('Are you sure you want to cancel this quest?')) return;
  
  quest.state = 'CANCELLED';
  saveQuests();
  showToast('Quest cancelled', 'warn');
  showTab('my-quests');
};

// ── Quest Creation ──────────────────────────────────────────────────────────
function setupQuestForm() {
  const form = $('quest-form');
  const descInput = $('quest-description');
  const descCount = $('desc-char-count');
  const trustSlider = $('quest-trust');
  const trustValue = $('trust-value');
  const rewardInput = $('quest-reward');
  
  descInput.addEventListener('input', () => {
    descCount.textContent = descInput.value.length;
  });
  
  trustSlider.addEventListener('input', () => {
    trustValue.textContent = trustSlider.value;
  });
  
  // Set minimum deadline to now + 1 hour
  const now = new Date();
  now.setHours(now.getHours() + 1);
  $('quest-deadline').min = now.toISOString().slice(0, 16);
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = $('quest-title').value.trim();
    const description = $('quest-description').value.trim();
    const rewardStr = $('quest-reward').value;
    const deadlineStr = $('quest-deadline').value;
    const minTrust = parseInt($('quest-trust').value);
    
    if (!title || !description || !rewardStr || !deadlineStr) {
      return showToast('Please fill in all required fields', 'error');
    }
    
    const reward = parseUnits(rewardStr, 18);
    
    if (reward > userBalance) {
      return showToast(`Insufficient balance. You have ${formatCrc(userBalance)} CRC`, 'error');
    }
    
    const deadline = new Date(deadlineStr).getTime();
    if (deadline <= Date.now()) {
      return showToast('Deadline must be in the future', 'error');
    }
    
    const quest = {
      id: generateQuestId(),
      title,
      description,
      reward: reward.toString(),
      rewardDisplay: `${rewardStr} CRC`,
      creator: connectedAddress,
      creatorName: userProfile?.name || formatAddress(connectedAddress),
      deadline,
      minTrust,
      state: 'OPEN',
      claimer: null,
      claimerName: null,
      completionProof: null,
      createdAt: Date.now(),
      claimedAt: null,
      completedAt: null,
      txHash: null,
    };
    
    quests.push(quest);
    saveQuests();
    
    form.reset();
    descCount.textContent = '0';
    trustValue.textContent = '0';
    
    showToast('Quest created successfully!', 'success');
    showTab('browse');
  });
}

// ── Event Listeners ─────────────────────────────────────────────────────────
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showTab(btn.dataset.tab);
    });
  });
  
  // Back button
  $('back-btn').addEventListener('click', () => {
    showTab('browse');
  });
  
  // Filters
  $('sort-select').addEventListener('change', loadAndRenderQuests);
  $('filter-trust').addEventListener('change', loadAndRenderQuests);
}

// ── Initialization ──────────────────────────────────────────────────────────
async function initializeApp(address) {
  try {
    showView('connected-view');
    loadQuests();
    await loadUserProfile(address);
    setupQuestForm();
    setupEventListeners();
    loadAndRenderQuests();
  } catch (err) {
    console.error('Init error:', err);
    showToast('Failed to load app data', 'error');
  }
}

// ── Wallet Connection ───────────────────────────────────────────────────────
onWalletChange(async (address) => {
  if (!address) {
    connectedAddress = null;
    userProfile = null;
    userBalance = 0n;
    userTrustScore = 0;
    userEarned = 0n;
    userCompleted = 0;
    
    $('wallet-status').textContent = 'Not connected';
    $('wallet-status').className = 'badge';
    $('user-stats').classList.add('hidden');
    showView('disconnected-view');
    return;
  }
  
  connectedAddress = getAddress(address);
  $('wallet-status').textContent = `${connectedAddress.slice(0, 6)}…${connectedAddress.slice(-4)}`;
  $('wallet-status').className = 'badge badge-success';
  
  await initializeApp(connectedAddress);
});

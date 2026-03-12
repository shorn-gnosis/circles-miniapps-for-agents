(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function n(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(r){if(r.ep)return;r.ep=!0;const i=n(r);fetch(r.href,i)}})();let I=null,N=[],fe=[],he=0;const g={};window.addEventListener("message",e=>{var n,s,r,i;const t=e.data;if(!(!t||!t.type))switch(t.type){case"app_data":fe.forEach(o=>o(t.data));break;case"wallet_connected":I=t.address,N.forEach(o=>o(I));break;case"wallet_disconnected":I=null,N.forEach(o=>o(null));break;case"tx_success":(n=g[t.requestId])==null||n.resolve(t.hashes),delete g[t.requestId];break;case"tx_rejected":(s=g[t.requestId])==null||s.reject(new Error(t.error??t.reason??"Rejected")),delete g[t.requestId];break;case"sign_success":(r=g[t.requestId])==null||r.resolve({signature:t.signature,verified:t.verified}),delete g[t.requestId];break;case"sign_rejected":(i=g[t.requestId])==null||i.reject(new Error(t.error??t.reason??"Rejected")),delete g[t.requestId];break}});window.parent!==window&&window.parent.postMessage({type:"request_address"},"*");function ge(e){N.push(e),e(I)}function pe(e){return new Promise((t,n)=>{const s="req_"+ ++he;g[s]={resolve:t,reject:n},window.parent.postMessage({type:"sign_message",requestId:s,message:e},"*")})}function _(e,{strict:t=!0}={}){return!e||typeof e!="string"?!1:t?/^0x[0-9a-fA-F]*$/.test(e):e.startsWith("0x")}function U(e){return _(e,{strict:!1})?Math.ceil((e.length-2)/2):e.length}const K="2.47.1";let w={getDocsUrl:({docsBaseUrl:e,docsPath:t="",docsSlug:n})=>t?`${e??"https://viem.sh"}${t}${n?`#${n}`:""}`:void 0,version:`viem@${K}`};class b extends Error{constructor(t,n={}){var c;const s=(()=>{var u;return n.cause instanceof b?n.cause.details:(u=n.cause)!=null&&u.message?n.cause.message:n.details})(),r=n.cause instanceof b&&n.cause.docsPath||n.docsPath,i=(c=w.getDocsUrl)==null?void 0:c.call(w,{...n,docsPath:r}),o=[t||"An error occurred.","",...n.metaMessages?[...n.metaMessages,""]:[],...i?[`Docs: ${i}`]:[],...s?[`Details: ${s}`]:[],...w.version?[`Version: ${w.version}`]:[]].join(`
`);super(o,n.cause?{cause:n.cause}:void 0),Object.defineProperty(this,"details",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),Object.defineProperty(this,"docsPath",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),Object.defineProperty(this,"metaMessages",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),Object.defineProperty(this,"shortMessage",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),Object.defineProperty(this,"version",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),Object.defineProperty(this,"name",{enumerable:!0,configurable:!0,writable:!0,value:"BaseError"}),this.details=s,this.docsPath=r,this.metaMessages=n.metaMessages,this.name=n.name??this.name,this.shortMessage=t,this.version=K}walk(t){return Y(this,t)}}function Y(e,t){return t!=null&&t(e)?e:e&&typeof e=="object"&&"cause"in e&&e.cause!==void 0?Y(e.cause,t):t?null:e}class W extends b{constructor({size:t,targetSize:n,type:s}){super(`${s.charAt(0).toUpperCase()}${s.slice(1).toLowerCase()} size (${t}) exceeds padding size (${n}).`,{name:"SizeExceedsPaddingSizeError"})}}function B(e,{dir:t,size:n=32}={}){return typeof e=="string"?be(e,{dir:t,size:n}):me(e,{dir:t,size:n})}function be(e,{dir:t,size:n=32}={}){if(n===null)return e;const s=e.replace("0x","");if(s.length>n*2)throw new W({size:Math.ceil(s.length/2),targetSize:n,type:"hex"});return`0x${s[t==="right"?"padEnd":"padStart"](n*2,"0")}`}function me(e,{dir:t,size:n=32}={}){if(n===null)return e;if(e.length>n)throw new W({size:e.length,targetSize:n,type:"bytes"});const s=new Uint8Array(n);for(let r=0;r<n;r++){const i=t==="right";s[i?r:n-r-1]=e[i?r:e.length-r-1]}return s}class ye extends b{constructor({max:t,min:n,signed:s,size:r,value:i}){super(`Number "${i}" is not in safe ${r?`${r*8}-bit ${s?"signed":"unsigned"} `:""}integer range ${t?`(${n} to ${t})`:`(above ${n})`}`,{name:"IntegerOutOfRangeError"})}}class we extends b{constructor({givenSize:t,maxSize:n}){super(`Size cannot exceed ${n} bytes. Given size: ${t} bytes.`,{name:"SizeOverflowError"})}}function q(e,{size:t}){if(U(e)>t)throw new we({givenSize:U(e),maxSize:t})}function xe(e,t={}){const{signed:n,size:s}=t,r=BigInt(e);let i;s?n?i=(1n<<BigInt(s)*8n-1n)-1n:i=2n**(BigInt(s)*8n)-1n:typeof e=="number"&&(i=BigInt(Number.MAX_SAFE_INTEGER));const o=typeof i=="bigint"&&n?-i-1n:0;if(i&&r>i||r<o){const u=typeof e=="bigint"?"n":"";throw new ye({max:i?`${i}${u}`:void 0,min:`${o}${u}`,signed:n,size:s,value:`${e}${u}`})}const c=`0x${(n&&r<0?(1n<<BigInt(s*8))+BigInt(r):r).toString(16)}`;return s?B(c,{size:s}):c}const ve=new TextEncoder;function ke(e,t={}){return typeof e=="number"||typeof e=="bigint"?Ae(e,t):typeof e=="boolean"?$e(e,t):_(e)?J(e,t):Q(e,t)}function $e(e,t={}){const n=new Uint8Array(1);return n[0]=Number(e),typeof t.size=="number"?(q(n,{size:t.size}),B(n,{size:t.size})):n}const h={zero:48,nine:57,A:65,F:70,a:97,f:102};function H(e){if(e>=h.zero&&e<=h.nine)return e-h.zero;if(e>=h.A&&e<=h.F)return e-(h.A-10);if(e>=h.a&&e<=h.f)return e-(h.a-10)}function J(e,t={}){let n=e;t.size&&(q(n,{size:t.size}),n=B(n,{dir:"right",size:t.size}));let s=n.slice(2);s.length%2&&(s=`0${s}`);const r=s.length/2,i=new Uint8Array(r);for(let o=0,c=0;o<r;o++){const u=H(s.charCodeAt(c++)),f=H(s.charCodeAt(c++));if(u===void 0||f===void 0)throw new b(`Invalid byte sequence ("${s[c-2]}${s[c-1]}" in "${s}").`);i[o]=u*16+f}return i}function Ae(e,t){const n=xe(e,t);return J(n)}function Q(e,t={}){const n=ve.encode(e);return typeof t.size=="number"?(q(n,{size:t.size}),B(n,{dir:"right",size:t.size})):n}const A=BigInt(2**32-1),j=BigInt(32);function Ie(e,t=!1){return t?{h:Number(e&A),l:Number(e>>j&A)}:{h:Number(e>>j&A)|0,l:Number(e&A)|0}}function Se(e,t=!1){const n=e.length;let s=new Uint32Array(n),r=new Uint32Array(n);for(let i=0;i<n;i++){const{h:o,l:c}=Ie(e[i],t);[s[i],r[i]]=[o,c]}return[s,r]}const Le=(e,t,n)=>e<<n|t>>>32-n,Ee=(e,t,n)=>t<<n|e>>>32-n,Be=(e,t,n)=>t<<n-32|e>>>64-n,Ce=(e,t,n)=>e<<n-32|t>>>64-n;/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */function Oe(e){return e instanceof Uint8Array||ArrayBuffer.isView(e)&&e.constructor.name==="Uint8Array"}function F(e){if(!Number.isSafeInteger(e)||e<0)throw new Error("positive integer expected, got "+e)}function L(e,...t){if(!Oe(e))throw new Error("Uint8Array expected");if(t.length>0&&!t.includes(e.length))throw new Error("Uint8Array expected of length "+t+", got length="+e.length)}function R(e,t=!0){if(e.destroyed)throw new Error("Hash instance has been destroyed");if(t&&e.finished)throw new Error("Hash#digest() has already been called")}function Ve(e,t){L(e);const n=t.outputLen;if(e.length<n)throw new Error("digestInto() expects output buffer of length at least "+n)}function Pe(e){return new Uint32Array(e.buffer,e.byteOffset,Math.floor(e.byteLength/4))}function Z(...e){for(let t=0;t<e.length;t++)e[t].fill(0)}const Te=new Uint8Array(new Uint32Array([287454020]).buffer)[0]===68;function ze(e){return e<<24&4278190080|e<<8&16711680|e>>>8&65280|e>>>24&255}function Ne(e){for(let t=0;t<e.length;t++)e[t]=ze(e[t]);return e}const D=Te?e=>e:Ne;function _e(e){if(typeof e!="string")throw new Error("string expected");return new Uint8Array(new TextEncoder().encode(e))}function ee(e){return typeof e=="string"&&(e=_e(e)),L(e),e}class qe{}function Me(e){const t=s=>e().update(ee(s)).digest(),n=e();return t.outputLen=n.outputLen,t.blockLen=n.blockLen,t.create=()=>e(),t}const Ue=BigInt(0),x=BigInt(1),He=BigInt(2),je=BigInt(7),Fe=BigInt(256),Re=BigInt(113),te=[],ne=[],se=[];for(let e=0,t=x,n=1,s=0;e<24;e++){[n,s]=[s,(2*n+3*s)%5],te.push(2*(5*s+n)),ne.push((e+1)*(e+2)/2%64);let r=Ue;for(let i=0;i<7;i++)t=(t<<x^(t>>je)*Re)%Fe,t&He&&(r^=x<<(x<<BigInt(i))-x);se.push(r)}const re=Se(se,!0),De=re[0],Ge=re[1],G=(e,t,n)=>n>32?Be(e,t,n):Le(e,t,n),X=(e,t,n)=>n>32?Ce(e,t,n):Ee(e,t,n);function Xe(e,t=24){const n=new Uint32Array(10);for(let s=24-t;s<24;s++){for(let o=0;o<10;o++)n[o]=e[o]^e[o+10]^e[o+20]^e[o+30]^e[o+40];for(let o=0;o<10;o+=2){const c=(o+8)%10,u=(o+2)%10,f=n[u],l=n[u+1],O=G(f,l,1)^n[c],de=X(f,l,1)^n[c+1];for(let $=0;$<50;$+=10)e[o+$]^=O,e[o+$+1]^=de}let r=e[2],i=e[3];for(let o=0;o<24;o++){const c=ne[o],u=G(r,i,c),f=X(r,i,c),l=te[o];r=e[l],i=e[l+1],e[l]=u,e[l+1]=f}for(let o=0;o<50;o+=10){for(let c=0;c<10;c++)n[c]=e[o+c];for(let c=0;c<10;c++)e[o+c]^=~n[(c+2)%10]&n[(c+4)%10]}e[0]^=De[s],e[1]^=Ge[s]}Z(n)}class M extends qe{constructor(t,n,s,r=!1,i=24){if(super(),this.pos=0,this.posOut=0,this.finished=!1,this.destroyed=!1,this.enableXOF=!1,this.blockLen=t,this.suffix=n,this.outputLen=s,this.enableXOF=r,this.rounds=i,F(s),!(0<t&&t<200))throw new Error("only keccak-f1600 function is supported");this.state=new Uint8Array(200),this.state32=Pe(this.state)}clone(){return this._cloneInto()}keccak(){D(this.state32),Xe(this.state32,this.rounds),D(this.state32),this.posOut=0,this.pos=0}update(t){R(this),t=ee(t),L(t);const{blockLen:n,state:s}=this,r=t.length;for(let i=0;i<r;){const o=Math.min(n-this.pos,r-i);for(let c=0;c<o;c++)s[this.pos++]^=t[i++];this.pos===n&&this.keccak()}return this}finish(){if(this.finished)return;this.finished=!0;const{state:t,suffix:n,pos:s,blockLen:r}=this;t[s]^=n,(n&128)!==0&&s===r-1&&this.keccak(),t[r-1]^=128,this.keccak()}writeInto(t){R(this,!1),L(t),this.finish();const n=this.state,{blockLen:s}=this;for(let r=0,i=t.length;r<i;){this.posOut>=s&&this.keccak();const o=Math.min(s-this.posOut,i-r);t.set(n.subarray(this.posOut,this.posOut+o),r),this.posOut+=o,r+=o}return t}xofInto(t){if(!this.enableXOF)throw new Error("XOF is not possible for this instance");return this.writeInto(t)}xof(t){return F(t),this.xofInto(new Uint8Array(t))}digestInto(t){if(Ve(t,this),this.finished)throw new Error("digest() was already called");return this.writeInto(t),this.destroy(),t}digest(){return this.digestInto(new Uint8Array(this.outputLen))}destroy(){this.destroyed=!0,Z(this.state)}_cloneInto(t){const{blockLen:n,suffix:s,outputLen:r,rounds:i,enableXOF:o}=this;return t||(t=new M(n,s,r,o,i)),t.state32.set(this.state32),t.pos=this.pos,t.posOut=this.posOut,t.finished=this.finished,t.rounds=i,t.suffix=s,t.outputLen=r,t.enableXOF=o,t.destroyed=this.destroyed,t}}const Ke=(e,t,n)=>Me(()=>new M(t,e,n)),Ye=Ke(1,136,256/8);function We(e,t){return Ye(_(e,{strict:!1})?ke(e):e)}class Je extends b{constructor({address:t}){super(`Address "${t}" is invalid.`,{metaMessages:["- Address must be a hex value of 20 bytes (40 hex characters).","- Address must match its checksum counterpart."],name:"InvalidAddressError"})}}class ie extends Map{constructor(t){super(),Object.defineProperty(this,"maxSize",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),this.maxSize=t}get(t){const n=super.get(t);return super.has(t)&&n!==void 0&&(this.delete(t),super.set(t,n)),n}set(t,n){if(super.set(t,n),this.maxSize&&this.size>this.maxSize){const s=this.keys().next().value;s&&this.delete(s)}return this}}const V=new ie(8192);function oe(e,t){if(V.has(`${e}.${t}`))return V.get(`${e}.${t}`);const n=e.substring(2).toLowerCase(),s=We(Q(n)),r=n.split("");for(let o=0;o<40;o+=2)s[o>>1]>>4>=8&&r[o]&&(r[o]=r[o].toUpperCase()),(s[o>>1]&15)>=8&&r[o+1]&&(r[o+1]=r[o+1].toUpperCase());const i=`0x${r.join("")}`;return V.set(`${e}.${t}`,i),i}function Qe(e,t){if(!et(e,{strict:!1}))throw new Je({address:e});return oe(e,t)}const Ze=/^0x[a-fA-F0-9]{40}$/,P=new ie(8192);function et(e,t){const{strict:n=!0}=t??{},s=`${e}.${n}`;if(P.has(s))return P.get(s);const r=Ze.test(e)?e.toLowerCase()===e?!0:n?oe(e)===e:!0:!1;return P.set(s,r),r}const tt="https://gnosis-e702590.dedicated.hyperindex.xyz";let p=null,y=null,d=null,T=[],v=!1;const a=e=>document.getElementById(e);function S(e){return e?`${e.slice(0,6)}…${e.slice(-4)}`:"-"}function E(e){return e?new Date(Number(e)*1e3).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"-"}function m(e,t="info",n=4e3){var r;(r=document.querySelector(".toast"))==null||r.remove();const s=document.createElement("div");s.className=`toast ${t}`,s.textContent=e,document.body.appendChild(s),setTimeout(()=>s.remove(),n)}function ce(e){return e?typeof e=="string"?e:e.shortMessage?e.shortMessage:e.message?e.message:String(e):"Unknown error"}function k(e){var t;document.querySelectorAll(".view").forEach(n=>n.classList.add("hidden")),(t=a(e))==null||t.classList.remove("hidden")}async function C(e,t={}){var i;const n=await fetch(tt,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:e,variables:t})});if(!n.ok)throw new Error(`Indexer request failed: ${n.status}`);const{data:s,errors:r}=await n.json();if(r)throw new Error(((i=r[0])==null?void 0:i.message)||"GraphQL error");return s}async function nt(e){const t=`
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
  `;try{const n=await C(t,{address:e.toLowerCase()}),s=(n==null?void 0:n.backingCompleteds)||[];if(s.length===0)return null;const r=s[0];return{isBacker:!0,backingInstance:r.backingInstance,backingAsset:r.backingAsset,personalCircles:r.personalCircles,completedAt:r.blockTimestamp,transactionHash:r.transactionHash}}catch(n){return console.error("Failed to fetch backer status:",n),null}}async function st(e){const t=`
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
  `;try{const n=await C(t,{address:e.toLowerCase()});return((n==null?void 0:n.trustRelations)||[]).length>0}catch(n){return console.error("Failed to check indirect backer status:",n),!1}}async function ae(e=!0){const t=Math.floor(Date.now()/1e3),n=e?`
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
  `:`
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
  `;try{const s=await C(n,{now:String(t)});return(s==null?void 0:s.proposals)||[]}catch(s){return console.error("Failed to fetch proposals:",s),[]}}async function rt(e,t){const n=`
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
  `;try{const s=await C(n,{proposalId:e,voter:t.toLowerCase()}),r=(s==null?void 0:s.voteCasts)||[];return r.length===0?{hasVoted:!1,vote:null}:{hasVoted:!0,vote:r[0].support}}catch(s){return console.error("Failed to check vote status:",s),{hasVoted:!1,vote:null}}}function it(e){e&&(a("backing-instance").textContent=S(e.backingInstance),a("backing-instance").title=e.backingInstance,a("backing-asset").textContent=S(e.backingAsset),a("backing-asset").title=e.backingAsset,a("personal-circles").textContent=S(e.personalCircles),a("personal-circles").title=e.personalCircles,a("completed-at").textContent=E(e.completedAt))}function ue(e,t){const n=a(t);if(!e||e.length===0){n.innerHTML=`
      <div class="empty-state">
        <p>No proposals found</p>
      </div>
    `;return}n.innerHTML=e.map(s=>{var o;const r=Number(s.yesVotes||0)+Number(s.noVotes||0)+Number(s.abstainVotes||0),i=r>0?Math.round(Number(s.yesVotes||0)/r*100):0;return`
      <div class="proposal-item" data-id="${s.id}">
        <div class="proposal-item-header">
          <span class="status-badge ${((o=s.status)==null?void 0:o.toLowerCase())||"active"}">${s.status||"Active"}</span>
          <span class="proposal-date">${E(s.endTime)}</span>
        </div>
        <h4 class="proposal-title">${s.title||"Untitled Proposal"}</h4>
        <div class="proposal-preview">
          <div class="mini-result-bar">
            <div class="mini-yes" style="width: ${i}%"></div>
          </div>
          <span class="mini-percent">${i}% Yes</span>
        </div>
      </div>
    `}).join(""),n.querySelectorAll(".proposal-item").forEach(s=>{s.addEventListener("click",()=>{const r=s.dataset.id,i=e.find(o=>o.id===r);i&&le(i)})})}async function le(e){var u;if(d=e,k("proposal-detail-view"),a("detail-title").textContent=e.title||"Untitled Proposal",a("detail-description").textContent=e.description||"No description available.",a("detail-status").textContent=e.status||"Active",a("detail-status").className=`status-badge ${((u=e.status)==null?void 0:u.toLowerCase())||"active"}`,a("detail-created").textContent=E(e.createdAt),a("detail-ends").textContent=E(e.endTime),p){const{hasVoted:f,vote:l}=await rt(e.id,p);if(f){a("voting-section").classList.add("hidden"),a("voted-section").classList.remove("hidden");const O=l===1?"Yes":l===0?"No":"Abstain";a("your-vote").textContent=O}else a("voting-section").classList.remove("hidden"),a("voted-section").classList.add("hidden")}const t=Number(e.yesVotes||0)+Number(e.noVotes||0)+Number(e.abstainVotes||0),n=t>0?Number(e.yesVotes||0)/t*100:0,s=t>0?Number(e.noVotes||0)/t*100:0,r=t>0?Number(e.abstainVotes||0)/t*100:0,i=document.querySelector(".yes-segment"),o=document.querySelector(".no-segment"),c=document.querySelector(".abstain-segment");i&&(i.style.width=`${n}%`),o&&(o.style.width=`${s}%`),c&&(c.style.width=`${r}%`),a("yes-count").textContent=e.yesVotes||"0",a("no-count").textContent=e.noVotes||"0",a("abstain-count").textContent=e.abstainVotes||"0"}async function z(e,t){var n;if(!p||!y){m("You must be a backer to vote","error");return}try{const s=JSON.stringify({proposalId:e,support:t,voter:p,timestamp:Date.now()});m("Please sign the vote message...","info");const{signature:r}=await pe(s);console.log("Vote signed:",{proposalId:e,support:t,signature:r}),m("Vote submitted successfully!","success"),d&&le(d)}catch(s){console.error("Vote error:",s),(n=s.message)!=null&&n.includes("Rejected")?m("Vote cancelled","warn"):m(`Failed to submit vote: ${ce(s)}`,"error")}}function ot(){var e,t,n,s,r;(e=a("back-to-list-btn"))==null||e.addEventListener("click",()=>{d=null,k("backer-view")}),(t=a("vote-yes-btn"))==null||t.addEventListener("click",()=>{d&&z(d.id,1)}),(n=a("vote-no-btn"))==null||n.addEventListener("click",()=>{d&&z(d.id,0)}),(s=a("vote-abstain-btn"))==null||s.addEventListener("click",()=>{d&&z(d.id,2)}),(r=a("toggle-past-btn"))==null||r.addEventListener("click",async()=>{if(v=!v,a("past-proposals-list").classList.toggle("hidden",!v),a("toggle-past-btn").textContent=v?"Hide":"Show",v){const i=await ae(!1);ue(i,"past-proposals-list")}})}async function ct(e){if(k("backer-view"),ot(),y=await nt(e),!y){if(!await st(e)){k("not-backer-view");return}y={isBacker:!0,isIndirect:!0},m("You are an indirect backer through trust relationships","info")}it(y),T=await ae(!0),a("proposal-count").textContent=T.length,ue(T,"proposals-list")}ge(async e=>{if(console.log("[Backer Voting] Wallet change:",e),!e){p=null,y=null,a("wallet-status").textContent="Not connected",a("wallet-status").className="badge",k("disconnected-view");return}try{p=Qe(e),a("wallet-status").textContent=S(p),a("wallet-status").className="badge badge-success",await ct(p)}catch(t){console.error("[Backer Voting] Init error:",t),m(`Failed to initialise: ${ce(t)}`,"error")}});window.parent===window&&document.body.insertAdjacentHTML("afterbegin",'<div style="background:#fff9ea;padding:8px 16px;font-size:12px;text-align:center;border-bottom:1px solid #f8e4b3">Running in standalone mode. Load via Circles host for full functionality.</div>');

import { HolderRight, HOLDER_RIGHT_DEFINITIONS } from '../types';
import type { ProtocolClassification } from '../types';

function computeScore(rights: HolderRight[]): number {
  return rights.reduce((sum, r) => sum + HOLDER_RIGHT_DEFINITIONS[r].weight, 0);
}

function classify(
  slug: string,
  name: string,
  symbol: string,
  category: string,
  geckoId: string,
  holderRights: HolderRight[],
  holderRightsNotes: string,
): ProtocolClassification {
  return {
    slug,
    name,
    symbol,
    category,
    geckoId,
    holderRights,
    holderRightsScore: computeScore(holderRights),
    holderRightsNotes,
  };
}

// ── Curated classifications of top DeFi protocols ──
// These are manually researched and categorized based on public token documentation

export const PROTOCOL_CLASSIFICATIONS: ProtocolClassification[] = [
  // === DEXes ===
  classify('uniswap', 'Uniswap', 'UNI', 'DEX', 'uniswap',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'UNI holders govern protocol parameters and treasury. Fee switch exists but has not been activated for broad revenue share. Uniswap Foundation controls significant grants.'),

  classify('curve-dex', 'Curve Finance', 'CRV', 'DEX', 'curve-dao-token',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'veCRV holders earn 50% of trading fees, vote on gauge weights for emission allocation, and govern protocol parameters. One of the strongest veToken models in DeFi.'),

  classify('sushiswap', 'SushiSwap', 'SUSHI', 'DEX', 'sushi',
    [HolderRight.REVENUE_SHARE, HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'xSUSHI stakers receive a portion of trading fees. Governance voting on proposals. Revenue share mechanism via SushiBar staking.'),

  classify('pancakeswap', 'PancakeSwap', 'CAKE', 'DEX', 'pancakeswap-token',
    [HolderRight.STAKING_REWARDS, HolderRight.BUYBACK_BURN, HolderRight.GOVERNANCE_VOTING],
    'CAKE can be staked for rewards. Protocol burns CAKE regularly. IFO and governance participation for holders.'),

  classify('balancer', 'Balancer', 'BAL', 'DEX', 'balancer',
    [HolderRight.VETOKEN_MODEL, HolderRight.GOVERNANCE_VOTING, HolderRight.FEE_ACCRUAL],
    'veBAL (80/20 BAL/ETH LP locked) earns protocol fees and governs gauge weights. Strong veToken implementation.'),

  classify('trader-joe', 'Trader Joe', 'JOE', 'DEX', 'joe',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE, HolderRight.GOVERNANCE_VOTING],
    'sJOE stakers earn USDC from protocol fees. Revenue share from DEX trading volume.'),

  classify('velodrome', 'Velodrome', 'VELO', 'DEX', 'velodrome-finance',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING],
    'veVELO holders earn 100% of trading fees and bribes from pools they vote on. Fork of Solidly model.'),

  classify('aerodrome', 'Aerodrome', 'AERO', 'DEX', 'aerodrome-finance',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING],
    'veAERO holders earn 100% of trading fees and bribes. Base chain DEX using Solidly/Velodrome model.'),

  // === Lending ===
  classify('aave', 'Aave', 'AAVE', 'Lending', 'aave',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.TREASURY_GOVERNANCE, HolderRight.BUYBACK_BURN],
    'AAVE holders govern protocol parameters, risk settings, and treasury. Safety Module staking provides insurance backstop. Recent proposal for fee switch / buyback activated.'),

  classify('compound', 'Compound', 'COMP', 'Lending', 'compound-governance-token',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'COMP holders vote on protocol upgrades, risk parameters, and reserve factor. No direct revenue share to holders.'),

  classify('maker', 'MakerDAO', 'MKR', 'Lending', 'maker',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.BUYBACK_BURN, HolderRight.TREASURY_GOVERNANCE, HolderRight.REVENUE_SHARE],
    'MKR holders govern the Maker protocol. Surplus revenue buys back and burns MKR. Strong revenue accrual from stability fees. Renamed to Sky but MKR still trades.'),

  classify('venus', 'Venus', 'XVS', 'Lending', 'venus',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.TREASURY_GOVERNANCE],
    'XVS holders govern Venus protocol. XVS Vault staking earns rewards. Treasury governance participation.'),

  classify('morpho', 'Morpho', 'MORPHO', 'Lending', 'morpho',
    [HolderRight.GOVERNANCE_VOTING],
    'MORPHO token used for governance. Relatively new token with governance rights.'),

  // === Derivatives ===
  classify('gmx', 'GMX', 'GMX', 'Derivatives', 'gmx',
    [HolderRight.REVENUE_SHARE, HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'Staked GMX earns 30% of protocol fees in ETH/AVAX. One of the strongest revenue share models in DeFi. esGMX vesting mechanism.'),

  classify('dydx', 'dYdX', 'DYDX', 'Derivatives', 'dydx-chain',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'DYDX stakers on dYdX Chain earn protocol fees. Governance over chain parameters. Full revenue distribution to stakers.'),

  classify('synthetix', 'Synthetix', 'SNX', 'Derivatives', 'havven',
    [HolderRight.STAKING_REWARDS, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'SNX stakers mint sUSD and earn trading fees plus inflation rewards. Deep integration of staking with protocol function.'),

  classify('gains-network', 'Gains Network', 'GNS', 'Derivatives', 'gains-network',
    [HolderRight.STAKING_REWARDS, HolderRight.BUYBACK_BURN, HolderRight.GOVERNANCE_VOTING],
    'GNS staking earns portion of trading fees. Buyback and burn mechanism tied to platform revenue.'),

  // === Liquid Staking ===
  classify('lido', 'Lido', 'LDO', 'Liquid Staking', 'lido-dao',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'LDO holders govern Lido DAO. No direct revenue share to LDO holders — protocol revenue goes to stETH holders and node operators. LDO is purely governance.'),

  classify('rocket-pool', 'Rocket Pool', 'RPL', 'Liquid Staking', 'rocket-pool',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'RPL required as collateral for node operators. Governance via oDAO. Node operators earn commission from staking.'),

  // === Yield / Aggregators ===
  classify('convex-finance', 'Convex Finance', 'CVX', 'Yield', 'convex-finance',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE, HolderRight.STAKING_REWARDS],
    'vlCVX holders direct Curve and other gauge votes. CVX stakers earn platform fees. Bribes market for vote direction.'),

  classify('yearn-finance', 'Yearn Finance', 'YFI', 'Yield Aggregator', 'yearn-finance',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.BUYBACK_BURN, HolderRight.TREASURY_GOVERNANCE, HolderRight.STAKING_REWARDS],
    'YFI holders govern protocol. veYFI model introduced for fee sharing and boosted rewards. Protocol buys back YFI.'),

  classify('pendle', 'Pendle', 'PENDLE', 'Yield', 'pendle',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'vePENDLE holders earn swap fees and a share of yield from expired PTs. Vote on incentive channels. Strong veToken utility.'),

  // === Bridges / Infra ===
  classify('across', 'Across', 'ACX', 'Bridge', 'across-protocol',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'ACX staking provides bridging capital and earns fees. Governance over protocol parameters.'),

  classify('stargate', 'Stargate', 'STG', 'Bridge', 'stargate-finance',
    [HolderRight.VETOKEN_MODEL, HolderRight.GOVERNANCE_VOTING, HolderRight.FEE_ACCRUAL],
    'veSTG holders govern emission allocation and earn protocol fees. Built on LayerZero.'),

  // === Stablecoins / CDP ===
  classify('liquity', 'Liquity', 'LQTY', 'CDP', 'liquity',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'LQTY stakers earn borrowing and redemption fees in ETH and LUSD. Direct revenue share from protocol usage.'),

  classify('frax', 'Frax Finance', 'FXS', 'CDP', 'frax-share',
    [HolderRight.VETOKEN_MODEL, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE, HolderRight.TREASURY_GOVERNANCE],
    'veFXS holders earn protocol revenue, govern Frax ecosystem parameters and gauge weights. Multi-product ecosystem.'),

  // === Other Notable ===
  classify('1inch-network', '1inch', '1INCH', 'DEX Aggregator', '1inch',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    '1INCH stakers participate in governance and earn Unicorn Power for fee discounts. Limited direct revenue share.'),

  classify('the-graph', 'The Graph', 'GRT', 'Indexing', 'the-graph',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'GRT is staked by indexers, curators, and delegators to earn query fees. Governance over protocol parameters.'),

  classify('chainlink', 'Chainlink', 'LINK', 'Oracle', 'chainlink',
    [HolderRight.STAKING_REWARDS],
    'LINK staking recently launched with limited staking pools earning fees from oracle services. No governance rights for holders.'),

  classify('ethereum-name-service', 'ENS', 'ENS', 'Identity', 'ethereum-name-service',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'ENS holders govern the ENS DAO and treasury. No direct revenue share — registration fees go to DAO treasury.'),

  classify('raydium', 'Raydium', 'RAY', 'DEX', 'raydium',
    [HolderRight.STAKING_REWARDS, HolderRight.BUYBACK_BURN],
    'RAY staking earns rewards. Protocol buys back RAY with portion of fees.'),

  classify('jupiter', 'Jupiter', 'JUP', 'DEX Aggregator', 'jupiter-exchange-solana',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'JUP holders participate in governance and Active Staking Rewards. Launchpad allocation rights.'),

  classify('ethena', 'Ethena', 'ENA', 'CDP', 'ethena',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'sENA stakers earn protocol yield. Governance participation. USDe yield derived from basis trade.'),

  classify('hyperliquid-dex', 'Hyperliquid', 'HYPE', 'Derivatives', 'hyperliquid',
    [HolderRight.STAKING_REWARDS, HolderRight.BUYBACK_BURN],
    'HYPE token used on L1 chain. Revenue from trading fees used for buybacks. Staking secures the network.'),

  classify('eigen-layer', 'EigenLayer', 'EIGEN', 'Restaking', 'eigenlayer',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'EIGEN used for staking/restaking to secure AVSs. Governance over protocol direction. Intersubjective slashing mechanism.'),
];

// Create lookup by slug
export const CLASSIFICATIONS_BY_SLUG: Record<string, ProtocolClassification> = {};
PROTOCOL_CLASSIFICATIONS.forEach((p) => {
  CLASSIFICATIONS_BY_SLUG[p.slug] = p;
});

// Create lookup by geckoId
export const CLASSIFICATIONS_BY_GECKO: Record<string, ProtocolClassification> = {};
PROTOCOL_CLASSIFICATIONS.forEach((p) => {
  CLASSIFICATIONS_BY_GECKO[p.geckoId] = p;
});

// ── Holder Rights Classification ──

export enum HolderRight {
  GOVERNANCE_VOTING = 'governance_voting',
  REVENUE_SHARE = 'revenue_share',
  FEE_ACCRUAL = 'fee_accrual',
  BUYBACK_BURN = 'buyback_burn',
  STAKING_REWARDS = 'staking_rewards',
  TREASURY_GOVERNANCE = 'treasury_governance',
  VETOKEN_MODEL = 'vetoken_model',
  NONE = 'none',
}

export interface HolderRightDefinition {
  id: HolderRight;
  label: string;
  description: string;
  weight: number; // 0-10 score for how much value this right provides
}

export const HOLDER_RIGHT_DEFINITIONS: Record<HolderRight, HolderRightDefinition> = {
  [HolderRight.GOVERNANCE_VOTING]: {
    id: HolderRight.GOVERNANCE_VOTING,
    label: 'Governance Voting',
    description: 'Token holders can vote on protocol proposals and parameter changes',
    weight: 3,
  },
  [HolderRight.REVENUE_SHARE]: {
    id: HolderRight.REVENUE_SHARE,
    label: 'Revenue Share',
    description: 'Protocol revenue is distributed directly to token holders',
    weight: 10,
  },
  [HolderRight.FEE_ACCRUAL]: {
    id: HolderRight.FEE_ACCRUAL,
    label: 'Fee Accrual',
    description: 'Token value accrues fees through mechanism design (e.g., fee switch)',
    weight: 8,
  },
  [HolderRight.BUYBACK_BURN]: {
    id: HolderRight.BUYBACK_BURN,
    label: 'Buyback & Burn',
    description: 'Protocol uses revenue to buy back and burn tokens, reducing supply',
    weight: 7,
  },
  [HolderRight.STAKING_REWARDS]: {
    id: HolderRight.STAKING_REWARDS,
    label: 'Staking Rewards',
    description: 'Token holders earn rewards by staking their tokens',
    weight: 5,
  },
  [HolderRight.TREASURY_GOVERNANCE]: {
    id: HolderRight.TREASURY_GOVERNANCE,
    label: 'Treasury Governance',
    description: 'Token holders govern protocol treasury allocation',
    weight: 4,
  },
  [HolderRight.VETOKEN_MODEL]: {
    id: HolderRight.VETOKEN_MODEL,
    label: 'veToken Model',
    description: 'Vote-escrowed tokenomics providing boosted rewards and governance power',
    weight: 9,
  },
  [HolderRight.NONE]: {
    id: HolderRight.NONE,
    label: 'No Rights',
    description: 'Token provides no direct holder rights or value accrual',
    weight: 0,
  },
};

// ── Protocol Classification ──

export interface ProtocolClassification {
  slug: string;
  name: string;
  symbol: string;
  category: string;
  geckoId: string;
  holderRights: HolderRight[];
  holderRightsScore: number; // computed from weights
  holderRightsNotes: string;
}

// ── API Response Types ──

export interface DefiLlamaProtocol {
  id: string;
  name: string;
  symbol: string;
  url: string;
  description: string;
  chain: string;
  chains: string[];
  category: string;
  tvl: number;
  mcap: number | null;
  change_1d: number | null;
  change_7d: number | null;
  gecko_id: string;
  slug: string;
  logo: string;
}

export interface FeeRevenueData {
  totalDataChart: [number, number][];
  totalDataChartBreakdown: Record<string, Record<string, number>>[];
  protocols: ProtocolFeeData[];
  total24h: number;
  total7d: number;
  total30d: number;
}

export interface ProtocolFeeData {
  name: string;
  slug: string;
  module: string;
  total24h: number | null;
  total7d: number | null;
  total30d: number | null;
  totalAllTime: number | null;
  category: string;
  logo: string;
  chains: string[];
  methodologyURL: string;
}

export interface ProtocolSummaryFees {
  name: string;
  slug: string;
  totalDataChart: [number, number][];
  total24h: number | null;
  total7d: number | null;
  total30d: number | null;
  totalAllTime: number | null;
}

export interface CoinPrice {
  symbol: string;
  price: number;
  timestamp: number;
  confidence: number;
}

export interface CoinChart {
  symbol: string;
  confidence: number;
  prices: { timestamp: number; price: number }[];
}

// ── Dashboard Data Types ──

export interface EnrichedProtocol {
  slug: string;
  name: string;
  symbol: string;
  category: string;
  geckoId: string;
  logo: string;
  tvl: number;
  mcap: number | null;
  revenue24h: number | null;
  revenue7d: number | null;
  revenue30d: number | null;
  revenueAllTime: number | null;
  fees24h: number | null;
  fees30d: number | null;
  holderRights: HolderRight[];
  holderRightsScore: number;
  holderRightsNotes: string;
  priceHistory: { timestamp: number; price: number }[];
  revenueHistory: [number, number][];
  mcapToRevenue: number | null;
  tvlToRevenue: number | null;
}

export interface CorrelationPoint {
  name: string;
  symbol: string;
  holderRightsScore: number;
  holderRights: HolderRight[];
  mcap: number | null;
  revenue30d: number | null;
  tvl: number;
  priceChange30d: number | null;
  mcapToRevenue: number | null;
}

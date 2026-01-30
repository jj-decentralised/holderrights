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
// Manually researched from protocol documentation, governance forums, and token contracts.
// ~150 protocols across all major DeFi verticals.

export const PROTOCOL_CLASSIFICATIONS: ProtocolClassification[] = [

  // ═══════════════════════════════════════════════════════════════
  // DEXes
  // ═══════════════════════════════════════════════════════════════

  classify('uniswap', 'Uniswap', 'UNI', 'DEX', 'uniswap',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'UNI holders govern protocol parameters and treasury. Fee switch exists but has not been activated for broad revenue share. Uniswap Foundation controls significant grants.'),

  classify('curve-dex', 'Curve Finance', 'CRV', 'DEX', 'curve-dao-token',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'veCRV holders earn 50% of trading fees, vote on gauge weights for emission allocation, and govern protocol parameters.'),

  classify('sushiswap', 'SushiSwap', 'SUSHI', 'DEX', 'sushi',
    [HolderRight.REVENUE_SHARE, HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'xSUSHI stakers receive a portion of trading fees. Governance voting on proposals.'),

  classify('pancakeswap', 'PancakeSwap', 'CAKE', 'DEX', 'pancakeswap-token',
    [HolderRight.STAKING_REWARDS, HolderRight.BUYBACK_BURN, HolderRight.GOVERNANCE_VOTING],
    'CAKE can be staked for rewards. Protocol burns CAKE regularly. IFO and governance participation.'),

  classify('balancer', 'Balancer', 'BAL', 'DEX', 'balancer',
    [HolderRight.VETOKEN_MODEL, HolderRight.GOVERNANCE_VOTING, HolderRight.FEE_ACCRUAL],
    'veBAL (80/20 BAL/ETH LP locked) earns protocol fees and governs gauge weights.'),

  classify('trader-joe', 'Trader Joe', 'JOE', 'DEX', 'joe',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE, HolderRight.GOVERNANCE_VOTING],
    'sJOE stakers earn USDC from protocol fees. Revenue share from DEX trading volume.'),

  classify('velodrome', 'Velodrome', 'VELO', 'DEX', 'velodrome-finance',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING],
    'veVELO holders earn 100% of trading fees and bribes from pools they vote on. Solidly model.'),

  classify('aerodrome', 'Aerodrome', 'AERO', 'DEX', 'aerodrome-finance',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING],
    'veAERO holders earn 100% of trading fees and bribes. Base chain DEX using Solidly/Velodrome model.'),

  classify('raydium', 'Raydium', 'RAY', 'DEX', 'raydium',
    [HolderRight.STAKING_REWARDS, HolderRight.BUYBACK_BURN],
    'RAY staking earns rewards. Protocol buys back RAY with portion of fees.'),

  classify('orca', 'Orca', 'ORCA', 'DEX', 'orca',
    [HolderRight.GOVERNANCE_VOTING],
    'ORCA token used for governance. No direct fee share to holders. Leading Solana DEX.'),

  classify('camelot-dex', 'Camelot', 'GRAIL', 'DEX', 'camelot-token',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE, HolderRight.GOVERNANCE_VOTING],
    'xGRAIL holders earn protocol fees and boosted yields. Dividend model from DEX revenue.'),

  classify('osmosis-dex', 'Osmosis', 'OSMO', 'DEX', 'osmosis',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.TREASURY_GOVERNANCE],
    'OSMO stakers earn staking rewards and govern Cosmos DEX parameters. Superfluid staking.'),

  classify('thena-fi', 'Thena', 'THE', 'DEX', 'thena',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING],
    'veTHE holders earn trading fees and bribes. BNB Chain ve(3,3) DEX.'),

  classify('maverick-protocol', 'Maverick', 'MAV', 'DEX', 'maverick-protocol',
    [HolderRight.VETOKEN_MODEL, HolderRight.GOVERNANCE_VOTING],
    'veMAV used for governance and boosted incentive direction. Concentrated liquidity AMM.'),

  classify('quickswap-dex', 'QuickSwap', 'QUICK', 'DEX', 'quickswap',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'QUICK staking earns protocol rewards. Dragon\'s Lair staking model. Polygon DEX.'),

  classify('baseswap', 'BaseSwap', 'BSWAP', 'DEX', 'baseswap',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'xBSWAP stakers earn protocol fee revenue. Base chain DEX.'),

  classify('spookyswap', 'SpookySwap', 'BOO', 'DEX', 'spookyswap',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'xBOO stakers earn share of trading fees. Fantom DEX.'),

  classify('spiritswap', 'SpiritSwap', 'SPIRIT', 'DEX', 'spiritswap',
    [HolderRight.VETOKEN_MODEL, HolderRight.GOVERNANCE_VOTING, HolderRight.FEE_ACCRUAL],
    'inSPIRIT holders earn trading fees and direct gauge emissions. Fantom ve(3,3).'),

  classify('pharaoh-exchange', 'Pharaoh', 'PHAR', 'DEX', 'pharaoh-exchange',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING],
    'vePHAR holders earn fees and bribes. Avalanche ve(3,3) DEX.'),

  classify('ramses-exchange', 'Ramses', 'RAM', 'DEX', 'ramses-exchange',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING],
    'veRAM holders earn fees and bribes. Arbitrum ve(3,3) DEX.'),

  classify('equalizer-exchange', 'Equalizer', 'EQUAL', 'DEX', 'equalizer-dex',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING],
    'veEQUAL holders earn fees and bribes. Fantom/Sonic ve(3,3) DEX.'),

  classify('shadow-exchange', 'Shadow', 'SHADOW', 'DEX', 'shadow-2',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING],
    'xSHADOW holders earn fees. Sonic chain ve(3,3) DEX with novel x(3,3) model.'),

  // ═══════════════════════════════════════════════════════════════
  // DEX Aggregators
  // ═══════════════════════════════════════════════════════════════

  classify('1inch-network', '1inch', '1INCH', 'DEX Aggregator', '1inch',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    '1INCH stakers participate in governance and earn Unicorn Power for fee discounts. Limited direct revenue share.'),

  classify('jupiter', 'Jupiter', 'JUP', 'DEX Aggregator', 'jupiter-exchange-solana',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'JUP holders participate in governance and Active Staking Rewards. Launchpad allocation rights.'),

  classify('paraswap', 'ParaSwap', 'PSP', 'DEX Aggregator', 'paraswap',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'sPSP stakers earn boosted rewards. Social escrow staking model.'),

  classify('cow-protocol', 'CoW Protocol', 'COW', 'DEX Aggregator', 'cow-protocol',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'COW token used for governance and solver staking. MEV protection protocol.'),

  classify('dodo-bsc', 'DODO', 'DODO', 'DEX Aggregator', 'dodo',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING, HolderRight.BUYBACK_BURN],
    'vDODO holders earn DODO rewards and trading fee dividends. Membership token model.'),

  classify('openocean', 'OpenOcean', 'OOE', 'DEX Aggregator', 'openocean',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'OOE governance and staking. Cross-chain DEX aggregator.'),

  // ═══════════════════════════════════════════════════════════════
  // Lending / Borrowing
  // ═══════════════════════════════════════════════════════════════

  classify('aave', 'Aave', 'AAVE', 'Lending', 'aave',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.TREASURY_GOVERNANCE, HolderRight.BUYBACK_BURN],
    'AAVE holders govern protocol parameters and treasury. Safety Module staking. Recent buyback activation.'),

  classify('compound', 'Compound', 'COMP', 'Lending', 'compound-governance-token',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'COMP holders vote on protocol upgrades and risk parameters. No direct revenue share.'),

  classify('maker', 'MakerDAO', 'MKR', 'Lending', 'maker',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.BUYBACK_BURN, HolderRight.TREASURY_GOVERNANCE, HolderRight.REVENUE_SHARE],
    'MKR holders govern Maker. Surplus buys back and burns MKR. Strong revenue accrual from stability fees.'),

  classify('venus', 'Venus', 'XVS', 'Lending', 'venus',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.TREASURY_GOVERNANCE],
    'XVS holders govern Venus. XVS Vault staking earns rewards.'),

  classify('morpho', 'Morpho', 'MORPHO', 'Lending', 'morpho',
    [HolderRight.GOVERNANCE_VOTING],
    'MORPHO token used for governance. Peer-to-peer lending optimizer.'),

  classify('radiant', 'Radiant Capital', 'RDNT', 'Lending', 'radiant-capital',
    [HolderRight.REVENUE_SHARE, HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'dLP lockers earn 60% of protocol fees. Dynamic liquidity provision requirement for emissions.'),

  classify('benqi-lending', 'BENQI', 'QI', 'Lending', 'benqi',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'QI used for governance and veQI staking to boost rewards. Avalanche lending.'),

  classify('spark', 'Spark', 'SPK', 'Lending', 'spark',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'SPK token for governance of Spark protocol (MakerDAO subDAO). Sky ecosystem lending.'),

  classify('euler', 'Euler', 'EUL', 'Lending', 'euler',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'EUL holders govern Euler v2. Modular lending protocol with vault architecture.'),

  classify('silo-finance', 'Silo', 'SILO', 'Lending', 'silo-finance',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'SILO governance and staking. Isolated lending markets for risk containment.'),

  classify('cream-finance', 'Cream Finance', 'CREAM', 'Lending', 'cream-2',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'CREAM governance token. iceCREAM staking model.'),

  classify('kamino-lending', 'Kamino', 'KMNO', 'Lending', 'kamino',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'KMNO token for governance and staking. Leading Solana lending protocol.'),

  classify('fluid', 'Fluid', 'FLUID', 'Lending', 'fluid-2',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'FLUID governance and revenue share from lending and DEX operations. Instadapp rebrand.'),

  classify('justlend', 'JustLend', 'JST', 'Lending', 'just',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'JST governance token for JustLend on TRON. Staking available.'),

  // ═══════════════════════════════════════════════════════════════
  // Derivatives / Perpetuals
  // ═══════════════════════════════════════════════════════════════

  classify('gmx', 'GMX', 'GMX', 'Derivatives', 'gmx',
    [HolderRight.REVENUE_SHARE, HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'Staked GMX earns 30% of protocol fees in ETH/AVAX. One of the strongest revenue share models.'),

  classify('dydx', 'dYdX', 'DYDX', 'Derivatives', 'dydx-chain',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'DYDX stakers on dYdX Chain earn protocol fees. Full revenue distribution to stakers.'),

  classify('synthetix', 'Synthetix', 'SNX', 'Derivatives', 'havven',
    [HolderRight.STAKING_REWARDS, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'SNX stakers mint sUSD and earn trading fees plus inflation rewards.'),

  classify('gains-network', 'Gains Network', 'GNS', 'Derivatives', 'gains-network',
    [HolderRight.STAKING_REWARDS, HolderRight.BUYBACK_BURN, HolderRight.GOVERNANCE_VOTING],
    'GNS staking earns trading fees. Buyback and burn mechanism.'),

  classify('hyperliquid-dex', 'Hyperliquid', 'HYPE', 'Derivatives', 'hyperliquid',
    [HolderRight.STAKING_REWARDS, HolderRight.BUYBACK_BURN],
    'HYPE token on L1 chain. Revenue from trading fees used for buybacks. Network staking.'),

  classify('perpetual-protocol', 'Perpetual Protocol', 'PERP', 'Derivatives', 'perpetual-protocol',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'vePERP stakers earn trading fees and governance power. Optimism-based perps.'),

  classify('kwenta', 'Kwenta', 'KWENTA', 'Derivatives', 'kwenta',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'staked KWENTA earns trading fee revenue and inflationary rewards. Built on Synthetix.'),

  classify('mux-protocol', 'MUX', 'MCB', 'Derivatives', 'mux-protocol',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE, HolderRight.GOVERNANCE_VOTING],
    'veMUX holders earn protocol fees. Leveraged trading aggregator.'),

  classify('vertex-protocol', 'Vertex', 'VRTX', 'Derivatives', 'vertex-protocol',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'VRTX stakers earn portion of trading fees. Arbitrum perps DEX.'),

  classify('hmx', 'HMX', 'HMX', 'Derivatives', 'hmx',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'HMX stakers earn protocol fees. Arbitrum leveraged trading platform.'),

  classify('level-finance', 'Level Finance', 'LVL', 'Derivatives', 'level',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE, HolderRight.GOVERNANCE_VOTING],
    'LVL stakers earn BNB rewards from trading fees. Loyalty program with LGO governance token.'),

  classify('aevo', 'Aevo', 'AEVO', 'Derivatives', 'aevo-exchange',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'AEVO staking and governance. Options and perpetuals exchange built by Ribbon.'),

  classify('drift-protocol', 'Drift', 'DRIFT', 'Derivatives', 'drift-protocol',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'DRIFT governance and staking. Leading Solana perpetuals DEX.'),

  classify('rabbitx', 'RabbitX', 'RBX', 'Derivatives', 'rabbitx',
    [HolderRight.STAKING_REWARDS],
    'RBX staking for rewards. Orderbook perpetuals exchange.'),

  // ═══════════════════════════════════════════════════════════════
  // Liquid Staking
  // ═══════════════════════════════════════════════════════════════

  classify('lido', 'Lido', 'LDO', 'Liquid Staking', 'lido-dao',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'LDO holders govern Lido DAO. No direct revenue share — revenue goes to stETH holders and operators.'),

  classify('rocket-pool', 'Rocket Pool', 'RPL', 'Liquid Staking', 'rocket-pool',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'RPL required as collateral for node operators. Governance via oDAO.'),

  classify('jito', 'Jito', 'JTO', 'Liquid Staking', 'jito-governance-token',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'JTO governance over Jito DAO. MEV-enhanced Solana liquid staking. No direct revenue share.'),

  classify('marinade', 'Marinade', 'MNDE', 'Liquid Staking', 'marinade',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'MNDE governance and staking incentives. Solana liquid staking protocol.'),

  classify('stader', 'Stader', 'SD', 'Liquid Staking', 'stader',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'SD used for governance and as node operator collateral. Multi-chain liquid staking.'),

  classify('stakewise', 'StakeWise', 'SWISE', 'Liquid Staking', 'stakewise',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'SWISE governance token. StakeWise V3 vault-based staking.'),

  classify('ankr', 'Ankr', 'ANKR', 'Liquid Staking', 'ankr',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'ANKR token for governance and staking. Multi-chain liquid staking and RPC infrastructure.'),

  classify('puffer-finance', 'Puffer', 'PUFFER', 'Liquid Staking', 'puffer-finance',
    [HolderRight.GOVERNANCE_VOTING],
    'PUFFER governance token. Liquid restaking protocol built on EigenLayer.'),

  classify('ether-fi', 'Ether.fi', 'ETHFI', 'Liquid Staking', 'ether-fi',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'ETHFI governance for ether.fi protocol. Decentralized liquid staking and restaking.'),

  // ═══════════════════════════════════════════════════════════════
  // Restaking
  // ═══════════════════════════════════════════════════════════════

  classify('eigen-layer', 'EigenLayer', 'EIGEN', 'Restaking', 'eigenlayer',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'EIGEN used for restaking to secure AVSs. Governance and intersubjective slashing.'),

  classify('karak', 'Karak', 'KARAK', 'Restaking', 'karak-network',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'KARAK governance and restaking. Multi-asset restaking layer.'),

  // ═══════════════════════════════════════════════════════════════
  // Yield / Aggregators
  // ═══════════════════════════════════════════════════════════════

  classify('convex-finance', 'Convex Finance', 'CVX', 'Yield', 'convex-finance',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE, HolderRight.STAKING_REWARDS],
    'vlCVX holders direct Curve gauge votes. CVX stakers earn platform fees. Bribes market.'),

  classify('yearn-finance', 'Yearn Finance', 'YFI', 'Yield Aggregator', 'yearn-finance',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.BUYBACK_BURN, HolderRight.TREASURY_GOVERNANCE, HolderRight.STAKING_REWARDS],
    'YFI holders govern protocol. veYFI model for fee sharing. Protocol buys back YFI.'),

  classify('pendle', 'Pendle', 'PENDLE', 'Yield', 'pendle',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'vePENDLE holders earn swap fees and yield from expired PTs. Vote on incentive channels.'),

  classify('beefy', 'Beefy', 'BIFI', 'Yield Aggregator', 'beefy-finance',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE, HolderRight.STAKING_REWARDS],
    'BIFI stakers earn protocol revenue from vault performance fees. Multi-chain yield optimizer.'),

  classify('aura-finance', 'Aura Finance', 'AURA', 'Yield', 'aura-finance',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE, HolderRight.STAKING_REWARDS],
    'vlAURA holders direct Balancer gauge votes. Aura stakers earn boosted BAL rewards.'),

  classify('concentrator', 'Concentrator', 'CTR', 'Yield', 'concentrator',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'veCTR holders earn concentrated Curve/Convex yields. Yield optimizer for CRV ecosystem.'),

  classify('sommelier', 'Sommelier', 'SOMM', 'Yield', 'sommelier-2',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'SOMM governance and validator staking. DeFi vault platform on Cosmos.'),

  classify('harvest-finance', 'Harvest', 'FARM', 'Yield Aggregator', 'harvest-finance',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'FARM stakers earn 30% of farming profits. Auto-compounding yield aggregator.'),

  classify('badger-dao', 'Badger DAO', 'BADGER', 'Yield', 'badger-dao',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.TREASURY_GOVERNANCE],
    'BADGER governance and staking. Bitcoin-focused DeFi yield strategies.'),

  classify('spectra', 'Spectra', 'SPECTRA', 'Yield', 'spectra-finance',
    [HolderRight.VETOKEN_MODEL, HolderRight.GOVERNANCE_VOTING],
    'veSpectra holders direct incentives and earn fees. Interest rate derivatives.'),

  classify('stakedao', 'Stake DAO', 'SDT', 'Yield', 'stake-dao',
    [HolderRight.VETOKEN_MODEL, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'veSDT holders earn protocol fees and direct Curve/Pendle gauge votes. Liquid lockers.'),

  // ═══════════════════════════════════════════════════════════════
  // CDP / Stablecoins
  // ═══════════════════════════════════════════════════════════════

  classify('liquity', 'Liquity', 'LQTY', 'CDP', 'liquity',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'LQTY stakers earn borrowing and redemption fees in ETH and LUSD.'),

  classify('frax', 'Frax Finance', 'FXS', 'CDP', 'frax-share',
    [HolderRight.VETOKEN_MODEL, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE, HolderRight.TREASURY_GOVERNANCE],
    'veFXS holders earn protocol revenue and govern ecosystem parameters and gauge weights.'),

  classify('ethena', 'Ethena', 'ENA', 'CDP', 'ethena',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'sENA stakers earn protocol yield. USDe yield derived from basis trade.'),

  classify('prisma-finance', 'Prisma', 'PRISMA', 'CDP', 'prisma-governance-token',
    [HolderRight.VETOKEN_MODEL, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'vePRISMA holders earn protocol fees and direct emission weights. LST-backed stablecoin.'),

  classify('spell', 'Abracadabra', 'SPELL', 'CDP', 'spell-token',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE, HolderRight.GOVERNANCE_VOTING],
    'sSPELL stakers earn protocol fees from MIM borrowing. Interest-bearing stablecoin.'),

  classify('alchemix', 'Alchemix', 'ALCX', 'CDP', 'alchemix',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.TREASURY_GOVERNANCE],
    'ALCX governance and staking. Self-repaying loans via yield-bearing deposits.'),

  classify('inverse-finance', 'Inverse Finance', 'INV', 'CDP', 'inverse-finance',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE, HolderRight.STAKING_REWARDS],
    'INV stakers earn DOLA borrowing fees. DOLA stablecoin and Fed system.'),

  classify('usual', 'Usual', 'USUAL', 'CDP', 'usual',
    [HolderRight.REVENUE_SHARE, HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'USUAL holders earn protocol revenue from RWA-backed stablecoin USD0. Revenue redistribution model.'),

  classify('lista-dao', 'Lista DAO', 'LISTA', 'CDP', 'lista-dao',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'LISTA governance and staking. BNB Chain CDP and liquid staking.'),

  classify('angle-protocol', 'Angle', 'ANGLE', 'Stablecoin', 'angle-protocol',
    [HolderRight.VETOKEN_MODEL, HolderRight.GOVERNANCE_VOTING, HolderRight.FEE_ACCRUAL],
    'veANGLE holders earn protocol fees and govern parameters. EURA (agEUR) stablecoin.'),

  classify('reflexer', 'Reflexer', 'FLX', 'Stablecoin', 'reflexer-ungovernance-token',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'FLX minimalist governance. RAI non-pegged stablecoin. Ungovernance model.'),

  classify('reserve-rights', 'Reserve', 'RSR', 'Stablecoin', 'reserve-rights-token',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'RSR stakers provide overcollateralization for RTokens and earn revenue. Governance over basket composition.'),

  // ═══════════════════════════════════════════════════════════════
  // Bridges / Cross-chain
  // ═══════════════════════════════════════════════════════════════

  classify('across', 'Across', 'ACX', 'Bridge', 'across-protocol',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'ACX staking provides bridging capital and earns fees.'),

  classify('stargate', 'Stargate', 'STG', 'Bridge', 'stargate-finance',
    [HolderRight.VETOKEN_MODEL, HolderRight.GOVERNANCE_VOTING, HolderRight.FEE_ACCRUAL],
    'veSTG holders govern emission allocation and earn fees. Built on LayerZero.'),

  classify('hop-protocol', 'Hop Protocol', 'HOP', 'Bridge', 'hop-protocol',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'HOP governance over protocol parameters and treasury. L2 bridge protocol.'),

  classify('synapse-2', 'Synapse', 'SYN', 'Bridge', 'synapse-2',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'SYN staking for bridge security and rewards. Cross-chain messaging.'),

  classify('celer-network', 'Celer', 'CELR', 'Bridge', 'celer-network',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'CELR staking for bridge security. State guardian network staking.'),

  classify('wormhole', 'Wormhole', 'W', 'Bridge', 'wormhole',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'W token for governance and staking. Leading cross-chain messaging protocol.'),

  classify('layerzero', 'LayerZero', 'ZRO', 'Bridge', 'layerzero',
    [HolderRight.GOVERNANCE_VOTING],
    'ZRO governance token. Omnichain interoperability protocol.'),

  classify('axelar', 'Axelar', 'AXL', 'Bridge', 'axelar',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'AXL staking secures the Axelar network. Cosmos-based cross-chain messaging.'),

  classify('connext', 'Connext', 'NEXT', 'Bridge', 'connext',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'NEXT governance and staking. Modular cross-chain protocol.'),

  // ═══════════════════════════════════════════════════════════════
  // Infrastructure / Oracles / Indexing
  // ═══════════════════════════════════════════════════════════════

  classify('chainlink', 'Chainlink', 'LINK', 'Oracle', 'chainlink',
    [HolderRight.STAKING_REWARDS],
    'LINK staking launched with limited pools earning oracle service fees. No governance.'),

  classify('the-graph', 'The Graph', 'GRT', 'Indexing', 'the-graph',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'GRT staked by indexers/curators/delegators for query fees. Governance over parameters.'),

  classify('api3', 'API3', 'API3', 'Oracle', 'api3',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'API3 stakers provide insurance and earn dAPI fees. Governance via staking pool.'),

  classify('pyth-network', 'Pyth Network', 'PYTH', 'Oracle', 'pyth-network',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'PYTH governance and staking. Leading pull oracle for Solana and multi-chain.'),

  classify('band-protocol', 'Band Protocol', 'BAND', 'Oracle', 'band-protocol',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'BAND staking secures oracle network. Validator delegation model.'),

  classify('uma', 'UMA', 'UMA', 'Oracle', 'uma',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'UMA voters earn fees for resolving oracle disputes. Optimistic oracle system.'),

  classify('ethereum-name-service', 'ENS', 'ENS', 'Identity', 'ethereum-name-service',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'ENS holders govern the ENS DAO and treasury. Registration fees go to DAO.'),

  // ═══════════════════════════════════════════════════════════════
  // Options / Structured Products
  // ═══════════════════════════════════════════════════════════════

  classify('lyra', 'Lyra', 'LYRA', 'Options', 'lyra-finance',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'LYRA staking for boosted trading rewards and governance. Options AMM.'),

  classify('dopex', 'Dopex', 'DPX', 'Options', 'dopex',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE, HolderRight.GOVERNANCE_VOTING],
    'veDPX earns protocol fees. Rebate model for option writers and stakers.'),

  classify('premia', 'Premia', 'PREMIA', 'Options', 'premia',
    [HolderRight.VETOKEN_MODEL, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING],
    'vePREMIA holders earn protocol fees and governance power. Options marketplace.'),

  classify('hegic', 'Hegic', 'HEGIC', 'Options', 'hegic',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'HEGIC stakers earn options settlement fees. On-chain options protocol.'),

  classify('thales', 'Thales', 'THALES', 'Options', 'thales',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING, HolderRight.REVENUE_SHARE],
    'THALES stakers earn protocol fees from sports/crypto markets. Built on Synthetix.'),

  // ═══════════════════════════════════════════════════════════════
  // Insurance
  // ═══════════════════════════════════════════════════════════════

  classify('nexus-mutual', 'Nexus Mutual', 'NXM', 'Insurance', 'nexus-mutual',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'NXM holders govern the mutual, stake to assess risk, and share in insurance premiums.'),

  classify('insurace', 'InsurAce', 'INSUR', 'Insurance', 'insurace',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'INSUR governance and mining rewards. Multi-chain DeFi insurance.'),

  // ═══════════════════════════════════════════════════════════════
  // Real World Assets (RWA)
  // ═══════════════════════════════════════════════════════════════

  classify('ondo-finance', 'Ondo Finance', 'ONDO', 'RWA', 'ondo-finance',
    [HolderRight.GOVERNANCE_VOTING],
    'ONDO governance token. Tokenized treasuries and RWA yield products. No revenue share.'),

  classify('centrifuge', 'Centrifuge', 'CFG', 'RWA', 'centrifuge',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'CFG governance and staking on Centrifuge chain. Real-world asset tokenization.'),

  classify('maple', 'Maple Finance', 'MPL', 'RWA', 'maple',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'xMPL stakers earn protocol fees from institutional lending. Revenue share from loan origination.'),

  classify('goldfinch', 'Goldfinch', 'GFI', 'RWA', 'goldfinch',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'GFI governance and staking for credit lines. Real-world credit protocol.'),

  classify('truefi', 'TrueFi', 'TRU', 'RWA', 'truefi',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'stkTRU stakers earn protocol fees and approve loans. Uncollateralized lending.'),

  classify('clearpool', 'Clearpool', 'CPOOL', 'RWA', 'clearpool',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'CPOOL governance and staking. Institutional unsecured lending marketplace.'),

  // ═══════════════════════════════════════════════════════════════
  // Prediction Markets / Social
  // ═══════════════════════════════════════════════════════════════

  classify('gnosis', 'Gnosis', 'GNO', 'Prediction Market', 'gnosis',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'GNO stakers validate Gnosis Chain and earn fees. GnosisDAO governance over treasury.'),

  // ═══════════════════════════════════════════════════════════════
  // NFT / Gaming Related DeFi
  // ═══════════════════════════════════════════════════════════════

  classify('blur', 'Blur', 'BLUR', 'NFT Marketplace', 'blur',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'BLUR governance and staking. Leading NFT marketplace with Blend lending.'),

  classify('looks-rare', 'LooksRare', 'LOOKS', 'NFT Marketplace', 'looksrare',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'LOOKS stakers earn 100% of platform trading fees in WETH. Direct revenue share.'),

  classify('x2y2', 'X2Y2', 'X2Y2', 'NFT Marketplace', 'x2y2',
    [HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'X2Y2 stakers earn platform trading fees. NFT marketplace fee distribution.'),

  // ═══════════════════════════════════════════════════════════════
  // L1 / L2 DeFi-native chains
  // ═══════════════════════════════════════════════════════════════

  classify('thorchain', 'THORChain', 'RUNE', 'Cross-chain DEX', 'thorchain',
    [HolderRight.STAKING_REWARDS, HolderRight.FEE_ACCRUAL, HolderRight.GOVERNANCE_VOTING],
    'RUNE required as pair asset for all pools. Node operators stake RUNE and earn fees. Deep fee accrual.'),

  classify('injective-protocol', 'Injective', 'INJ', 'L1 DeFi', 'injective-protocol',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING, HolderRight.BUYBACK_BURN],
    'INJ staking earns fees. Weekly burn auctions reduce supply from exchange fees.'),

  classify('sei-network', 'Sei', 'SEI', 'L1 DeFi', 'sei-network',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'SEI staking secures the network and earns fees. Trading-optimized L1.'),

  classify('kava', 'Kava', 'KAVA', 'L1 DeFi', 'kava',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'KAVA staking and Cosmos governance. DeFi-focused L1 with lending and stablecoin.'),

  classify('canto', 'Canto', 'CANTO', 'L1 DeFi', 'canto',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'CANTO staking and governance. Free public infrastructure DeFi chain.'),

  // ═══════════════════════════════════════════════════════════════
  // Governance / Meta-governance
  // ═══════════════════════════════════════════════════════════════

  classify('paladin-finance', 'Paladin', 'PAL', 'Governance', 'paladin',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'PAL governance and staking. Vote marketplace and governance lending.'),

  classify('redacted-cartel', 'Redacted', 'BTRFLY', 'Governance', 'redacted',
    [HolderRight.REVENUE_SHARE, HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING],
    'rlBTRFLY holders earn revenue from Pirex, Hidden Hand bribes marketplace, and Dinero protocol.'),

  // ═══════════════════════════════════════════════════════════════
  // Payments
  // ═══════════════════════════════════════════════════════════════

  classify('request-network', 'Request', 'REQ', 'Payments', 'request-network',
    [HolderRight.STAKING_REWARDS, HolderRight.BUYBACK_BURN, HolderRight.GOVERNANCE_VOTING],
    'REQ burned with each payment request. Staking for dispute resolution.'),

  // ═══════════════════════════════════════════════════════════════
  // Leveraged Yield / Advanced Strategies
  // ═══════════════════════════════════════════════════════════════

  classify('alpaca-finance', 'Alpaca Finance', 'ALPACA', 'Leveraged Yield', 'alpaca-finance',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.BUYBACK_BURN],
    'xALPACA governance staking. Protocol buyback and burn from leveraged yield farming fees.'),

  classify('gearbox', 'Gearbox', 'GEAR', 'Leveraged Yield', 'gearbox',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'GEAR governance over protocol parameters and treasury. Composable leverage protocol.'),

  // ═══════════════════════════════════════════════════════════════
  // Vaults / Asset Management
  // ═══════════════════════════════════════════════════════════════

  classify('enzyme-finance', 'Enzyme', 'MLN', 'Asset Management', 'melon',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.BUYBACK_BURN],
    'MLN governance. Inflation used for development, MLN burned on vault gas usage.'),

  classify('dhedge', 'dHEDGE', 'DHT', 'Asset Management', 'dhedge-dao',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'DHT governance and performance mining. Decentralized asset management.'),

  classify('index-coop', 'Index Coop', 'INDEX', 'Asset Management', 'index-cooperative',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'INDEX governs the cooperative and treasury. DeFi index products.'),

  // ═══════════════════════════════════════════════════════════════
  // Liquid Restaking
  // ═══════════════════════════════════════════════════════════════

  classify('renzo', 'Renzo', 'REZ', 'Liquid Restaking', 'renzo',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'REZ governance and staking. ezETH liquid restaking token.'),

  classify('kelp-dao', 'Kelp DAO', 'KELP', 'Liquid Restaking', 'kelp-dao',
    [HolderRight.GOVERNANCE_VOTING],
    'KELP governance. rsETH liquid restaking token.'),

  classify('swell-network', 'Swell', 'SWELL', 'Liquid Restaking', 'swell-network',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'SWELL governance and staking. swETH and rswETH liquid staking/restaking.'),

  // ═══════════════════════════════════════════════════════════════
  // Misc DeFi
  // ═══════════════════════════════════════════════════════════════

  classify('tokemak', 'Tokemak', 'TOKE', 'Liquidity', 'tokemak',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'TOKE stakers direct liquidity and earn rewards. Autopilot liquidity routing.'),

  classify('olympus', 'Olympus', 'OHM', 'Reserve Currency', 'olympus',
    [HolderRight.STAKING_REWARDS, HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE, HolderRight.REVENUE_SHARE],
    'OHM stakers earn rebases from treasury yield. gOHM governance over treasury. RBS revenue distribution.'),

  classify('dforce', 'dForce', 'DF', 'DeFi Hub', 'dforce-token',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'DF governance and staking. Integrated DeFi protocol suite with lending and stablecoin.'),

  classify('benddao', 'BendDAO', 'BEND', 'NFT Lending', 'benddao',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS],
    'veBEND governance and staking. NFT-backed peer-to-pool lending.'),

  classify('nftx', 'NFTX', 'NFTX', 'NFT DeFi', 'nftx',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.STAKING_REWARDS, HolderRight.REVENUE_SHARE],
    'NFTX stakers earn vault fees from NFT trading. Liquidity protocol for NFTs.'),

  classify('radworks', 'Radworks', 'RAD', 'Developer Tooling', 'radicle',
    [HolderRight.GOVERNANCE_VOTING, HolderRight.TREASURY_GOVERNANCE],
    'RAD governance over Radworks treasury and grants. Decentralized code collaboration.'),
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

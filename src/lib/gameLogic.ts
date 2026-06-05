import { 
  Decision, 
  INITIAL_VALUES, 
  PRODUCTS, 
  RoundResult, 
  Team, 
  GameEvent, 
  Product, 
  SimulationParameters, 
  DEFAULT_PARAMETERS,
  Contract,
  Delivery,
  StationConfig,
  DEFAULT_STATIONS
} from '../types';

export function calculateDemand(
  round: number,
  marketingSpend: number,
  event?: GameEvent | null,
  productsList: Product[] = PRODUCTS
): Record<string, number> {
  const baseDemand = 120 + Math.floor(Math.sin(round / 5) * 20);
  const marketingMultiplier = 1 + (Math.log10(marketingSpend + 1) / 5);
  
  let eventMultiplier = 1;
  if (event?.type === 'demand_surge') {
    if (event.severity === 'low') eventMultiplier = 1.3;
    if (event.severity === 'medium') eventMultiplier = 1.6;
    if (event.severity === 'high') eventMultiplier = 2.0;
  }
  
  const demand: Record<string, number> = {};
  productsList.forEach(product => {
    const randomness = 0.85 + Math.random() * 0.3;
    demand[product.id] = Math.max(10, Math.floor(baseDemand * marketingMultiplier * eventMultiplier * randomness));
  });
  
  return demand;
}

// Helper to seed standard contracts at key raw material milestones
export function getInitialContracts(): Contract[] {
  return [
    {
      id: 'valmart',
      name: 'Valmart',
      appearsAtDay: 1,
      beginsAtDay: 4,
      endsAtDay: 11,
      dailyDemand: 100,
      pricePerUnit: 23,
      fillRateRequired: 90,
      fillRatePenalty: 500,
      exitPenalty: 5000,
      status: 'offered',
      deliveredCount: 0,
      demandedCount: 0
    },
    {
      id: 'tresco',
      name: 'Tresco',
      appearsAtDay: 4,
      beginsAtDay: 12,
      endsAtDay: 20,
      dailyDemand: 350,
      pricePerUnit: 40,
      fillRateRequired: 95,
      fillRatePenalty: 1000,
      exitPenalty: 47500,
      status: 'pending',
      deliveredCount: 0,
      demandedCount: 0
    }
  ];
}

export function processDecision(
  team: Team,
  decision: Decision,
  round: number,
  prevResults: RoundResult[],
  capacity: number,
  event?: GameEvent | null,
  parameters: SimulationParameters = DEFAULT_PARAMETERS
): { updatedTeam: Team; result: RoundResult } {
  
  // Initialize customizable properties on team if missing
  const stations = team.stations || JSON.parse(JSON.stringify(DEFAULT_STATIONS));

  // If icing config is missing, initialize it
  if (!stations.icing) {
    stations.icing = { ...DEFAULT_STATIONS.icing };
  }
  
  const deliveries: Delivery[] = team.deliveries || [];
  const contracts: Contract[] = team.contracts || getInitialContracts();
  
  // Initialize 4 ingredients stocks if missing
  let flour = team.flourStock !== undefined ? team.flourStock : Math.round(0.35 * team.rawMaterials);
  let sugar = team.sugarStock !== undefined ? team.sugarStock : Math.round(0.25 * team.rawMaterials);
  let eggs = team.eggsStock !== undefined ? team.eggsStock : Math.round(0.20 * team.rawMaterials);
  let cocoa = team.cocoaStock !== undefined ? team.cocoaStock : Math.round(0.20 * team.rawMaterials);

  // Initialize reorder policies (Q, R)
  const flourQ = team.flourOrderQty !== undefined ? team.flourOrderQty : 2000;
  const flourR = team.flourROP !== undefined ? team.flourROP : 500;
  const sugarQ = team.sugarOrderQty !== undefined ? team.sugarOrderQty : 1500;
  const sugarR = team.sugarROP !== undefined ? team.sugarROP : 400;
  const eggsQ = team.eggsOrderQty !== undefined ? team.eggsOrderQty : 1200;
  const eggsR = team.eggsROP !== undefined ? team.eggsROP : 300;
  const cocoaQ = team.cocoaOrderQty !== undefined ? team.cocoaOrderQty : 800;
  const cocoaR = team.cocoaROP !== undefined ? team.cocoaROP : 200;

  let rawMaterialPrice = parameters.rawMaterialUnitPrice;
  if (event?.type === 'material_shortage') {
    if (event.severity === 'low') rawMaterialPrice *= 1.5;
    if (event.severity === 'medium') rawMaterialPrice *= 2.0;
    if (event.severity === 'high') rawMaterialPrice *= 3.0;
  }

  // 1. Deliveries Arrive
  const currentDeliveries = deliveries.filter(d => d.roundArriving === round);
  const remainingDeliveries = deliveries.filter(d => d.roundArriving !== round);
  
  // Distribute arriving deliveries to respective ingredients
  currentDeliveries.forEach(d => {
    const item = d.item || 'flour'; // default to flour
    if (item === 'flour') flour += d.quantity;
    else if (item === 'sugar') sugar += d.quantity;
    else if (item === 'eggs') eggs += d.quantity;
    else if (item === 'cocoa') cocoa += d.quantity;
  });

  // 2. Production Stage (Continuous flow constrained by raw materials and bottleneck capacity)
  let mixingCap = stations.mixing.active * stations.mixing.capacityPerMachine;
  let bottlingCap = stations.bottling.active * stations.bottling.capacityPerMachine;
  let icingCap = stations.icing.active * stations.icing.capacityPerMachine;
  let packagingCap = stations.packaging.active * stations.packaging.capacityPerMachine;

  if (event?.type === 'machine_breakdown') {
    const penaltyRatio = event.severity === 'low' ? 0.8 : event.severity === 'medium' ? 0.6 : 0.4;
    mixingCap = Math.round(mixingCap * penaltyRatio);
    bottlingCap = Math.round(bottlingCap * penaltyRatio);
    icingCap = Math.round(icingCap * penaltyRatio);
    packagingCap = Math.round(packagingCap * penaltyRatio);
  }

  const bottleneckCapacity = Math.min(mixingCap, bottlingCap, icingCap, packagingCap);
  
  // Realized production is bottlenecked by available materials & production capacity
  const maxProductionFromMaterials = Math.min(flour, sugar, cocoa);
  const actualProduction = Math.min(bottleneckCapacity, maxProductionFromMaterials);

  // Consume materials
  flour -= actualProduction;
  sugar -= actualProduction;
  cocoa -= actualProduction;

  // Incur daily variable production charge
  const standardProduct = parameters.products.find(p => p.id === 'standard') || PRODUCTS[0];
  const productionCost = actualProduction * standardProduct.productionCost;
  let finishedGoodsStock = (team.inventory['standard'] || 0) + actualProduction;

  // 3. Continuous (Q, R) Policy Trigger Evaluation
  // Evaluated on cumulative inventory level position = physical RM + pending shipments
  let rawMaterialOrderCost = 0;

  // Flour
  const incomingFlour = remainingDeliveries.filter(d => d.item === 'flour' || !d.item).reduce((acc, d) => acc + d.quantity, 0);
  if (flour + incomingFlour <= flourR) {
    remainingDeliveries.push({ roundArriving: round + parameters.baseLeadTime, quantity: flourQ, item: 'flour' });
    rawMaterialOrderCost += (flourQ * rawMaterialPrice) + 100;
  }
  // Sugar
  const incomingSugar = remainingDeliveries.filter(d => d.item === 'sugar').reduce((acc, d) => acc + d.quantity, 0);
  if (sugar + incomingSugar <= sugarR) {
    remainingDeliveries.push({ roundArriving: round + parameters.baseLeadTime, quantity: sugarQ, item: 'sugar' });
    rawMaterialOrderCost += (sugarQ * rawMaterialPrice) + 100;
  }
  // Eggs
  const incomingEggs = remainingDeliveries.filter(d => d.item === 'eggs').reduce((acc, d) => acc + d.quantity, 0);
  if (eggs + incomingEggs <= eggsR) {
    remainingDeliveries.push({ roundArriving: round + parameters.baseLeadTime, quantity: eggsQ, item: 'eggs' });
    rawMaterialOrderCost += (eggsQ * rawMaterialPrice) + 100;
  }
  // Cocoa
  const incomingCocoa = remainingDeliveries.filter(d => d.item === 'cocoa').reduce((acc, d) => acc + d.quantity, 0);
  if (cocoa + incomingCocoa <= cocoaR) {
    remainingDeliveries.push({ roundArriving: round + parameters.baseLeadTime, quantity: cocoaQ, item: 'cocoa' });
    rawMaterialOrderCost += (cocoaQ * rawMaterialPrice) + 100;
  }

  // 4. Sales Phase
  // Dynamic update of contract states and offers
  const updatedContracts = contracts.map(c => {
    // Contract becomes offered at their target appear day.
    // We check round + 1 because this logic runs at the end of the current round to prepare the state for the next round.
    if (c.status === 'pending' && (round + 1) >= c.appearsAtDay) {
      return { ...c, status: 'offered' };
    }
    return c;
  });

  // Evaluate active accepted contracts
  const activeContracts = updatedContracts.filter(c => c.status === 'accepted' && round >= c.beginsAtDay && round <= c.endsAtDay);
  
  let contractRevenue = 0;
  let totalContractDemanded = 0;
  let totalContractDelivered = 0;

  activeContracts.forEach(c => {
    const demand = c.dailyDemand;
    totalContractDemanded += demand;

    const delivered = Math.min(finishedGoodsStock, demand);
    finishedGoodsStock -= delivered;
    totalContractDelivered += delivered;

    c.deliveredCount += delivered;
    c.demandedCount += demand;
    contractRevenue += delivered * c.pricePerUnit;
  });

  // Evaluate retail (walk-in) customer demands
  const calculatedDemands = calculateDemand(round, decision.marketingSpend, event);
  const retailDemand = calculatedDemands['standard'] || 100;

  const deliveredRetail = Math.min(finishedGoodsStock, retailDemand);
  finishedGoodsStock -= deliveredRetail;
  
  const retailRevenue = deliveredRetail * standardProduct.sellingPrice;
  const missedRetailDemand = retailDemand - deliveredRetail;

  const totalRevenue = contractRevenue + retailRevenue;

  // 5. Carry Holding storage fees
  const holdingCharges = finishedGoodsStock * parameters.storageCost; // $1.00 per bottle remaining
  
  // 6. Interest Compounding
  // Earn 10% interest or pay 10% overdraft penalty on current balance divided by 365 daily steps
  const interestRate = 0.10 / 365;
  const compoundingInterest = team.balance * interestRate;

  // 7. Check Contract Expiries & compliance penalties
  let contractPenalties = 0;
  updatedContracts.forEach(c => {
    if (c.status === 'accepted' && round === c.endsAtDay) {
      const fillRate = c.demandedCount > 0 ? (c.deliveredCount / c.demandedCount) : 0;
      const targetRequired = c.fillRateRequired / 100;
      if (fillRate < targetRequired) {
        contractPenalties += c.fillRatePenalty;
      }
      c.status = 'finished';
    }
  });

  const totalOpex = productionCost + rawMaterialOrderCost + holdingCharges + contractPenalties + (missedRetailDemand * parameters.backorderPenalty);
  const profit = totalRevenue - totalOpex + compoundingInterest;
  const nextBalance = team.balance + profit;

  // Service Level Rating update
  const totalDayDemanded = totalContractDemanded + retailDemand;
  const totalDayDelivered = totalContractDelivered + deliveredRetail;
  const serviceLevelIndex = totalDayDemanded > 0 ? (totalDayDelivered / totalDayDemanded) : 1;
  const nextSatisfaction = Math.max(0, Math.min(100, Math.round((team.satisfaction * 0.9) + (serviceLevelIndex * 10))));

  const updatedTeam: Team = {
    ...team,
    balance: nextBalance,
    inventory: { standard: finishedGoodsStock },
    rawMaterials: flour + sugar + eggs + cocoa, // Total raw materials is the sum of all 4 ingredients
    flourStock: flour,
    sugarStock: sugar,
    eggsStock: eggs,
    cocoaStock: cocoa,
    satisfaction: nextSatisfaction,
    ready: false,
    orderQuantity: flourQ, // sync default for fallback
    reorderPoint: flourR,
    flourOrderQty: flourQ,
    flourROP: flourR,
    sugarOrderQty: sugarQ,
    sugarROP: sugarR,
    eggsOrderQty: eggsQ,
    eggsROP: eggsR,
    cocoaOrderQty: cocoaQ,
    cocoaROP: cocoaR,
    stations,
    deliveries: remainingDeliveries,
    contracts: updatedContracts
  };
  
  delete updatedTeam.currentDecision; // Prevent Firebase crash with undefined

  const result: RoundResult = {
    id: `r${round}`,
    sessionId: team.sessionId,
    teamId: team.id,
    round,
    revenue: totalRevenue,
    profit,
    soldQty: { standard: totalDayDelivered },
    missedDemand: { standard: totalDayDemanded - totalDayDelivered },
    productionCost,
    inventoryCost: holdingCharges,
    rawMaterialCost: rawMaterialOrderCost,
    marketingCost: decision.marketingSpend,
    penalties: contractPenalties + (missedRetailDemand * parameters.backorderPenalty),
    balanceAfter: nextBalance
  };

  return { updatedTeam, result };
}

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
  productsList: Product[] = PRODUCTS,
  satisfaction: number = 100
): Record<string, number> {
  const baseDemand = 120;
  const marketingMultiplier = 1 + (Math.log10(marketingSpend + 1) / 5);
  const reputationMultiplier = 0.5 + (satisfaction / 100);
  const marketTrend = 1.0 + Math.sin(round / 5) * 0.2;
  
  let eventMultiplier = 1;
  if (event?.type === 'demand_surge') {
    if (event.severity === 'low') eventMultiplier = 1.3;
    if (event.severity === 'medium') eventMultiplier = 1.8;
    if (event.severity === 'high') eventMultiplier = 2.5;
  } else if (event?.type === 'material_shortage') {
    eventMultiplier = 0.75;
  }

  const demand: Record<string, number> = {};
  productsList.forEach(product => {
    const randomVariance = 0.90 + Math.random() * 0.20;
    demand[product.id] = Math.max(10, Math.floor(
      baseDemand * 
      marketingMultiplier * 
      reputationMultiplier * 
      marketTrend * 
      eventMultiplier * 
      randomVariance
    ));
  });
  
  return demand;
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
  const safeParameters = parameters ?? DEFAULT_PARAMETERS;
  
  // Initialize customizable properties on team if missing
  const stations = team.stations || JSON.parse(JSON.stringify(DEFAULT_STATIONS));

  // If icing config is missing, initialize it
  if (!stations.icing) {
    stations.icing = { ...DEFAULT_STATIONS.icing };
  }
  
  const deliveries: Delivery[] = team.deliveries || [];
  const contracts: Contract[] = team.contracts || [];
  
  // Helper to safely parse numbers
  const safeNum = (val: any, fallback: number) => (typeof val === 'number' && !isNaN(val)) ? val : fallback;

  // Initialize 4 ingredients stocks if missing
  let flour = safeNum(team.flourStock, Math.round(0.35 * team.rawMaterials));
  let sugar = safeNum(team.sugarStock, Math.round(0.25 * team.rawMaterials));
  let eggs = safeNum(team.eggsStock, Math.round(0.20 * team.rawMaterials));
  let cocoa = safeNum(team.cocoaStock, Math.round(0.20 * team.rawMaterials));

  // Initialize reorder policies (Q, R)
  const flourQ = safeNum(team.flourOrderQty, 2000);
  const flourR = safeNum(team.flourROP, 500);
  const sugarQ = safeNum(team.sugarOrderQty, 1500);
  const sugarR = safeNum(team.sugarROP, 400);
  const eggsQ = safeNum(team.eggsOrderQty, 1200);
  const eggsR = safeNum(team.eggsROP, 300);
  const cocoaQ = safeNum(team.cocoaOrderQty, 800);
  const cocoaR = safeNum(team.cocoaROP, 200);

  let rawMaterialPrice = safeParameters.rawMaterialUnitPrice;
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
  const totalMachines = 
    (stations.mixing?.owned ?? 2) + 
    (stations.bottling?.owned ?? 3) + 
    (stations.icing?.owned ?? 2) + 
    (stations.packaging?.owned ?? 1);

  let milestoneTier = 0;
  if (totalMachines >= 100) milestoneTier = 4;
  else if (totalMachines >= 50) milestoneTier = 3;
  else if (totalMachines >= 25) milestoneTier = 2;
  else if (totalMachines >= 10) milestoneTier = 1;

  const milestoneMultiplier = 1 + (milestoneTier * 0.5);

  const trainingMultiplier = 1 + (round * 0.02);
  const moraleMultiplier = 0.5 + (team.satisfaction / 200);

  // Mixing Capacity (WorkerCapacity)
  const workerEfficiency = 3 * trainingMultiplier * moraleMultiplier;
  let mixingCap = Math.round((stations.mixing.active) * workerEfficiency * 18 * milestoneMultiplier);

  // Oven Capacity (OvenCapacity)
  let bottlingCap = Math.round((stations.bottling.active) * 1.33 * 18 * milestoneMultiplier);

  // Icing Capacity
  let icingCap = Math.round((stations.icing.active) * 3.05 * 18 * milestoneMultiplier);

  // Packaging Capacity
  let packagingCap = Math.round((stations.packaging.active) * 12 * 18 * milestoneMultiplier);

  if (event?.type === 'machine_breakdown') {
    const penaltyRatio = event.severity === 'low' ? 0.8 : event.severity === 'medium' ? 0.6 : 0.4;
    mixingCap = Math.round(mixingCap * penaltyRatio);
    bottlingCap = Math.round(bottlingCap * penaltyRatio);
    icingCap = Math.round(icingCap * penaltyRatio);
    packagingCap = Math.round(packagingCap * penaltyRatio);
  }

  const bottleneckCapacity = Math.min(mixingCap, bottlingCap, icingCap, packagingCap);
  
  // Realized production is bottlenecked by available materials & production capacity
  const maxProductionFromMaterials = Math.min(flour, sugar, eggs, cocoa);
  const actualProduction = Math.min(bottleneckCapacity, maxProductionFromMaterials);

  // Consume materials
  flour -= actualProduction;
  sugar -= actualProduction;
  eggs -= actualProduction;
  cocoa -= actualProduction;

  // Incur daily variable production charge
  const standardProduct = safeParameters.products.find(p => p.id === 'standard') || PRODUCTS[0];
  const productionCost = actualProduction * standardProduct.productionCost;
  let finishedGoodsStock = (team.inventory['standard'] || 0) + actualProduction;

  // 3. Continuous (Q, R) Policy Trigger Evaluation
  // Evaluated on cumulative inventory level position = physical RM + pending shipments
  let rawMaterialOrderCost = 0;

  // Flour
  const incomingFlour = remainingDeliveries.filter(d => d.item === 'flour').reduce((acc, d) => acc + d.quantity, 0);
  if (flour + incomingFlour <= flourR) {
    remainingDeliveries.push({ roundArriving: round + safeParameters.baseLeadTime, quantity: flourQ, item: 'flour' });
    rawMaterialOrderCost += (flourQ * rawMaterialPrice) + 100;
  }
  // Sugar
  const incomingSugar = remainingDeliveries.filter(d => d.item === 'sugar').reduce((acc, d) => acc + d.quantity, 0);
  if (sugar + incomingSugar <= sugarR) {
    remainingDeliveries.push({ roundArriving: round + safeParameters.baseLeadTime, quantity: sugarQ, item: 'sugar' });
    rawMaterialOrderCost += (sugarQ * rawMaterialPrice) + 100;
  }
  // Eggs
  const incomingEggs = remainingDeliveries.filter(d => d.item === 'eggs').reduce((acc, d) => acc + d.quantity, 0);
  if (eggs + incomingEggs <= eggsR) {
    remainingDeliveries.push({ roundArriving: round + safeParameters.baseLeadTime, quantity: eggsQ, item: 'eggs' });
    rawMaterialOrderCost += (eggsQ * rawMaterialPrice) + 100;
  }
  // Cocoa
  const incomingCocoa = remainingDeliveries.filter(d => d.item === 'cocoa').reduce((acc, d) => acc + d.quantity, 0);
  if (cocoa + incomingCocoa <= cocoaR) {
    remainingDeliveries.push({ roundArriving: round + safeParameters.baseLeadTime, quantity: cocoaQ, item: 'cocoa' });
    rawMaterialOrderCost += (cocoaQ * rawMaterialPrice) + 100;
  }

  // 4. Sales Phase
  // Dynamic update of contract states and offers
  const updatedContracts = contracts.map(c => {
    if (c.status === 'pending' && (round + 1) >= c.appearsAtDay) {
      return { ...c, status: 'offered' as const };
    }
    return c;
  });

  // Evaluate active accepted contracts
  const activeContracts = updatedContracts.filter(c => c.status === 'accepted' && round >= c.beginsAtDay && round <= c.endsAtDay);
  
  let contractRevenue = 0;
  let totalContractDemanded = 0;
  let totalContractDelivered = 0;

  const recipeMultiplier = 1.2; // Premium Recipe
  const reputationMultiplier = 0.5 + (team.satisfaction / 100);
  
  let eventMultiplier = 1;
  if (event?.type === 'demand_surge') {
    if (event.severity === 'low') eventMultiplier = 1.3;
    if (event.severity === 'medium') eventMultiplier = 1.8;
    if (event.severity === 'high') eventMultiplier = 2.5;
  } else if (event?.type === 'material_shortage') {
    eventMultiplier = 0.75;
  }

  activeContracts.forEach(c => {
    const demand = c.dailyDemand;
    totalContractDemanded += demand;

    const delivered = Math.min(finishedGoodsStock, demand);
    finishedGoodsStock -= delivered;
    totalContractDelivered += delivered;

    c.deliveredCount += delivered;
    c.demandedCount += demand;
    
    // Revenue = Sold * Price * recipe * reputation * event
    contractRevenue += Math.round(delivered * c.pricePerUnit * recipeMultiplier * reputationMultiplier * eventMultiplier);
  });

  // Evaluate retail (walk-in) customer demands
  const calculatedDemands = calculateDemand(round, decision.marketingSpend, event, PRODUCTS, team.satisfaction);
  const retailDemand = calculatedDemands['standard'] || 100;

  const deliveredRetail = Math.min(finishedGoodsStock, retailDemand);
  finishedGoodsStock -= deliveredRetail;
  
  // Revenue = Sold * Price * recipe * reputation * event
  const retailRevenue = Math.round(deliveredRetail * standardProduct.sellingPrice * recipeMultiplier * reputationMultiplier * eventMultiplier);
  const missedRetailDemand = retailDemand - deliveredRetail;

  const totalRevenue = contractRevenue + retailRevenue;

  // 5. Carry Holding storage fees
  const holdingCharges = finishedGoodsStock * safeParameters.storageCost; // $1.00 per bottle remaining
  
  // 6. Interest Compounding
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

  // Dynamic Difficulty Multiplier to adjust Opex costs slightly based on balance
  const difficultyMultiplier = 1;

  const opexProduction = Math.round(productionCost * difficultyMultiplier);
  const opexRawMaterial = Math.round(rawMaterialOrderCost * difficultyMultiplier);
  const opexHolding = Math.round(holdingCharges * difficultyMultiplier);
  const opexBackorder = Math.round(missedRetailDemand * safeParameters.backorderPenalty * difficultyMultiplier);

  const totalOpex = opexProduction + opexRawMaterial + opexHolding + contractPenalties + opexBackorder + decision.marketingSpend;
  const profit = totalRevenue - totalOpex + compoundingInterest;
  const nextBalance = team.balance + profit;

  // Service Level Rating update
  const totalDayDemanded = totalContractDemanded + retailDemand;
  const totalDayDelivered = totalContractDelivered + deliveredRetail;
  const serviceLevelIndex = Math.min(1, totalDayDemanded > 0 ? (totalDayDelivered / totalDayDemanded) : 1);
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
    penalties: contractPenalties + (missedRetailDemand * safeParameters.backorderPenalty),
    balanceAfter: nextBalance
  };

  return { updatedTeam, result };
}

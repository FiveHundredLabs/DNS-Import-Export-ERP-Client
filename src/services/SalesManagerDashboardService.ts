import { reportService } from './ReportService';
import { MOCK_USERS } from '../mock/mockUsers';
import { MOCK_AREAS } from '../mock/mockAreas';
import { User } from '../types/auth';
import {
  AreaTerritoryPerformanceData,
  SubordinateRepPerformanceItem,
} from '../types/commission';
import { commissionService } from './CommissionService';
import { commissionConfigService } from './CommissionConfigService';

export interface SalesManagerKpis {
  teamSales: number;
  unpaidInvoices: number;
  activeAreaManagers: number;
  totalSalesReps: number;
}

export interface AreaManagerPerformanceData {
  managerId: string;
  managerName: string;
  target: number;
  achieved: number;
  salesReps: {
    repId: string;
    repName: string;
    target: number;
    achieved: number;
    achievementPercentage: number;
  }[];
}

export interface SalesManagerDashboardData {
  kpis: SalesManagerKpis;
  areaManagerPerformances: AreaManagerPerformanceData[];
  agingBuckets: { bucket: string; amount: number; customerCount: number }[];
}

class SalesManagerDashboardService {
  async getDashboardData(user: User): Promise<SalesManagerDashboardData> {
    const activeAreaManagers = MOCK_USERS.filter((u) => u.role === 'AREA_MANAGER' && u.isActive).length;
    const totalSalesReps = MOCK_USERS.filter((u) => u.role === 'SALES_REP' && u.isActive).length;

    const financeReport = await reportService.getFinanceReport(user);
    const kpiSummary = await reportService.getExecutiveKpis(user);

    const teamSales = kpiSummary.grossRevenue;
    const unpaidInvoices = financeReport.totalReceivables;

    const managerMap = new Map<string, AreaManagerPerformanceData>();

    for (const area of MOCK_AREAS) {
      try {
        const areaData = await reportService.getAreaPerformanceReport(area.id, user);
        
        // Ensure there's a target, if 0 fallback to some mock targets based on area
        let target = areaData.totalTarget;
        if (!target || target === 0) {
           // Mock targets around 15M to 30M
           target = area.id === 'area-01' ? 25000000 : area.id === 'area-02' ? 15000000 : 20000000;
        }

        const managerId = areaData.areaManagerId || 'unassigned-manager';
        const managerName = areaData.areaManagerName || 'Unassigned Area Manager';

        if (!managerMap.has(managerId)) {
          managerMap.set(managerId, {
            managerId,
            managerName,
            target: 0,
            achieved: 0,
            salesReps: []
          });
        }

        const managerPerf = managerMap.get(managerId)!;
        managerPerf.target += target;
        managerPerf.achieved += areaData.totalSales;

        for (const rep of areaData.repPerformance) {
          const existingRep = managerPerf.salesReps.find(r => r.repId === rep.repId);
          const repTarget = rep.target || 5000000;
          if (existingRep) {
            existingRep.target += repTarget;
            existingRep.achieved += rep.sales;
            existingRep.achievementPercentage = existingRep.target > 0 ? (existingRep.achieved / existingRep.target) * 100 : 0;
          } else {
            managerPerf.salesReps.push({
              repId: rep.repId,
              repName: rep.repName,
              target: repTarget,
              achieved: rep.sales,
              achievementPercentage: repTarget > 0 ? (rep.sales / repTarget) * 100 : 0,
            });
          }
        }
      } catch (err) {
        console.warn(`Could not fetch data for area ${area.id}`, err);
      }
    }

    const areaManagerPerformances = Array.from(managerMap.values());

    return {
      kpis: {
        teamSales,
        unpaidInvoices,
        activeAreaManagers,
        totalSalesReps,
      },
      areaManagerPerformances,
      agingBuckets: financeReport.agingBuckets,
    };
  }

  /**
   * Retrieves regional territory performance, manager surplus incentives,
   * and subordinate rep arrays for an Area Manager's assigned territory.
   */
  async getAreaPerformance(
    areaId: string,
    selectedMonth: string = new Date().toISOString().slice(0, 7)
  ): Promise<AreaTerritoryPerformanceData> {
    const area = MOCK_AREAS.find((a) => a.id === areaId) || MOCK_AREAS[0];

    const managerUser = MOCK_USERS.find((u) => u.id === area.areaManagerId) || {
      id: area.areaManagerId || 'usr-105',
      name: area.areaManagerName || 'Area Manager',
      email: 'area.manager@dnserp.com',
      role: 'AREA_MANAGER' as const,
      areaId: area.id,
      isActive: true,
    };

    let reps = MOCK_USERS.filter(
      (u) => u.role === 'SALES_REP' && u.areaId === area.id && u.isActive
    );
    if (reps.length === 0) {
      // Fallback to active sales reps to ensure area always displays assigned team
      reps = MOCK_USERS.filter((u) => u.role === 'SALES_REP' && u.isActive).slice(0, 4);
    }

    const subordinateReps: SubordinateRepPerformanceItem[] = await Promise.all(
      reps.map(async (rep) => {
        const repPerf = await commissionService.getRepPerformance(rep.id, selectedMonth);
        let status: 'BELOW_TARGET' | 'ON_TRACK' | 'TARGET_ACHIEVED' | 'SUPER_ACHIEVER' =
          'BELOW_TARGET';
        if (repPerf.achievementPercentage >= 120) {
          status = 'SUPER_ACHIEVER';
        } else if (repPerf.achievementPercentage >= 100) {
          status = 'TARGET_ACHIEVED';
        } else if (repPerf.achievementPercentage >= 80) {
          status = 'ON_TRACK';
        }

        return {
          repId: rep.id,
          repName: rep.name,
          target: repPerf.targetAmount,
          actualSales: repPerf.actualSales,
          achievementPercentage: repPerf.achievementPercentage,
          clearedCollections: repPerf.clearedCollections,
          earnedCommission: repPerf.earnedCommission,
          status,
          scenario: repPerf.breakdown.scenarioLabel,
        };
      })
    );

    const territorySales = subordinateReps.reduce((sum, r) => sum + r.actualSales, 0);
    const territoryCollections = subordinateReps.reduce(
      (sum, r) => sum + r.clearedCollections,
      0
    );
    const territoryTarget =
      subordinateReps.reduce((sum, r) => sum + r.target, 0) || 1000000;
    const territoryAchievementPercentage =
      territoryTarget > 0
        ? Math.round((territorySales / territoryTarget) * 10000) / 100
        : 0;
    const surplusSales = Math.max(0, territorySales - territoryTarget);

    const managerRoleConfig = await commissionConfigService.getRoleConfig('AREA_MANAGER');
    const managerReport = commissionConfigService.calculateCommission(
      managerUser as User,
      selectedMonth,
      territorySales,
      territoryCollections,
      managerRoleConfig
    );

    return {
      areaId: area.id,
      areaName: area.name,
      region: area.region,
      managerId: managerUser.id,
      managerName: managerUser.name,
      month: selectedMonth,
      territoryTarget,
      territorySales,
      territoryAchievementPercentage,
      territoryCollections,
      surplusSales,
      managerCommission: managerReport.commissionEarned,
      activeScenario: managerRoleConfig.activeScenario,
      managerRoleConfig,
      managerBreakdown: managerReport.breakdown,
      subordinateReps,
    };
  }
}

export const salesManagerDashboardService = new SalesManagerDashboardService();

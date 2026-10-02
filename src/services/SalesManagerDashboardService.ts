import { reportService } from './ReportService';
import { MOCK_USERS } from '../mock/mockUsers';
import { MOCK_AREAS } from '../mock/mockAreas';
import { User } from '../types/auth';

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
}

export const salesManagerDashboardService = new SalesManagerDashboardService();

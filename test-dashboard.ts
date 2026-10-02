import { salesManagerDashboardService } from './src/services/SalesManagerDashboardService';
import { MOCK_USERS } from './src/mock/mockUsers';

async function run() {
  const user = MOCK_USERS.find(u => u.role === 'SALES_MANAGER');
  if (!user) throw new Error("No sales manager");
  try {
    const data = await salesManagerDashboardService.getDashboardData(user);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}
run();

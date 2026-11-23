import { DashboardService } from '../Services/dashboard';

const dashboard = new DashboardService();
export class DashboardController {
  async summary() { return dashboard.summary(); }
}

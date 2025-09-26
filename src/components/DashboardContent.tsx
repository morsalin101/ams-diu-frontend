import { StatsCards } from './StatsCards';
import { QuickActions } from './QuickActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface DashboardContentProps {
  gradientClass: string;
}

export function DashboardContent({ gradientClass }: DashboardContentProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Welcome Section */}
      <div className={`bg-gradient-to-r ${gradientClass} text-white p-4 md:p-6 rounded-lg`}>
        <h2 className="text-xl md:text-2xl font-bold mb-2">Welcome back, Admin!</h2>
        <p className="text-white/80 text-sm md:text-base">Here's what's happening with your dashboard today.</p>
      </div>

      {/* Stats Cards */}
      <StatsCards gradientClass={gradientClass} />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <QuickActions gradientClass={gradientClass} />
        </div>

        {/* Recent Activity */}
        <Card className="order-1 lg:order-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Recent Activity</CardTitle>
            <CardDescription className="text-xs md:text-sm">Latest actions in your system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${gradientClass}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium truncate">User activity #{i + 1}</p>
                    <p className="text-xs text-muted-foreground">{i + 2} minutes ago</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Server Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Connected</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-yellow-600">Maintenance</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Overview of key metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Sessions</span>
                <span className="font-medium">234</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending Tasks</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Uptime</span>
                <span className="font-medium">99.9%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

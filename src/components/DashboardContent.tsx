import { StatsCards } from './StatsCards';
import { QuickActions } from './QuickActions';
import { QuestionsStatsDetail } from './QuestionsStatsDetail';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface DashboardContentProps {
  gradientClass: string;
}

export function DashboardContent({ gradientClass }: DashboardContentProps) {
  return (
    <div className="space-y-3 md:space-y-4">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-r from-white via-blue-50/50 to-blue-100/70 px-4 py-3 shadow-sm md:px-6 md:py-4">
        <div className="relative z-10">
          <h2 className="mb-1 text-xl font-bold text-[#0D1B4C] md:text-2xl">Welcome back, Admin!</h2>
          <p className="text-sm text-slate-700 md:text-base">Here's what's happening with your dashboard today.</p>
        </div>
        <div className="pointer-events-none absolute bottom-0 right-4 hidden h-24 w-80 opacity-25 md:block">
          <div className="absolute bottom-0 right-0 h-2 w-full rounded-t-full bg-blue-300" />
          <div className="absolute bottom-2 right-16 h-20 w-24 rounded-t-sm bg-blue-300/70" />
          <div className="absolute bottom-2 right-40 h-14 w-20 rounded-t-sm bg-blue-300/60" />
          <div className="absolute bottom-2 right-4 h-12 w-14 rounded-t-sm bg-blue-300/50" />
          <div className="absolute bottom-2 right-72 h-10 w-10 rounded-full bg-blue-300/60" />
          <div className="absolute bottom-2 right-64 h-8 w-2 bg-blue-300/60" />
          <div className="absolute right-24 top-5 h-2 w-3 rounded-full bg-blue-300/70" />
          <div className="absolute right-44 top-1 h-2 w-3 rounded-full bg-blue-300/60" />
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards gradientClass={gradientClass} />

      {/* Questions Statistics Detail */}
      <QuestionsStatsDetail gradientClass={gradientClass} />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Quick Actions */}
        {/* <div className="lg:col-span-2 order-2 lg:order-1">
          <QuickActions gradientClass={gradientClass} />
        </div> */}

        {/* Recent Activity */}
        {/* <Card className="order-1 lg:order-2">
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
        </Card> */}
      </div>

      {/* Additional Dashboard Content */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
      </div> */}
    </div>
  );
}

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
      <div className={`bg-gradient-to-r ${gradientClass} text-white p-6 md:p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 animate-fade-in">Welcome back, Admin!</h2>
          <p className="text-white/90 text-base md:text-lg font-medium">Here's what's happening with your dashboard today.</p>
        </div>
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
        <Card className="order-1 lg:order-2 hover:shadow-lg transition-all duration-300 border-0 shadow-md">
          <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="text-lg md:text-xl font-bold text-gray-800">Recent Activity</CardTitle>
            <CardDescription className="text-sm md:text-base text-gray-600">Latest actions in your system</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer group">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${gradientClass} shadow-sm group-hover:scale-110 transition-transform duration-200`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-base font-semibold truncate text-gray-800 group-hover:text-indigo-600 transition-colors duration-200">User activity #{i + 1}</p>
                    <p className="text-xs md:text-sm text-gray-500">{i + 2} minutes ago</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full -translate-y-10 translate-x-10 opacity-60"></div>
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              System Status
            </CardTitle>
            <CardDescription className="text-base text-gray-600">Current system health and performance</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 p-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <span className="text-base font-medium text-gray-700">Server Status</span>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                  <span className="text-base font-semibold text-green-600">Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <span className="text-base font-medium text-gray-700">Database</span>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                  <span className="text-base font-semibold text-green-600">Connected</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <span className="text-base font-medium text-gray-700">API Status</span>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse shadow-sm"></div>
                  <span className="text-base font-semibold text-yellow-600">Maintenance</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-indigo-50 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full -translate-y-10 translate-x-10 opacity-60"></div>
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${gradientClass}`}></div>
              Quick Stats
            </CardTitle>
            <CardDescription className="text-base text-gray-600">Overview of key metrics</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 p-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <span className="text-base font-medium text-gray-700">Active Sessions</span>
                <span className="text-xl font-bold text-indigo-600">234</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <span className="text-base font-medium text-gray-700">Pending Tasks</span>
                <span className="text-xl font-bold text-orange-600">12</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <span className="text-base font-medium text-gray-700">Uptime</span>
                <span className="text-xl font-bold text-green-600">99.9%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

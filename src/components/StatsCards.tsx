import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, Users, DollarSign, ShoppingCart, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatsCardsProps {
  gradientClass: string;
}

export function StatsCards({ gradientClass }: StatsCardsProps) {
  const stats = [
    {
      title: 'Total Users',
      value: '12,432',
      change: '+12.5%',
      trend: 'up',
      icon: Users,
    },
    {
      title: 'Revenue',
      value: '$45,231',
      change: '+8.2%',
      trend: 'up',
      icon: DollarSign,
    },
    {
      title: 'Orders',
      value: '1,429',
      change: '-2.4%',
      trend: 'down',
      icon: ShoppingCart,
    },
    {
      title: 'Growth',
      value: '23.8%',
      change: '+5.1%',
      trend: 'up',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
        
        return (
          <Card 
            key={stat.title} 
            className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-600">
                {stat.title}
              </div>
              <div className="p-3 rounded-xl bg-[#4C51BF] shadow-sm">
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900">
                {stat.value}
              </div>
              
              <div className="flex items-center text-sm">
                <TrendIcon className={`h-4 w-4 mr-1 ${
                  stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                }`} />
                <span className={stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                  {stat.change}
                </span>
                <span className="text-gray-500 ml-1">from last month</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

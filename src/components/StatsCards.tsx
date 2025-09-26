import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, Users, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
        
        const gradients = [
          'from-[#2E3094] to-[#4C51BF]',
          'from-[#4C51BF] to-[#667EEA]',
          'from-[#667EEA] to-[#2E3094]',
          'from-[#2E3094] to-[#667EEA]'
        ];
        
        return (
          <Card key={stat.title} className="relative overflow-hidden border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-br from-gray-50 to-blue-50">
              <CardTitle className="text-sm font-bold text-gray-700">
                {stat.title}
              </CardTitle>
              <div className={`p-3 rounded-xl bg-gradient-to-r ${gradients[index]} shadow-lg`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-6"> 
              <div className="text-2xl lg:text-3xl font-bold text-gray-800 mb-3">{stat.value}</div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  stat.trend === 'up' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  <TrendIcon className={`h-3 w-3 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                  <span className="font-bold">
                    {stat.change}
                  </span>
                </div>
                <span className="text-gray-600 font-medium">from last month</span>
              </div>
            </CardContent>
            <div className={`absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r ${gradients[index]}`}></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-8 translate-x-8"></div>
          </Card>
        );
      })}
    </div>
  );
}

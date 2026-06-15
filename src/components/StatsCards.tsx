import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, Users, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight, BookOpen, FileText, BarChart3, Loader2 } from 'lucide-react';
import { examAPI } from '../services/api';
import toast from 'react-hot-toast';

interface StatsCardsProps {
  gradientClass: string;
}

interface QuestionsStats {
  total_questions: number;
  subjects: { [key: string]: number };
  types: { [key: string]: number };
  semesters: { [key: string]: number };
}

export function StatsCards({ gradientClass }: StatsCardsProps) {
  const [stats, setStats] = useState<QuestionsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await examAPI.getQuestionsStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="p-2 rounded-lg bg-gray-200 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="col-span-full p-8 text-center">
          <p className="text-gray-500">Failed to load statistics</p>
        </Card>
      </div>
    );
  }

  const totalSubjects = Object.keys(stats.subjects).length;
  const totalOptionQuestions = stats.types.option || 0;
  const totalTextQuestions = stats.types.text || 0;
  const totalSemesters = Object.keys(stats.semesters).length;

  const statsCards = [
    {
      title: 'Total Questions',
      value: stats.total_questions.toString(),
      description: 'Questions in database',
      icon: FileText,
    },
    {
      title: 'Subjects',
      value: totalSubjects.toString(),
      description: 'Different subjects',
      icon: BookOpen,
    },
    {
      title: 'Multiple Choice',
      value: totalOptionQuestions.toString(),
      description: `${totalTextQuestions} text questions`,
      icon: BarChart3,
    },
    {
      title: 'Semesters',
      value: totalSemesters.toString(),
      description: 'Active semesters',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <Card key={stat.title} className="relative min-h-[190px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 px-6 pb-4 pt-6">
              <CardTitle className="text-base font-semibold text-slate-950">
                {stat.title}
              </CardTitle>
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700 shadow-sm">
                <Icon className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-bold text-[#0D1B4C]">{stat.value}</div>
              <div className="mt-3 text-base text-slate-700">
                {stat.description}
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
          </Card>
        );
      })}
    </div>
  );
}

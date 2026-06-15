import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { BookOpen, FileText, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { examAPI } from '../services/api';
import toast from 'react-hot-toast';

interface QuestionsStats {
  total_questions: number;
  subjects: { [key: string]: number };
  types: { [key: string]: number };
  semesters: { [key: string]: number };
}

interface QuestionsStatsDetailProps {
  gradientClass: string;
}

export function QuestionsStatsDetail({ gradientClass }: QuestionsStatsDetailProps) {
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
      console.error('Error loading detailed stats:', error);
      toast.error('Failed to load detailed statistics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500 mb-4">Failed to load detailed statistics</p>
        <Button onClick={loadStats} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }

  const getSubjectColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 md:gap-7">
      {/* Subjects Breakdown */}
      <Card className="rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-2">
        <CardHeader className="flex flex-row items-start justify-between px-6 pb-3 pt-6">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-950">
              <BookOpen className="h-5 w-5" />
              Subject Distribution
            </CardTitle>
            <CardDescription className="mt-1 text-base text-slate-700">
              Questions breakdown by subject
            </CardDescription>
          </div>
          <Button onClick={loadStats} variant="outline" size="icon" className="h-10 w-10 rounded-lg border-slate-300 text-slate-700">
            <RefreshCw className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div>
            {Object.entries(stats.subjects)
              .sort(([,a], [,b]) => b - a)
              .map(([subject, count], index) => {
                const percentage = Math.round((count / stats.total_questions) * 100);
                return (
                  <div key={subject} className="border-b border-dashed border-slate-200 py-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-4 w-4 rounded-full ${getSubjectColor(index)}`}></div>
                        <span className="text-lg font-semibold text-slate-950">{subject}</span>
                      </div>
                      <div className="flex items-center gap-10 text-base">
                        <span className="font-semibold text-slate-950">{count} questions</span>
                        <span className="min-w-10 text-right text-slate-700">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Question Types & Semesters */}
      <div className="space-y-5 md:space-y-7">
        {/* Question Types */}
        <Card className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <CardHeader className="px-6 pb-2 pt-6">
            <CardTitle className="flex items-center gap-4 text-2xl font-bold text-slate-950">
              <BarChart3 className="h-5 w-5" />
              Question Types
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div>
              {Object.entries(stats.types).map(([type, count]) => {
                const percentage = Math.round((count / stats.total_questions) * 100);
                return (
                  <div key={type} className="flex items-center justify-between border-b border-dashed border-slate-200 py-4 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className={`h-3 w-3 rounded-full ${
                        type === 'option' ? 'bg-blue-500' : 'bg-green-500'
                      }`}></div>
                      <span className="text-lg font-semibold text-slate-950">
                        {type === 'option' ? 'Multiple Choice' : 'Text Answer'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-slate-950">{count}</div>
                      <div className="text-base text-slate-700">{percentage}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Semesters */}
        <Card className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <CardHeader className="px-6 pb-2 pt-6">
            <CardTitle className="flex items-center gap-4 text-2xl font-bold text-slate-950">
              <FileText className="h-5 w-5" />
              Semesters
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-3">
              {Object.entries(stats.semesters).map(([semester, count]) => (
                <div key={semester} className="flex items-center justify-between py-2">
                  <Badge className="rounded-full bg-green-100 px-4 py-2 text-base font-semibold text-green-700 hover:bg-green-100">
                    {semester}
                  </Badge>
                  <div className="flex items-center gap-3 text-base">
                    <span className="font-semibold text-slate-950">{count}</span>
                    <span className="text-slate-700">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

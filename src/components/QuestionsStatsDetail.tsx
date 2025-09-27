import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      {/* Subjects Breakdown */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Subject Distribution
            </CardTitle>
            <CardDescription>
              Questions breakdown by subject
            </CardDescription>
          </div>
          <Button onClick={loadStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.subjects)
              .sort(([,a], [,b]) => b - a)
              .map(([subject, count], index) => {
                const percentage = Math.round((count / stats.total_questions) * 100);
                return (
                  <div key={subject} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getSubjectColor(index)}`}></div>
                        <span className="font-medium text-sm">{subject}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {count} questions
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Question Types & Semesters */}
      <div className="space-y-4 md:space-y-6">
        {/* Question Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Question Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.types).map(([type, count]) => {
                const percentage = Math.round((count / stats.total_questions) * 100);
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        type === 'option' ? 'bg-blue-500' : 'bg-green-500'
                      }`}></div>
                      <span className="text-sm font-medium capitalize">
                        {type === 'option' ? 'Multiple Choice' : 'Text Answer'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{count}</div>
                      <div className="text-xs text-muted-foreground">{percentage}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Semesters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Semesters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.semesters).map(([semester, count]) => (
                <div key={semester} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{semester}</span>
                  <Badge variant="outline" className="text-xs">
                    {count} questions
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
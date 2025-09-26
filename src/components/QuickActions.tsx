import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Plus, Upload, Download, Users, Settings, BarChart3 } from 'lucide-react';

interface QuickActionsProps {
  gradientClass: string;
}

export function QuickActions({ gradientClass }: QuickActionsProps) {
  const actions = [
    { icon: Plus, label: 'Add New User', description: 'Create a new user account' },
    { icon: Upload, label: 'Import Data', description: 'Upload CSV or Excel files' },
    { icon: Download, label: 'Export Report', description: 'Download analytics report' },
    { icon: Users, label: 'Manage Roles', description: 'Configure user permissions' },
    { icon: Settings, label: 'System Settings', description: 'Update configuration' },
    { icon: BarChart3, label: 'View Analytics', description: 'Check detailed statistics' },
  ];

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-800">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all group bg-white border border-gray-200 rounded-lg"
              >
                <div className="p-3 rounded-lg bg-[#4C51BF] group-hover:scale-105 transition-transform shadow-sm">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm text-gray-900">{action.label}</div>
                  <div className="text-xs text-gray-500 line-clamp-2 mt-1">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

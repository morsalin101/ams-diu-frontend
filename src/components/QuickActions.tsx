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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base md:text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto p-3 md:p-4 flex flex-col items-start gap-2 hover:shadow-md transition-all group"
              >
                <div className={`p-1.5 md:p-2 rounded-lg bg-gradient-to-r ${gradientClass} group-hover:scale-105 transition-transform`}>
                  <Icon className="h-3 w-3 md:h-4 md:w-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm md:text-base">{action.label}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

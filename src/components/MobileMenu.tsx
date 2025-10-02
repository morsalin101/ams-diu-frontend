import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { MoreVertical, Search, Settings } from 'lucide-react';
import { Separator } from './ui/separator';

interface MobileMenuProps {}

export function MobileMenu({}: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="sm:hidden">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 bg-white border-l border-gray-200">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>
            Access search, settings, and theme options
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          {/* Search */}
          <div className="space-y-2">
            <h4 className="font-medium">Search</h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search..."
                className="pl-10"
              />
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="space-y-3">
            <h4 className="font-medium">Settings</h4>
            <Button variant="outline" className="w-full justify-start" onClick={() => setOpen(false)}>
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

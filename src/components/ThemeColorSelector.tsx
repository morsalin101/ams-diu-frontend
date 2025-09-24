import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const themeColors = [
  { name: 'Default', color: '#2E3094', gradient: 'from-[#2E3094] to-[#4C51BF]' },
  { name: 'Emerald', color: '#059669', gradient: 'from-[#059669] to-[#10B981]' },
  { name: 'Rose', color: '#E11D48', gradient: 'from-[#E11D48] to-[#F43F5E]' },
  { name: 'Orange', color: '#EA580C', gradient: 'from-[#EA580C] to-[#FB923C]' },
  { name: 'Violet', color: '#7C3AED', gradient: 'from-[#7C3AED] to-[#A855F7]' },
  { name: 'Cyan', color: '#0891B2', gradient: 'from-[#0891B2] to-[#06B6D4]' },
];

interface ThemeColorSelectorProps {
  onColorChange: (color: string, gradient: string) => void;
}

export function ThemeColorSelector({ onColorChange }: ThemeColorSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState(themeColors[0]);

  const handleColorSelect = (theme: typeof themeColors[0]) => {
    setSelectedTheme(theme);
    onColorChange(theme.color, theme.gradient);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          Theme Colors
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-white border border-gray-200 shadow-lg">
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Choose Theme Color</h4>
          <div className="grid grid-cols-2 gap-3">
            {themeColors.map((theme) => (
              <Card
                key={theme.name}
                className={`p-3 cursor-pointer transition-all hover:scale-105 bg-white border hover:shadow-md ${
                  selectedTheme.name === theme.name ? 'ring-2 ring-primary border-primary' : 'border-gray-200'
                }`}
                onClick={() => handleColorSelect(theme)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-r ${theme.gradient} border border-gray-200`}
                  />
                  <span className="text-sm font-medium text-gray-900">{theme.name}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const LayoutTestPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Layout Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Card 1</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is a test card to verify the layout is working correctly.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Card 2</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The sidebar should not overlap with this content.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Card 3</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Content should be properly spaced and responsive.</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-blue-100 p-4 rounded-lg">
        <p className="text-blue-800">
          <strong>Layout Debug Info:</strong><br />
          - Sidebar should be on the left<br />
          - Main content should not overlap<br />
          - Header should be at the top<br />
          - Content should be scrollable
        </p>
      </div>
    </div>
  );
};

export default LayoutTestPage;
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
      <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h1>
      <p className="text-gray-600 mb-6 max-w-md">
        The page you're looking for doesn't exist or you don't have permission to access it.
      </p>
      <Button 
        onClick={() => navigate('/dashboard')} 
        className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#2E3094]/90 hover:to-[#4C51BF]/90"
      >
        Go to Dashboard
      </Button>
    </div>
  );
};

export default NotFoundPage;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AppContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

// Placeholder for the logo/image
const CheetahLogo = () => (
  <img src="https://storage.googleapis.com/project-leopard-assets/cheetah_logo.png" alt="CaTLX Logo" className="w-24 h-24" />
);

const Header: React.FC = () => (
  <div className="flex items-center justify-center mb-8">
    <CheetahLogo />
    <div className="ml-4">
      <h1 className="text-5xl font-bold text-white">CaTLX</h1>
      <p className="text-nasa-gray-300">workload assessment</p>
    </div>
  </div>
);

const LoginForm: React.FC<{ onLogin: (mode: 'api') => void }> = ({ onLogin }) => {
  return (
    <Card className="w-full max-w-sm">
      <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
      <form>
        <div className="mb-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 bg-nasa-gray-700 text-white rounded-md border border-nasa-gray-600 focus:outline-none focus:ring-2 focus:ring-nasa-blue"
          />
        </div>
        <div className="mb-6">
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 bg-nasa-gray-700 text-white rounded-md border border-nasa-gray-600 focus:outline-none focus:ring-2 focus:ring-nasa-blue"
          />
        </div>
        <Button onClick={() => onLogin('api')} className="w-full !justify-center !py-3">
          Login
        </Button>
        <div className="text-center mt-4 text-sm text-nasa-gray-300">
          <a href="#" className="hover:text-white">signup</a>
          <span className="mx-2">|</span>
          <a href="#" className="hover:text-white">google signin</a>
        </div>
      </form>
    </Card>
  );
};


const LandingPage: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
  
    const handleLogin = (mode: 'demo' | 'local' | 'api') => {
      login(mode);
      navigate('/evaluator');
    };
  
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-nasa-gray-900 text-white p-4">
        <Header />
        <LoginForm onLogin={() => handleLogin('api')} />
        <div className="mt-8">
          <Button onClick={() => handleLogin('demo')} variant="link">demo</Button>
          <Button onClick={() => handleLogin('local')} variant="link" className="ml-4">continue without login (local)</Button>
        </div>
      </div>
    );
  };

export default LandingPage;

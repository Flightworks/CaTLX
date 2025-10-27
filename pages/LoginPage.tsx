import React from 'react';
import { useAuth } from '../contexts/AppContext';
import Button from '../components/ui/Button';

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
);

const LoginPage: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-nasa-gray-900">
      <div className="text-center p-8 max-w-md w-full">
        <div className="mb-8">
            <div className="flex items-center justify-center">
              <svg className="w-12 h-12 text-nasa-light-blue mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 15C10.6311 15.5103 11.3323 15.8333 12.0833 15.8333C12.8344 15.8333 13.5356 15.5103 14.1667 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15.5 9.5C15.5 9.77614 15.2761 10 15 10C14.7239 10 14.5 9.77614 14.5 9.5C14.5 9.22386 14.7239 9 15 9C15.2761 9 15.5 9.22386 15.5 9.5Z" fill="currentColor"/>
                <path d="M9.5 9.5C9.5 9.77614 9.27614 10 9 10C8.72386 10 8.5 9.77614 8.5 9.5C8.5 9.22386 8.72386 9 9 9C9.27614 9 9.5 9.22386 9.5 9.5Z" fill="currentColor"/>
                <path d="M19 12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 11V12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h1 className="text-4xl font-bold text-white tracking-wider">CaTLX</h1>
            </div>
            <p className="text-nasa-gray-300 mt-2">Workload Assessment Tool</p>
        </div>
        <div className="bg-nasa-gray-800 p-8 rounded-lg shadow-2xl">
            <h2 className="text-2xl font-semibold text-white mb-6">Welcome</h2>
            <p className="text-nasa-gray-400 mb-8">Please sign in to continue to the assessment dashboard.</p>
            <Button onClick={login} size="lg" className="w-full">
                <GoogleIcon />
                Sign in with Google
            </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;


import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useData, useSession } from '../../contexts/AppContext';
import Button from '../ui/Button';
import { APP_ICON } from '../../assets';

const Header: React.FC = () => {
  const { logout, mode } = useAuth();
  const { evaluators, studies } = useData();
  const { selectedEvaluatorId, setSelectedEvaluatorId, selectedStudyId, setSelectedStudyId } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
  };
  
  const handleEvaluatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEvaluatorId(e.target.value);
  };

  const handleStudyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStudyId(e.target.value);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-nasa-light-blue text-white'
        : 'text-nasa-gray-300 hover:bg-nasa-gray-700 hover:text-white'
    }`;
    
  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-md text-base font-medium transition-colors ${
      isActive
        ? 'bg-nasa-light-blue text-white'
        : 'text-nasa-gray-300 hover:bg-nasa-gray-700 hover:text-white'
    }`;

  const showSessionControls = location.pathname.startsWith('/evaluator');
  const selectClasses = "bg-nasa-gray-700 text-white font-semibold rounded-md py-1 px-2 text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-nasa-gray-800 focus:ring-nasa-blue disabled:opacity-50 disabled:cursor-not-allowed truncate";
  const mobileSelectClasses = "w-full bg-nasa-gray-700 text-white font-semibold rounded-md py-2 px-3 text-base border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-nasa-gray-800 focus:ring-nasa-blue disabled:opacity-50";

  return (
    <header className="bg-nasa-gray-800 shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-white font-bold text-xl flex items-center space-x-3">
              <img src={APP_ICON} alt="CaTLX Logo" className="w-8 h-8 rounded-full" />
              <span>CaTLX</span>
              {mode === 'demo' ? (
                <span className="text-xs font-semibold bg-green-500 text-green-900 px-2 py-0.5 rounded-full">Demo</span>
              ) : mode === 'local' ? (
                <span className="text-xs font-semibold bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded-full">Local</span>
              ) : (
                <span className="text-xs font-semibold bg-blue-500 text-blue-900 px-2 py-0.5 rounded-full">Cloud</span>
              )}
            </div>
            <nav className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <NavLink to="/evaluator" className={navLinkClass}>
                  Evaluator
                </NavLink>
                <NavLink to="/admin" className={navLinkClass}>
                  Admin Dashboard
                </NavLink>
              </div>
            </nav>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            {showSessionControls && (
                <div className="flex items-center space-x-2 text-sm text-nasa-gray-300">
                    <select
                        aria-label="Select Evaluator"
                        className={`${selectClasses} w-auto max-w-[200px]`}
                        value={selectedEvaluatorId}
                        onChange={handleEvaluatorChange}
                    >
                        <option value="">-- Choose Evaluator --</option>
                        {evaluators.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>

                    <select
                        aria-label="Select Study"
                        className={`${selectClasses} w-auto max-w-[200px]`}
                        value={selectedStudyId}
                        onChange={handleStudyChange}
                        disabled={!selectedEvaluatorId}
                    >
                        <option value="">-- Choose Study --</option>
                        {studies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            )}
            <Button onClick={handleLogout} variant="danger" size="sm">
                Logout
            </Button>
          </div>
          <div className="md:hidden flex items-center">
             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-nasa-gray-400 hover:text-white hover:bg-nasa-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" aria-controls="mobile-menu" aria-expanded={isMenuOpen}>
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m4 6H4" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

       {isMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <NavLink to="/evaluator" className={mobileNavLinkClass} onClick={() => setIsMenuOpen(false)}>Evaluator</NavLink>
            <NavLink to="/admin" className={mobileNavLinkClass} onClick={() => setIsMenuOpen(false)}>Admin Dashboard</NavLink>
          </div>
          <div className="pt-4 pb-3 border-t border-nasa-gray-700">
            {showSessionControls && (
                <div className="px-4 space-y-3">
                    <div>
                        <label htmlFor="mobile-evaluator" className="text-xs font-semibold text-nasa-gray-400">Evaluator</label>
                        <select
                            id="mobile-evaluator"
                            aria-label="Select Evaluator"
                            className={mobileSelectClasses}
                            value={selectedEvaluatorId}
                            onChange={handleEvaluatorChange}
                        >
                            <option value="">-- Choose Evaluator --</option>
                            {evaluators.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="mobile-study" className="text-xs font-semibold text-nasa-gray-400">Study</label>
                        <select
                            id="mobile-study"
                            aria-label="Select Study"
                            className={mobileSelectClasses}
                            value={selectedStudyId}
                            onChange={handleStudyChange}
                            disabled={!selectedEvaluatorId}
                        >
                            <option value="">-- Choose Study --</option>
                            {studies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            )}
            <div className="mt-3 px-4">
                <Button onClick={handleLogout} variant="danger" size="md" className="w-full">
                    Logout
                </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useData, useSession } from '../../contexts/AppContext';
import Button from '../ui/Button';

const Header: React.FC = () => {
  const { logout } = useAuth();
  const { evaluators, studies } = useData();
  const { selectedEvaluatorId, setSelectedEvaluatorId, selectedStudyId, setSelectedStudyId } = useSession();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  const handleChangeSelections = () => {
      setSelectedEvaluatorId('');
      setSelectedStudyId('');
      navigate('/evaluator');
  };

  const selectedEvaluator = evaluators.find(e => e.id === selectedEvaluatorId);
  const selectedStudy = studies.find(s => s.id === selectedStudyId);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-nasa-light-blue text-white'
        : 'text-nasa-gray-300 hover:bg-nasa-gray-700 hover:text-white'
    }`;

  return (
    <header className="bg-nasa-gray-800 shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-white font-bold text-xl">
              NASA TLX
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
          <div className="flex items-center space-x-4">
            {selectedEvaluator && selectedStudy && (
                <div className="hidden sm:flex items-center space-x-3 text-sm text-nasa-gray-300">
                    <span>
                        <span className="font-semibold text-white">{selectedEvaluator.name}</span>
                    </span>
                    <span className="text-nasa-gray-500">/</span>
                    <span>
                        <span className="font-semibold text-white">{selectedStudy.name}</span>
                    </span>
                    <Button onClick={handleChangeSelections} variant="secondary" size="sm">Change</Button>
                </div>
            )}
            <Button onClick={handleLogout} variant="danger" size="sm">
                Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
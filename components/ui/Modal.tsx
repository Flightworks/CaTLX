
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'lg' }) => {
  if (!isOpen) return null;
  
  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className={`relative bg-nasa-gray-800 rounded-lg shadow-xl w-full ${sizeClasses[size]} mx-4 my-8 overflow-hidden transform transition-all`}>
        <div className="px-6 py-4 border-b border-nasa-gray-700">
          <div className="flex items-start justify-between">
            <h3 className="text-xl font-semibold text-white" id="modal-title">
              {title}
            </h3>
            <button
              type="button"
              className="p-1 -mt-1 -mr-2 text-nasa-gray-300 rounded-full hover:bg-nasa-gray-700 focus:outline-none focus:ring-2 focus:ring-nasa-blue"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-nasa-gray-800 border-t border-nasa-gray-700 text-right space-x-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { TerminalIcon, ArrowDownTrayIcon, ChevronDownIcon } from './icons';

interface HeaderProps {
  models: { [key: string]: { name: string; instruction: string; } };
  currentModel: string;
  onModelChange: (modelKey: string) => void;
  onDownloadChat: () => void;
}

const Header: React.FC<HeaderProps> = ({ models, currentModel, onModelChange, onDownloadChat }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (modelKey: string) => {
    onModelChange(modelKey);
    setIsDropdownOpen(false);
  };

  return (
    <header className="w-full py-3 px-4 sm:px-8 border-b border-gray-700/80 bg-[#161B22]/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-center gap-3">
            <TerminalIcon className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight text-gray-100">
              EcoIuris AI CLI
            </h1>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-200 font-semibold px-4 py-2 rounded-md transition-colors"
                >
                    <span>{models[currentModel].name}</span>
                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-[#161B22] border border-gray-700 rounded-md shadow-lg animate-fade-in-up-fast">
                        <ul className="py-1">
                            {Object.entries(models).map(([key, { name }]) => (
                                <li key={key}>
                                    <button 
                                        onClick={() => handleSelect(key)}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/80"
                                    >
                                        {name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <button
              onClick={onDownloadChat}
              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-200 rounded-md transition-colors"
              aria-label="Download chat history"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'slider';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function ThemeToggle({ 
  variant = 'button', 
  size = 'md', 
  showLabel = false,
  className = ''
}: ThemeToggleProps) {
  const { theme, setTheme, effectiveTheme, toggleTheme, isTransitioning } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'p-2 text-sm',
    md: 'p-3 text-base',
    lg: 'p-4 text-lg'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const getThemeIcon = (themeType: string, isActive = false) => {
    const iconClass = `${iconSizeClasses[size]} ${isActive ? 'text-brand-500' : 'text-current'}`;
    
    switch (themeType) {
      case 'light':
        return <Sun className={iconClass} />;
      case 'dark':
        return <Moon className={iconClass} />;
      case 'system':
        return <Monitor className={iconClass} />;
      default:
        return <Palette className={iconClass} />;
    }
  };

  const getThemeLabel = (themeType: string) => {
    switch (themeType) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'Theme';
    }
  };

  if (variant === 'slider') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {showLabel && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>}
        <div className="relative">
          <motion.div
            className={`
              relative flex items-center bg-gray-200 dark:bg-slate-700 rounded-full p-1
              ${size === 'sm' ? 'h-8' : size === 'md' ? 'h-10' : 'h-12'}
            `}
            animate={{
              backgroundColor: effectiveTheme === 'dark' ? '#374151' : '#e5e7eb'
            }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              className={`
                flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-md
                ${size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10'}
                transition-colors duration-200
              `}
              onClick={toggleTheme}
              animate={{
                x: effectiveTheme === 'dark' ? 
                  (size === 'sm' ? 32 : size === 'md' ? 40 : 48) : 0,
                backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#ffffff'
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={effectiveTheme}
                  initial={{ opacity: 0, rotate: -180 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  {getThemeIcon(effectiveTheme)}
                </motion.div>
              </AnimatePresence>
            </motion.button>
            <div className={`absolute inset-0 flex items-center ${size === 'sm' ? 'px-2' : size === 'md' ? 'px-3' : 'px-4'}`}>
              <span className={`text-xs font-medium ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {effectiveTheme === 'dark' ? 'Light' : 'Dark'}
              </span>
              <span className={`text-xs font-medium ml-auto ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                {effectiveTheme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            ${sizeClasses[size]} 
            flex items-center space-x-2 rounded-xl border border-gray-200 dark:border-slate-600
            bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700
            text-gray-700 dark:text-gray-200 shadow-sm hover:shadow-md
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500
            ${isTransitioning ? 'pointer-events-none opacity-70' : ''}
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              {getThemeIcon(theme)}
            </motion.div>
          </AnimatePresence>
          {showLabel && <span className="font-medium">{getThemeLabel(theme)}</span>}
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-2 py-2 w-48 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 shadow-lg z-50"
            >
              {['light', 'dark', 'system'].map((themeOption) => (
                <motion.button
                  key={themeOption}
                  onClick={() => {
                    setTheme(themeOption as any);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-slate-700
                    transition-colors duration-200
                    ${theme === themeOption ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'text-gray-700 dark:text-gray-200'}
                  `}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {getThemeIcon(themeOption, theme === themeOption)}
                  <div className="flex-1">
                    <div className="font-medium">{getThemeLabel(themeOption)}</div>
                    <div className="text-xs opacity-60">
                      {themeOption === 'light' && 'Always light theme'}
                      {themeOption === 'dark' && 'Always dark theme'}
                      {themeOption === 'system' && 'Follows system preference'}
                    </div>
                  </div>
                  {theme === themeOption && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 bg-brand-500 rounded-full"
                    />
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {isOpen && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  // Default button variant
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <motion.button
        onClick={toggleTheme}
        className={`
          ${sizeClasses[size]}
          relative rounded-xl border border-gray-200 dark:border-slate-600
          bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700
          text-gray-700 dark:text-gray-200 shadow-sm hover:shadow-md
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500
          ${isTransitioning ? 'pointer-events-none opacity-70' : ''}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={isTransitioning}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={effectiveTheme}
            initial={{ opacity: 0, rotate: -180, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 180, scale: 0.5 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {getThemeIcon(effectiveTheme)}
          </motion.div>
        </AnimatePresence>
        
        {isTransitioning && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={`animate-spin rounded-full border-2 border-brand-500 border-t-transparent ${iconSizeClasses[size]}`} />
          </motion.div>
        )}
      </motion.button>
      
      {showLabel && (
        <motion.span 
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
          key={theme}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {getThemeLabel(theme)}
        </motion.span>
      )}
    </div>
  );
}

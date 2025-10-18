import React from 'react';

interface Theme {
  name: string;
  '--accent-color': string;
  '--accent-color-active': string;
}

interface ThemeSelectorProps {
  themes: Record<string, Theme>;
  activeTheme: string;
  onThemeChange: (themeKey: string) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ themes, activeTheme, onThemeChange }) => {
  return (
    <div className="flex items-center space-x-1.5 p-1 bg-black/20 rounded-md border border-black/50 shadow-inner">
      {Object.entries(themes).map(([key, theme]: [string, Theme]) => {
        return (
          <button
            key={key}
            title={theme.name}
            onClick={() => onThemeChange(key)}
            className={`w-5 h-5 rounded-full transition-all duration-150 border-2 ${activeTheme === key ? 'border-white scale-110' : 'border-transparent hover:border-white/50'}`}
            style={{ backgroundColor: theme['--accent-color'] }}
            aria-label={`Select ${theme.name} theme`}
          />
        );
      })}
    </div>
  );
};

export default React.memo(ThemeSelector);
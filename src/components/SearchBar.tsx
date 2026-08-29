import React from 'react';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  onClear,
  placeholder = 'Search chats, contacts, or messages...'
}) => {
  return (
    <div className="w-full px-4 pt-3 pb-1">
      <div className="max-w-md mx-auto relative flex items-center">
        <div className="absolute left-4 pointer-events-none text-slate-400 text-sm select-none">
          🔍
        </div>
        <input
          id="chat-search-input"
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 pl-11 pr-10 rounded-full mirror-glass-input border border-white/10 text-slate-100 placeholder-slate-400/80 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all backdrop-blur-md shadow-inner"
        />
        {query && (
          <button
            onClick={onClear}
            className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
            title="Clear search"
          >
            ❌
          </button>
        )}
      </div>
    </div>
  );
};

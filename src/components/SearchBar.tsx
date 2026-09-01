import React from 'react';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
  onVoiceClick?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  onClear,
  placeholder = 'Search chats, contacts...',
  onVoiceClick
}) => {
  return (
    <div className="w-full px-3 pt-2 pb-1">
      <div className="max-w-md mx-auto relative flex items-center">
        {/* Left Search Emoji with soft red glow */}
        <div className="absolute left-4 pointer-events-none text-indigo-500 text-base select-none">
          🔍
        </div>

        <input
          id="chat-search-input"
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 pl-12 pr-12 rounded-full bg-[#11131b]/90 border border-white/10 text-slate-100 placeholder-slate-400/90 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition-all backdrop-blur-xl shadow-inner"
        />

        {/* Right Action: Clear if query exists, or Microphone Emoji matching screenshot */}
        <div className="absolute right-3.5 flex items-center gap-1.5">
          {query ? (
            <button
              onClick={onClear}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
              title="Clear search"
            >
              ❌
            </button>
          ) : (
            <button
              type="button"
              onClick={onVoiceClick}
              className="p-1.5 rounded-full text-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all text-base active:scale-95 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
              title="Voice Search / Dictate"
            >
              🎙️
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


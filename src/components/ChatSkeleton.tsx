import React from 'react';

export const ChatSkeleton: React.FC = () => {
  return (
    <div className="w-full px-4 divide-y divide-white/5 space-y-4 pt-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3.5 py-3 animate-pulse">
          {/* Avatar circle skeleton */}
          <div className="w-12 h-12 rounded-full mirror-glass-input shrink-0" />

          {/* Text lines */}
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="h-3.5 mirror-glass-input rounded-md w-28" />
              <div className="h-3 mirror-glass-input rounded w-10" />
            </div>
            <div className="h-3 mirror-glass-input rounded-md w-48" />
          </div>
        </div>
      ))}
    </div>
  );
};

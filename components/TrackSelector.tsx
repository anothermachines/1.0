import React from 'react';
import { useStore } from '../store/store';

interface TrackSelectorProps {
  layout: 'horizontal' | 'vertical';
}

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block ml-1.5 opacity-70">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);


const TrackSelector: React.FC<TrackSelectorProps> = ({ layout }) => {
  const { tracks, selectedTrackId, selectTrack, isViewerMode } = useStore(state => ({
    tracks: state.preset.tracks,
    selectedTrackId: state.selectedTrackId,
    selectTrack: state.selectTrack,
    isViewerMode: state.isViewerMode,
  }));

  const isHorizontal = layout === 'horizontal';

  if (isHorizontal) {
    return (
      <div className="bg-[var(--bg-panel-dark)] p-1 border-b border-[var(--border-color)] flex-shrink-0">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar p-1">
          {tracks.map(track => {
            const isDisabled = isViewerMode && track.id >= 3;
            return (
              <button
                key={track.id}
                onClick={() => selectTrack(track.id)}
                disabled={isDisabled}
                className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all duration-150 border whitespace-nowrap flex items-center ${
                  track.id === selectedTrackId
                    ? 'bg-[var(--accent-color)] text-[var(--text-dark)] border-[var(--accent-color-active)]'
                    : 'bg-[var(--bg-control)] text-[var(--text-light)] border-[var(--border-color)] hover:bg-[var(--border-color-light)]'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {track.name}
                {isDisabled && <LockIcon />}
              </button>
            )
          })}
        </div>
      </div>
    );
  }

  // Vertical Layout
  return (
    <div className="h-full w-full p-2 bg-[var(--bg-panel-dark)] overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-2">
        {tracks.map(track => {
          const isDisabled = isViewerMode && track.id >= 3;
          return (
          <button
            key={track.id}
            onClick={() => selectTrack(track.id)}
            disabled={isDisabled}
            className={`w-full p-3 rounded-md text-sm font-bold uppercase tracking-wider text-left transition-all duration-150 border flex items-center justify-between ${
              track.id === selectedTrackId
                ? 'bg-[var(--accent-color)] text-[var(--text-dark)] border-[var(--accent-color-active)] selected-track-glow'
                : 'bg-[var(--bg-panel)] text-[var(--text-light)] border-[var(--border-color)] hover:bg-[var(--bg-control)]'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div>
              <span className="text-xs font-mono text-[var(--text-muted)] mr-3">{String(track.id + 1).padStart(2, '0')}</span>
              {track.name}
            </div>
            {isDisabled && <LockIcon />}
          </button>
        )})}
      </div>
    </div>
  );
};

export default React.memo(TrackSelector);
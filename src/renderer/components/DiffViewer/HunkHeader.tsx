import React from 'react';
import { RotateCcw, Plus, Minus, Trash2, CheckSquare, X } from 'lucide-react';
import { DiffHunk } from '../../../shared/types';
import { useApp } from '../../store';
import { api } from '../../lib/api';

interface HunkHeaderProps {
  hunk: DiffHunk;
  hunkIndex: number;
  selectedLineIndices: Set<number>;
  onClearSelection: () => void;
}

export function HunkHeader({
  hunk,
  hunkIndex,
  selectedLineIndices,
  onClearSelection
}: HunkHeaderProps) {
  const openDiff = useApp((s) => s.openDiff);
  const runAndRefresh = useApp((s) => s.runAndRefresh);
  const reloadCurrentDiff = useApp((s) => s.reloadCurrentDiff);

  if (!openDiff) return null;

  if (openDiff.compareCommits || openDiff.stashIndex !== undefined) return <div className="px-3 py-1.5 text-xs text-dim font-mono bg-panel2">{hunk.header}</div>;

  const isCommitted = openDiff.commitHash !== null;
  const isStaged = openDiff.staged === true;
  const isUnstaged = !isCommitted && !isStaged;

  const selectedInThisHunk = Array.from(selectedLineIndices).sort((a, b) => a - b);
  const hasLineSelection = selectedInThisHunk.length > 0;

  // Hunk-level operations
  const handleStageHunk = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await runAndRefresh(async () => {
      await api.stageHunk(openDiff.filePath, hunkIndex);
      await reloadCurrentDiff();
    }, `Hunk #${hunkIndex + 1} staged`);
  };

  const handleUnstageHunk = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await runAndRefresh(async () => {
      await api.unstageHunk(openDiff.filePath, hunkIndex);
      await reloadCurrentDiff();
    }, `Hunk #${hunkIndex + 1} unstaged`);
  };

  const handleDiscardHunk = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Discard all changes in hunk #${hunkIndex + 1}? This cannot be undone.`)) {
      return;
    }
    await runAndRefresh(async () => {
      await api.discardHunk(openDiff.filePath, hunkIndex);
      await reloadCurrentDiff();
    }, `Hunk #${hunkIndex + 1} discarded`);
  };

  const handleRevertHunk = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await runAndRefresh(async () => {
      await api.revertHunk(openDiff.commitHash ?? '', openDiff.filePath, hunkIndex);
      await reloadCurrentDiff();
    }, `Hunk #${hunkIndex + 1} reverted`);
  };

  // Line-level operations
  const handleStageSelectedLines = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await runAndRefresh(async () => {
      await api.stageLines(openDiff.filePath, hunkIndex, selectedInThisHunk);
      await reloadCurrentDiff();
      onClearSelection();
    }, `${selectedInThisHunk.length} line(s) staged`);
  };

  const handleUnstageSelectedLines = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await runAndRefresh(async () => {
      await api.unstageLines(openDiff.filePath, hunkIndex, selectedInThisHunk);
      await reloadCurrentDiff();
      onClearSelection();
    }, `${selectedInThisHunk.length} line(s) unstaged`);
  };

  const handleDiscardSelectedLines = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Discard changes in ${selectedInThisHunk.length} selected line(s)? This cannot be undone.`
      )
    ) {
      return;
    }
    await runAndRefresh(async () => {
      await api.discardLines(openDiff.filePath, hunkIndex, selectedInThisHunk);
      await reloadCurrentDiff();
      onClearSelection();
    }, `${selectedInThisHunk.length} line(s) discarded`);
  };

  return (
    <div className="flex items-center gap-2 bg-panel2/90 px-3 py-1.5 text-xs text-dim font-mono sticky top-0 z-10 backdrop-blur-sm border-b border-edge/40 select-none">
      <span className="text-accent font-semibold tracking-tight">@@</span>
      <span className="flex-1 truncate text-dim/80 text-[11px]">{hunk.header.replace(/^@@.*@@\s*/, '') || hunk.header}</span>

      {/* Selected lines action toolbar */}
      {hasLineSelection && (
        <div className="flex items-center gap-1.5 bg-panel3 px-2 py-0.5 rounded border border-accent/40 shadow-sm animate-in fade-in zoom-in-95 duration-100">
          <span className="text-[11px] font-sans font-medium text-accent flex items-center gap-1">
            <CheckSquare size={11} />
            {selectedInThisHunk.length} selected
          </span>

          {isUnstaged && (
            <>
              <button
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-add/20 hover:bg-add/30 text-add text-[10px] font-sans font-medium transition-colors"
                title="Stage only selected lines"
                onClick={handleStageSelectedLines}
              >
                <Plus size={10} />
                Stage Lines
              </button>
              <button
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-del/20 hover:bg-del/30 text-del text-[10px] font-sans font-medium transition-colors"
                title="Discard only selected lines"
                onClick={handleDiscardSelectedLines}
              >
                <Trash2 size={10} />
                Discard Lines
              </button>
            </>
          )}

          {isStaged && (
            <button
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-warn/20 hover:bg-warn/30 text-warn text-[10px] font-sans font-medium transition-colors"
              title="Unstage only selected lines"
              onClick={handleUnstageSelectedLines}
            >
              <Minus size={10} />
              Unstage Lines
            </button>
          )}

          <button
            className="text-dim hover:text-fg p-0.5 rounded hover:bg-panel"
            title="Clear line selection"
            onClick={onClearSelection}
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Whole Hunk Actions */}
      <div className="flex items-center gap-1 border-l border-edge/40 pl-2">
        {isUnstaged && (
          <>
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-panel3 hover:bg-add/20 text-dim hover:text-add border border-edge/40 hover:border-add/40 text-[11px] font-sans transition-all"
              title="Stage this entire hunk into the index"
              onClick={handleStageHunk}
            >
              <Plus size={11} className="text-add" />
              <span>Stage Hunk</span>
            </button>
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-panel3 hover:bg-del/20 text-dim hover:text-del border border-edge/40 hover:border-del/40 text-[11px] font-sans transition-all"
              title="Discard changes in this hunk"
              onClick={handleDiscardHunk}
            >
              <Trash2 size={11} className="text-del" />
              <span>Discard Hunk</span>
            </button>
          </>
        )}

        {isStaged && (
          <button
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-panel3 hover:bg-warn/20 text-dim hover:text-warn border border-edge/40 hover:border-warn/40 text-[11px] font-sans transition-all"
            title="Unstage this hunk back to working directory"
            onClick={handleUnstageHunk}
          >
            <Minus size={11} className="text-warn" />
            <span>Unstage Hunk</span>
          </button>
        )}

        {isCommitted && (
          <button
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-panel3 hover:bg-del/20 text-dim hover:text-del border border-edge/40 hover:border-del/40 text-[11px] font-sans transition-all"
            title="Revert this hunk in the working tree"
            onClick={handleRevertHunk}
          >
            <RotateCcw size={11} />
            <span>Revert Hunk</span>
          </button>
        )}
      </div>
    </div>
  );
}

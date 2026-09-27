import React, { useState, useEffect } from 'react';
import { DiffHunk } from '../../../shared/types';
import { HunkHeader } from './HunkHeader';

interface UnifiedDiffViewProps {
  hunks: DiffHunk[];
  isCommitted: boolean;
}

export function UnifiedDiffView({ hunks }: UnifiedDiffViewProps) {
  // Map of hunkIndex -> Set of line indices selected in that hunk
  const [selectedLinesByHunk, setSelectedLinesByHunk] = useState<Record<number, Set<number>>>({});

  useEffect(() => setSelectedLinesByHunk({}), [hunks]);

  const toggleLine = (hunkIdx: number, lineIdx: number) => {
    setSelectedLinesByHunk((prev) => {
      const cur = new Set(prev[hunkIdx] || []);
      if (cur.has(lineIdx)) {
        cur.delete(lineIdx);
      } else {
        cur.add(lineIdx);
      }
      return { ...prev, [hunkIdx]: cur };
    });
  };

  const clearSelection = (hunkIdx: number) => {
    setSelectedLinesByHunk((prev) => {
      const next = { ...prev };
      delete next[hunkIdx];
      return next;
    });
  };

  return (
    <div className="font-mono leading-5" style={{ fontSize: 'var(--font-size-code)' }}>
      {hunks.map((hunk, hunkIdx) => {
        const selected = selectedLinesByHunk[hunkIdx] || new Set<number>();

        return (
          <div key={hunkIdx} className="border-b border-edge/40">
            <HunkHeader
              hunk={hunk}
              hunkIndex={hunkIdx}
              selectedLineIndices={selected}
              onClearSelection={() => clearSelection(hunkIdx)}
            />

            <div className="select-text">
              {hunk.lines.map((line, lineIdx) => {
                const isSelected = selected.has(lineIdx);
                const isDiffLine = line.kind === 'add' || line.kind === 'del';

                let rowBg = '';
                if (isSelected) {
                  rowBg = 'bg-accent/20 border-l-2 border-accent';
                } else if (line.kind === 'add') {
                  rowBg = 'bg-add-bg text-add/90';
                } else if (line.kind === 'del') {
                  rowBg = 'bg-del-bg text-del/90';
                }

                return (
                  <div
                    key={lineIdx}
                    className={`flex items-baseline group hover:brightness-110 transition-colors ${rowBg}`}
                  >
                    {/* Line selection checkbox/indicator for modified lines */}
                    <div
                      className={`w-6 shrink-0 flex items-center justify-center cursor-pointer select-none border-r border-edge/30 transition-colors ${
                        isDiffLine ? 'hover:bg-accent/30' : 'opacity-0'
                      }`}
                      title={isDiffLine ? 'Click to select line for staging/discarding' : undefined}
                      onClick={() => isDiffLine && toggleLine(hunkIdx, lineIdx)}
                    >
                      {isDiffLine && (
                        <div
                          className={`w-2.5 h-2.5 rounded-sm border transition-all ${
                            isSelected
                              ? 'bg-accent border-accent ring-1 ring-accent/50'
                              : 'border-dim/40 group-hover:border-dim'
                          }`}
                        />
                      )}
                    </div>

                    {/* Old line number */}
                    <span className="w-11 shrink-0 text-right pr-2 text-faint/70 select-none border-r border-edge/30 text-[11px]">
                      {line.oldNo ?? ''}
                    </span>

                    {/* New line number */}
                    <span className="w-11 shrink-0 text-right pr-2 text-faint/70 select-none border-r border-edge/30 text-[11px]">
                      {line.newNo ?? ''}
                    </span>

                    {/* Diff marker */}
                    <span className="w-5 shrink-0 text-center select-none opacity-60 font-semibold">
                      {line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '}
                    </span>

                    {/* Content */}
                    <span className="whitespace-pre-wrap break-all pr-4 flex-1 min-w-0 py-px">
                      {line.content}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

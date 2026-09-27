import React, { useState, useEffect } from 'react';
import { DiffHunk } from '../../../shared/types';
import { alignHunkLinesForSplit, InlineDiffPart } from './diffUtils';
import { HunkHeader } from './HunkHeader';

interface SplitDiffViewProps {
  hunks: DiffHunk[];
  isCommitted: boolean;
}

function RenderParts({ parts }: { parts: InlineDiffPart[] }) {
  return (
    <>
      {parts.map((p, idx) => (
        <span
          key={idx}
          className={
            p.isDiff
              ? 'bg-black/30 dark:bg-white/20 underline decoration-dotted font-medium rounded-xs px-0.5'
              : undefined
          }
        >
          {p.text}
        </span>
      ))}
    </>
  );
}

export function SplitDiffView({ hunks }: SplitDiffViewProps) {
  // Map of hunkIndex -> Set of hunkLineIndex
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
        const rows = alignHunkLinesForSplit(hunk);
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
              {rows.map((row, rowIdx) => {
                const leftSelected = row.left !== undefined && selected.has(row.left.hunkLineIndex);
                const rightSelected = row.right !== undefined && selected.has(row.right.hunkLineIndex);
                const hasLeftChange = row.left?.kind === 'del';
                const hasRightChange = row.right?.kind === 'add';

                let leftBg = '';
                if (leftSelected) {
                  leftBg = 'bg-accent/20 border-l-2 border-accent';
                } else if (hasLeftChange) {
                  leftBg = 'bg-del-bg text-del/90';
                }

                let rightBg = '';
                if (rightSelected) {
                  rightBg = 'bg-accent/20 border-l-2 border-accent';
                } else if (hasRightChange) {
                  rightBg = 'bg-add-bg text-add/90';
                }

                return (
                  <div key={rowIdx} className="flex min-w-full hover:brightness-105 transition-colors">
                    {/* LEFT COLUMN: OLD / DELETED */}
                    <div
                      className={`flex-1 min-w-0 flex items-baseline border-r border-edge/40 ${
                        row.left ? leftBg : 'bg-panel3/30'
                      }`}
                    >
                      {/* Line selection checkbox */}
                      <div
                        className={`w-5 shrink-0 flex items-center justify-center cursor-pointer select-none border-r border-edge/30 transition-colors ${
                          hasLeftChange ? 'hover:bg-accent/30' : 'opacity-0'
                        }`}
                        title={hasLeftChange ? 'Select line' : undefined}
                        onClick={() => hasLeftChange && toggleLine(hunkIdx, row.left!.hunkLineIndex)}
                      >
                        {hasLeftChange && (
                          <div
                            className={`w-2 h-2 rounded-xs border transition-all ${
                              leftSelected
                                ? 'bg-accent border-accent ring-1 ring-accent/50'
                                : 'border-dim/40'
                            }`}
                          />
                        )}
                      </div>

                      {/* Old line number */}
                      <span className="w-10 shrink-0 text-right pr-2 text-faint/70 select-none border-r border-edge/30 text-[11px]">
                        {row.left?.lineNo ?? ''}
                      </span>

                      {/* Left marker */}
                      <span className="w-4 shrink-0 text-center select-none opacity-60 font-semibold">
                        {hasLeftChange ? '-' : ' '}
                      </span>

                      {/* Left content */}
                      <span className="whitespace-pre-wrap break-all pr-3 flex-1 min-w-0 py-px">
                        {row.left?.inlineParts ? (
                          <RenderParts parts={row.left.inlineParts} />
                        ) : (
                          row.left?.content ?? ''
                        )}
                      </span>
                    </div>

                    {/* RIGHT COLUMN: NEW / ADDED */}
                    <div
                      className={`flex-1 min-w-0 flex items-baseline ${
                        row.right ? rightBg : 'bg-panel3/30'
                      }`}
                    >
                      {/* Line selection checkbox */}
                      <div
                        className={`w-5 shrink-0 flex items-center justify-center cursor-pointer select-none border-r border-edge/30 transition-colors ${
                          hasRightChange ? 'hover:bg-accent/30' : 'opacity-0'
                        }`}
                        title={hasRightChange ? 'Select line' : undefined}
                        onClick={() => hasRightChange && toggleLine(hunkIdx, row.right!.hunkLineIndex)}
                      >
                        {hasRightChange && (
                          <div
                            className={`w-2 h-2 rounded-xs border transition-all ${
                              rightSelected
                                ? 'bg-accent border-accent ring-1 ring-accent/50'
                                : 'border-dim/40'
                            }`}
                          />
                        )}
                      </div>

                      {/* New line number */}
                      <span className="w-10 shrink-0 text-right pr-2 text-faint/70 select-none border-r border-edge/30 text-[11px]">
                        {row.right?.lineNo ?? ''}
                      </span>

                      {/* Right marker */}
                      <span className="w-4 shrink-0 text-center select-none opacity-60 font-semibold">
                        {hasRightChange ? '+' : ' '}
                      </span>

                      {/* Right content */}
                      <span className="whitespace-pre-wrap break-all pr-3 flex-1 min-w-0 py-px">
                        {row.right?.inlineParts ? (
                          <RenderParts parts={row.right.inlineParts} />
                        ) : (
                          row.right?.content ?? ''
                        )}
                      </span>
                    </div>
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

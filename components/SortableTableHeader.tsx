'use client';

/**
 * SortableTableHeader Component
 * Clickable column headers with sort indicators
 */

import { memo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { SortField, SortDirection } from '@/types';
import { cn } from '@/lib/utils';

interface SortableTableHeaderProps {
  field: SortField;
  label: string;
  currentSort?: SortField | null;
  sortDirection?: SortDirection;
  onSort: (field: SortField) => void;
}

export const SortableTableHeader = memo(function SortableTableHeader({
  field,
  label,
  currentSort,
  sortDirection = 'desc',
  onSort,
}: SortableTableHeaderProps) {
  const isActive = currentSort === field;

  return (
    <th
      onClick={() => onSort(field)}
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        'cursor-pointer select-none transition-colors',
        'hover:bg-gunmetal-800/30',
        isActive ? 'text-electric-lime' : 'text-gray-400'
      )}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {isActive && (
          <div className="flex flex-col">
            <ChevronUp
              className={cn(
                'w-3 h-3',
                sortDirection === 'asc' ? 'text-electric-lime' : 'text-gray-600'
              )}
            />
            <ChevronDown
              className={cn(
                'w-3 h-3 -mt-1',
                sortDirection === 'desc' ? 'text-electric-lime' : 'text-gray-600'
              )}
            />
          </div>
        )}
        {!isActive && (
          <div className="flex flex-col opacity-30">
            <ChevronUp className="w-3 h-3" />
            <ChevronDown className="w-3 h-3 -mt-1" />
          </div>
        )}
      </div>
    </th>
  );
});

import React, { useState, useMemo } from 'react';
import { SubordinateRepPerformanceItem } from '../../types/commission';
import { formatCurrency } from '../../utils/formatters';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Search, Filter, Eye, Award, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

interface SubordinateRepsTableProps {
  reps: SubordinateRepPerformanceItem[];
  onViewRep: (repId: string) => void;
}

export function SubordinateRepsTable({ reps, onViewRep }: SubordinateRepsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredReps = useMemo(() => {
    return reps.filter((rep) => {
      const matchesSearch = rep.repName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' ? true : rep.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reps, searchQuery, statusFilter]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4 p-5">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Territory Subordinate Sales Team</h3>
          <p className="text-xs text-slate-500">
            Real-time individual sales progress, collections, and scheme milestones across your assigned territory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search representative..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8.5 h-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs min-w-36 bg-white border-slate-300">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="SUPER_ACHIEVER">Super Achiever (≥120%)</SelectItem>
              <SelectItem value="TARGET_ACHIEVED">Target Achieved (100-119%)</SelectItem>
              <SelectItem value="ON_TRACK">On Track (80-99%)</SelectItem>
              <SelectItem value="BELOW_TARGET">Below Target (&lt;80%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Team Table */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/90">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700">Representative</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Target</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Actual Sales</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Achievement %</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Collections</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Commission</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-center">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-500">
                  No sales representatives matched the filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredReps.map((rep) => {
                const isSuper = rep.status === 'SUPER_ACHIEVER';
                const isTarget = rep.status === 'TARGET_ACHIEVED';
                const isOnTrack = rep.status === 'ON_TRACK';

                return (
                  <TableRow key={rep.repId} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">{rep.repName}</div>
                      <div className="text-[11px] text-slate-500">{rep.scenario}</div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600 text-right font-medium">
                      {formatCurrency(rep.target)}
                    </TableCell>

                    <TableCell className="text-xs font-bold text-slate-900 text-right">
                      {formatCurrency(rep.actualSales)}
                    </TableCell>

                    <TableCell className="min-w-32">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className={`font-bold ${
                              isSuper
                                ? 'text-purple-700'
                                : isTarget
                                ? 'text-emerald-700'
                                : isOnTrack
                                ? 'text-amber-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {rep.achievementPercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isSuper
                                ? 'bg-purple-600'
                                : isTarget
                                ? 'bg-emerald-500'
                                : isOnTrack
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.min(rep.achievementPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-semibold text-slate-800 text-right">
                      {formatCurrency(rep.clearedCollections)}
                    </TableCell>

                    <TableCell className="text-xs font-bold text-emerald-600 text-right">
                      {formatCurrency(rep.earnedCommission)}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold whitespace-nowrap ${
                          isSuper
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : isTarget
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isOnTrack
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {isSuper
                          ? 'Super Achiever'
                          : isTarget
                          ? 'Target Achieved'
                          : isOnTrack
                          ? 'On Track'
                          : 'Below Target'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewRep(rep.repId)}
                        className="h-8 text-xs px-2.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border-indigo-200 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

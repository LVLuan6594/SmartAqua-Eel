import { useEffect, useState } from 'react';
import { dataAccess } from './dataAccess';
import { scopeForSourceFilter, type SourceFilterId } from '../../domain/scope';
import type { DataSummary, SourceCounts } from '../contracts/queries';
import {useDemo} from '../../store/demoStore';
import {getActiveAccount} from '../../auth/authService';
import type {Role} from '../../types/models';
const roleScope=(role:Role)=>{const a=getActiveAccount();return role==='farmer'?{farmerId:'mock:'+(a?.farmerId||'F001')}:role==='coop'?{cooperativeId:'mock:'+(a?.coopId||'HTX01')}:role==='manager'&&a?{communeCodes:a.unitIds?.length?a.unitIds:['__none__']}:{};};

/** Tổng hợp dữ liệu canonical (đa nguồn) theo bộ lọc nguồn — dùng cho dashboard/báo cáo. */
export function useDataSummary(filter: SourceFilterId = 'all') {
  const {db,role}=useDemo();
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    dataAccess
      .summary(scopeForSourceFilter(filter,roleScope(role)))
      .then((s) => {
        if (alive) {
          setSummary(s);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [filter,db,role]);
  return { summary, loading };
}

/** Đếm số bản ghi theo từng nguồn cho một loại thực thể. */
export function useSourceBreakdown(kind: 'facilities' | 'ponds' | 'zones' | 'cycles' | 'farmers', filter: SourceFilterId = 'all') {
  const {db,role}=useDemo();
  const [counts, setCounts] = useState<SourceCounts | null>(null);
  useEffect(() => {
    let alive = true;
    dataAccess
      .sourceBreakdown(kind, scopeForSourceFilter(filter,roleScope(role)))
      .then((c) => alive && setCounts(c))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [kind, filter,db,role]);
  return counts;
}

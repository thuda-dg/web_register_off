import { Component, Input } from '@angular/core';
import { HistoryRow } from '../../../../core/models/history.models';

@Component({ selector:'app-history-table', standalone:true, templateUrl:'./history-table.html' })
export class HistoryTableComponent {
  @Input({ required:true }) rows: HistoryRow[] = [];
  getTypeClasses(type:string): string { const c:Record<string,string>={OFF:'bg-emerald-600 text-white',U:'bg-slate-500 text-white','U/2':'bg-slate-400 text-white',R:'bg-red-500 text-white',X:'bg-slate-300 text-slate-700',A:'bg-blue-600 text-white','A/2':'bg-blue-400 text-white',S:'bg-purple-600 text-white',H:'bg-teal-600 text-white',M:'bg-orange-500 text-white'}; return c[type] ?? 'bg-slate-500 text-white'; }
  getTlStatusClasses(
  row: HistoryRow
): string {

  const status =
    row.tlStatus
      .trim()
      .toUpperCase();

  if (
    status === 'REJECTED'
  ) {
    return 'bg-red-100 text-red-800';
  }

  if (
    status === 'TL_APPROVED' ||
    status === 'APPROVED'
  ) {
    return 'bg-emerald-100 text-emerald-800';
  }

  if (
    status === 'PENDING_TL'
  ) {
    return 'bg-amber-100 text-amber-800';
  }

  return 'bg-slate-200 text-slate-700';

}
  getPublicStatusClasses(
  status?: string
): string {

  return (
    status || ''
  )
  .trim()
  .toLowerCase() === 'published'

    ? 'bg-emerald-100 text-emerald-800'

    : 'bg-slate-200 text-slate-700';

}


getStatusLabel(
  status:string
):string {

  switch(status) {

    case 'PENDING_TL':
      return 'Chờ TL duyệt';


    case 'TL_APPROVED':
      return 'TL đã duyệt';


    case 'PUBLIC':
      return 'Đã công bố';


    case 'REJECTED':
      return 'Từ chối';


    default:
      return status;

  }
}
formatDateTime(
  value?: string | null
): string {

  if (!value) {
    return '—';
  }

  const date = new Date(value);

  return date.toLocaleString(
    'vi-VN',
    {
      year:'numeric',
      month:'2-digit',
      day:'2-digit',
      hour:'2-digit',
      minute:'2-digit'
    }
  );
}

}
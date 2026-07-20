import { Component, Input } from '@angular/core';
import { HistoryRow } from '../../../../core/models/history.models';

@Component({ selector:'app-history-table', standalone:true, templateUrl:'./history-table.html' })
export class HistoryTableComponent {
  @Input({ required:true }) rows: HistoryRow[] = [];
  getTypeClasses(type:string): string { const c:Record<string,string>={OFF:'bg-emerald-600 text-white',U:'bg-slate-500 text-white','U/2':'bg-slate-400 text-white',R:'bg-red-500 text-white',X:'bg-slate-300 text-slate-700',A:'bg-blue-600 text-white','A/2':'bg-blue-400 text-white',S:'bg-purple-600 text-white',H:'bg-teal-600 text-white',M:'bg-orange-500 text-white'}; return c[type] ?? 'bg-slate-500 text-white'; }
  getTlStatusClasses(row:HistoryRow): string { const s=row.tlStatus.trim().toLowerCase(); if(['rejected','reject','từ chối','hủy','huỷ'].includes(s)||!row.active) return 'bg-red-100 text-red-800'; if(['approved','approve','đã duyệt'].includes(s)) return 'bg-emerald-100 text-emerald-800'; if(['pending','chờ duyệt','pending approval'].includes(s)) return 'bg-amber-100 text-amber-800'; return row.active?'bg-emerald-100 text-emerald-800':'bg-slate-200 text-slate-700'; }
  getPublicStatusClasses(status:string): string { return status.trim().toLowerCase()==='published'?'bg-emerald-100 text-emerald-800':'bg-slate-200 text-slate-700'; }
}

import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import { ImportCycle, ImportPreview, ImportResult } from '../../core/models/require-hc-import.model';
import { RequireHcImportService } from '../../core/services/require-hc-import.service';

@Component({ selector: 'app-require-hc-import', standalone: true,
  imports: [FormsModule, RouterLink], templateUrl: './require-hc-import.html' })
export class RequireHcImport implements OnInit {
  private readonly service = inject(RequireHcImportService);
  private readonly destroyRef = inject(DestroyRef);
  readonly cycles = signal<ImportCycle[]>([]);
  readonly cycleId = signal<number | null>(null);
  readonly file = signal<File | null>(null);
  readonly preview = signal<ImportPreview['data'] | null>(null);
  readonly loading = signal(false);
  readonly working = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly rowErrors = signal<{ row: number; message: string }[]>([]);
  readonly busy = computed(() => this.loading() || this.working());
  readonly selectedCycle = computed(() => this.cycles().find(cycle => cycle.id === this.cycleId()));
  ngOnInit(): void { this.loadCycles(); }

  loadCycles(): void {
    if (this.busy()) return;
    this.loading.set(true); this.error.set('');
    this.service.cycles().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: response => { if (response.ok) this.cycles.set(response.items); else this.error.set('Không tải được kỳ đăng ký.'); },
      error: error => this.error.set(error.error?.message || 'Không tải được kỳ đăng ký. Vui lòng thử lại.')
    });
  }
  private reset(): void { this.preview.set(null); this.rowErrors.set([]); this.error.set(''); this.success.set(''); }
  changeCycle(id: number | null): void { if (!this.busy()) { this.cycleId.set(id); this.reset(); } }
  chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (this.busy()) return;
    this.reset(); this.file.set(null);
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) { this.error.set('Chỉ nhận file Excel .xlsx hoặc .xls.'); return; }
    if (file.size > 5 * 1024 * 1024) { this.error.set('File Excel tối đa 5 MB.'); return; }
    this.file.set(file);
  }
  validate(): void { this.send('preview'); }
  import(): void { if (this.preview()?.cycleId === this.cycleId()) this.send('import'); }
  private send(mode: 'preview' | 'import'): void {
    if (this.busy()) return;
    const file = this.file(), cycleId = this.cycleId();
    if (!file || !cycleId) { this.error.set('Vui lòng chọn kỳ và file Excel.'); return; }
    this.working.set(true); this.error.set(''); this.success.set(''); this.rowErrors.set([]);
    if (mode === 'preview') this.preview.set(null);
    const request: Observable<ImportPreview | ImportResult> = mode === 'preview' ? this.service.preview(file, cycleId) : this.service.import(file, cycleId);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.working.set(false))).subscribe({
      next: response => {
        if (!response.ok) { this.error.set('Không xử lý được file. Vui lòng kiểm tra lại.'); return; }
        if ('rows' in response.data) this.preview.set(response.data);
        else { this.preview.set(null); this.success.set('message' in response ? response.message : 'Đã nhập RequireHC.'); }
      },
      error: error => {
        this.preview.set(null);
        this.error.set(error.error?.message || 'Không xử lý được file. Vui lòng thử lại.');
        this.rowErrors.set(Array.isArray(error.error?.errors) ? error.error.errors : []);
      }
    });
  }
}

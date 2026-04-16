import { Injectable, signal, computed } from '@angular/core';
import { ImportRecord, ImportSource, IMPORT_LIMITS } from '../models/import.model';
import { CanvasNode, NodeMetadataField, Position } from '../models/node.model';
import { IndexedDbService } from './indexed-db.service';
import { CanvasStoreService } from './canvas-store.service';
import { AuthService } from './auth.service';
import { parseCsv, csvToRecords } from '../utils/import/csv-parser';
import { parseJsonToRecords } from '../utils/import/json-parser';
import { parseHtmlToRecords } from '../utils/import/html-parser';
import {
  autoMapFields, CanonicalField, CANONICAL_FIELDS,
} from '../utils/import/metadata-normalizer';
import { FieldMapping, ValidatedRow, validateAllRows } from '../utils/import/row-validator';
import { createNodeStyle, createDefaultSize } from '../utils/node-defaults';
import { snapPosition } from '../utils/snap-utils';

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'done';

@Injectable({ providedIn: 'root' })
export class ImportService {
  // ── Wizard state ──
  private readonly _step = signal<ImportStep>('upload');
  readonly step = this._step.asReadonly();

  private readonly _source = signal<ImportSource | null>(null);
  readonly source = this._source.asReadonly();

  private readonly _fileName = signal('');
  readonly fileName = this._fileName.asReadonly();

  private readonly _sourceColumns = signal<string[]>([]);
  readonly sourceColumns = this._sourceColumns.asReadonly();

  private readonly _rawRecords = signal<Record<string, string>[]>([]);
  readonly rawRecordCount = computed(() => this._rawRecords().length);

  private readonly _mappings = signal<FieldMapping[]>([]);
  readonly mappings = this._mappings.asReadonly();

  private readonly _validatedRows = signal<ValidatedRow[]>([]);
  readonly validatedRows = this._validatedRows.asReadonly();

  readonly acceptedRows = computed(() => this._validatedRows().filter(r => r.accepted));
  readonly rejectedRows = computed(() => this._validatedRows().filter(r => !r.accepted));

  private readonly _parseError = signal<string | null>(null);
  readonly parseError = this._parseError.asReadonly();

  readonly canonicalFields = CANONICAL_FIELDS;

  constructor(
    private db: IndexedDbService,
    private canvasStore: CanvasStoreService,
    private auth: AuthService,
  ) {}

  // ────────────────── Step 1: Upload / Paste ──────────────────

  parseFile(file: File): void {
    this._parseError.set(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = () => {
      const text = reader.result as string;
      try {
        if (ext === 'csv') {
          this.processCsv(text, file.name);
        } else if (ext === 'json') {
          this.processJson(text, file.name);
        } else {
          this._parseError.set(`Unsupported file type: .${ext}. Use CSV or JSON.`);
        }
      } catch (e: any) {
        this._parseError.set(e.message || 'Failed to parse file.');
      }
    };

    reader.onerror = () => this._parseError.set('Failed to read file.');
    reader.readAsText(file);
  }

  parsePastedContent(text: string): void {
    this._parseError.set(null);
    const trimmed = text.trim();
    if (!trimmed) {
      this._parseError.set('Pasted content is empty.');
      return;
    }

    try {
      // Try JSON first
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        this.processJson(trimmed, 'pasted-json');
        return;
      }

      // Try HTML
      if (trimmed.startsWith('<') || /<\w+[\s>]/.test(trimmed)) {
        this.processHtml(trimmed, 'pasted-html');
        return;
      }

      // Fallback: try CSV
      this.processCsv(trimmed, 'pasted-csv');
    } catch (e: any) {
      this._parseError.set(e.message || 'Failed to parse pasted content.');
    }
  }

  private processCsv(text: string, name: string): void {
    const rows = parseCsv(text);
    const records = csvToRecords(rows);
    this.loadRecords(records, 'csv', name, rows[0] ?? []);
  }

  private processJson(text: string, name: string): void {
    const records = parseJsonToRecords(text);
    const columns = records.length > 0 ? Object.keys(records[0]) : [];
    this.loadRecords(records, 'json', name, columns);
  }

  private processHtml(text: string, name: string): void {
    const records = parseHtmlToRecords(text);
    const columns = records.length > 0 ? Object.keys(records[0]) : [];
    this.loadRecords(records, 'html-snippet', name, columns);
  }

  private loadRecords(
    records: Record<string, string>[],
    source: ImportSource,
    name: string,
    columns: string[],
  ): void {
    if (records.length === 0) {
      this._parseError.set('No data rows found in the input.');
      return;
    }

    if (records.length > IMPORT_LIMITS.MAX_ROWS_PER_IMPORT) {
      this._parseError.set(
        `Import limited to ${IMPORT_LIMITS.MAX_ROWS_PER_IMPORT} rows. File contains ${records.length}.`,
      );
      return;
    }

    // Deduce columns from all records
    const allCols = new Set(columns.map(c => c.trim()).filter(Boolean));
    for (const rec of records) {
      Object.keys(rec).forEach(k => allCols.add(k));
    }

    const cols = [...allCols];
    this._source.set(source);
    this._fileName.set(name);
    this._rawRecords.set(records);
    this._sourceColumns.set(cols);

    // Auto-map fields
    const autoMap = autoMapFields(cols);
    const mappings: FieldMapping[] = cols.map(c => ({
      sourceColumn: c,
      targetField: autoMap.get(c) ?? null,
    }));
    this._mappings.set(mappings);
    this._step.set('mapping');
  }

  // ────────────────── Step 2: Mapping ──────────────────

  updateMapping(sourceColumn: string, targetField: CanonicalField | null): void {
    this._mappings.update(list =>
      list.map(m => m.sourceColumn === sourceColumn ? { ...m, targetField } : m),
    );
  }

  proceedToPreview(): void {
    const validated = validateAllRows(this._rawRecords(), this._mappings());
    this._validatedRows.set(validated);
    this._step.set('preview');
  }

  // ────────────────── Step 3: Preview ──────────────────

  toggleRowAccepted(rowIndex: number): void {
    this._validatedRows.update(rows =>
      rows.map(r => r.rowIndex === rowIndex ? { ...r, accepted: !r.accepted } : r),
    );
  }

  // ────────────────── Step 4: Commit ──────────────────

  async commitImport(): Promise<number> {
    const canvas = this.canvasStore.currentCanvas();
    const profile = this.auth.profile();
    if (!canvas || !profile) return 0;

    const accepted = this.acceptedRows();
    if (accepted.length === 0) return 0;

    // Create import record
    const importRecord: ImportRecord = {
      id: crypto.randomUUID(),
      canvasId: canvas.id,
      profileId: profile.id,
      source: this._source()!,
      originalFileName: this._fileName(),
      rowCount: accepted.length,
      status: 'completed',
      metadata: [],
      errorMessage: null,
      importedAt: Date.now(),
      createdAt: Date.now(),
    };
    await this.db.put('imports', importRecord);

    // Create nodes from accepted rows
    const baseX = 80;
    const baseY = 80;
    const spacingY = 110;
    const nodeWidth = 220;
    const nodeHeight = 80;

    const nodes: CanvasNode[] = accepted.map((row, i) => {
      const roleField = row.fields.find(f => f.key === 'role');
      const label = roleField?.value || `Import Row ${row.rowIndex + 1}`;

      const metadata: NodeMetadataField[] = row.fields.map(f => ({
        key: f.key,
        value: f.value,
        normalized: f.normalized,
        originalValue: f.originalValue,
        flagged: f.flagged,
      }));

      const pos = snapPosition({
        x: baseX,
        y: baseY + i * spacingY,
      });

      return {
        id: crypto.randomUUID(),
        canvasId: canvas.id,
        type: 'data' as const,
        position: pos,
        size: { width: nodeWidth, height: nodeHeight },
        label: label.substring(0, 200),
        notes: this.buildNotesFromFields(row.fields),
        style: createNodeStyle('data'),
        templateId: null,
        importId: importRecord.id,
        metadata,
        zIndex: 0,
        locked: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    });

    const created = await this.canvasStore.addImportedNodes(nodes);
    this._step.set('done');
    return created.length;
  }

  private buildNotesFromFields(fields: { key: string; value: string }[]): string {
    return fields
      .filter(f => f.value)
      .map(f => `${f.key}: ${f.value}`)
      .join('\n')
      .substring(0, 1000);
  }

  // ────────────────── Reset ──────────────────

  reset(): void {
    this._step.set('upload');
    this._source.set(null);
    this._fileName.set('');
    this._sourceColumns.set([]);
    this._rawRecords.set([]);
    this._mappings.set([]);
    this._validatedRows.set([]);
    this._parseError.set(null);
  }
}

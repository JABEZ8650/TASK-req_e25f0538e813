import { Component, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportService } from '../../../core/services/import.service';
import { CanvasStoreService } from '../../../core/services/canvas-store.service';
import { CANONICAL_FIELDS, CanonicalField } from '../../../core/utils/import/metadata-normalizer';

@Component({
  selector: 'app-import-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-wizard.component.html',
  styleUrl: './import-wizard.component.scss',
})
export class ImportWizardComponent {
  @Output() closed = new EventEmitter<void>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  pasteContent = '';
  commitCount = 0;

  readonly canonicalFields = CANONICAL_FIELDS;

  constructor(
    protected importSvc: ImportService,
    protected store: CanvasStoreService,
  ) {}

  // ── Step 1: Upload ──

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.importSvc.parseFile(file);
    }
  }

  onPaste(): void {
    if (this.pasteContent.trim()) {
      this.importSvc.parsePastedContent(this.pasteContent);
    }
  }

  // ── Step 2: Mapping ──

  onMappingChange(sourceColumn: string, value: string): void {
    this.importSvc.updateMapping(
      sourceColumn,
      value ? (value as CanonicalField) : null,
    );
  }

  goToPreview(): void {
    this.importSvc.proceedToPreview();
  }

  // ── Step 3: Preview ──

  toggleRow(rowIndex: number): void {
    this.importSvc.toggleRowAccepted(rowIndex);
  }

  async commit(): Promise<void> {
    this.commitCount = await this.importSvc.commitImport();
  }

  // ── Navigation ──

  close(): void {
    this.importSvc.reset();
    this.pasteContent = '';
    this.commitCount = 0;
    this.closed.emit();
  }

  startOver(): void {
    this.importSvc.reset();
    this.pasteContent = '';
    this.commitCount = 0;
  }
}

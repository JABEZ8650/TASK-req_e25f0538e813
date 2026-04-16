import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportWizardComponent } from './import-wizard.component';
import { ImportService } from '../../../core/services/import.service';
import { CanvasStoreService } from '../../../core/services/canvas-store.service';
import { signal } from '@angular/core';

describe('ImportWizardComponent', () => {
  let component: ImportWizardComponent;
  let fixture: ComponentFixture<ImportWizardComponent>;
  let mockImport: any;
  let mockStore: any;

  beforeEach(async () => {
    mockImport = {
      step: signal('upload'),
      source: signal(null),
      fileName: signal(''),
      sourceColumns: signal([]),
      rawRecordCount: signal(0),
      mappings: signal([]),
      validatedRows: signal([]),
      acceptedRows: signal([]),
      rejectedRows: signal([]),
      parseError: signal(null),
      canonicalFields: ['role', 'salary', 'location', 'experience', 'education', 'skills'],
      parseFile: jasmine.createSpy('parseFile'),
      parsePastedContent: jasmine.createSpy('parsePastedContent'),
      updateMapping: jasmine.createSpy('updateMapping'),
      proceedToPreview: jasmine.createSpy('proceedToPreview'),
      toggleRowAccepted: jasmine.createSpy('toggleRowAccepted'),
      commitImport: jasmine.createSpy('commitImport').and.returnValue(Promise.resolve(0)),
      reset: jasmine.createSpy('reset'),
    };

    mockStore = {
      currentCanvas: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [ImportWizardComponent],
      providers: [
        { provide: ImportService, useValue: mockImport },
        { provide: CanvasStoreService, useValue: mockStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show upload step by default', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.upload-zone')).toBeTruthy();
    expect(el.querySelector('.paste-area')).toBeTruthy();
  });

  it('should call parsePastedContent on paste action', () => {
    component.pasteContent = '{"name":"test"}';
    component.onPaste();
    expect(mockImport.parsePastedContent).toHaveBeenCalledWith('{"name":"test"}');
  });

  it('should not call parse for empty paste', () => {
    component.pasteContent = '   ';
    component.onPaste();
    expect(mockImport.parsePastedContent).not.toHaveBeenCalled();
  });

  it('should show mapping step when service is on mapping', () => {
    mockImport.step.set('mapping');
    mockImport.rawRecordCount = signal(5);
    mockImport.mappings.set([{ sourceColumn: 'name', targetField: 'role' }]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.mapping-section')).toBeTruthy();
  });

  it('should emit closed event and reset on close', () => {
    spyOn(component.closed, 'emit');
    component.close();
    expect(mockImport.reset).toHaveBeenCalled();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('should call startOver and reset state', () => {
    component.pasteContent = 'some data';
    component.startOver();
    expect(mockImport.reset).toHaveBeenCalled();
    expect(component.pasteContent).toBe('');
  });

  it('should show error banner when parse error exists', () => {
    mockImport.parseError.set('Invalid JSON');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.error-banner')?.textContent).toContain('Invalid JSON');
  });

  it('should show done step after commit', () => {
    mockImport.step.set('done');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.done-section')).toBeTruthy();
    expect(el.textContent).toContain('Import Complete');
  });
});

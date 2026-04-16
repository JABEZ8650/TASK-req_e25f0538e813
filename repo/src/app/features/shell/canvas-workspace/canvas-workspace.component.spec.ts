import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CanvasWorkspaceComponent } from './canvas-workspace.component';
import { CanvasStoreService } from '../../../core/services/canvas-store.service';
import { HistoryService } from '../../../core/services/history.service';
import { ExportService } from '../../../core/services/export.service';
import { signal } from '@angular/core';
import { Canvas, CANVAS_DEFAULTS, APPROVAL_DEFAULTS } from '../../../core/models/canvas.model';

describe('CanvasWorkspaceComponent', () => {
  let component: CanvasWorkspaceComponent;
  let fixture: ComponentFixture<CanvasWorkspaceComponent>;

  const fakeCanvas: Canvas = {
    id: 'c1', name: 'Test', description: '', profileId: 'p1',
    status: 'draft', settings: CANVAS_DEFAULTS, approval: APPROVAL_DEFAULTS,
    publishedVersionId: null, createdAt: 0, updatedAt: 0,
  };

  let mockStore: any;
  let mockHistory: any;
  let mockExport: any;

  beforeEach(async () => {
    mockStore = {
      currentCanvas: signal<Canvas | null>(null),
      nodes: signal([]),
      edges: signal([]),
      selectedNodeId: signal(null),
      selectedEdgeId: signal(null),
      zoom: signal(1),
      panX: signal(0),
      panY: signal(0),
      zoomPercent: signal(100),
      addNode: jasmine.createSpy('addNode').and.returnValue(Promise.resolve(null)),
      selectNode: jasmine.createSpy('selectNode'),
      selectEdge: jasmine.createSpy('selectEdge'),
      clearSelection: jasmine.createSpy('clearSelection'),
      updateNodeLocal: jasmine.createSpy('updateNodeLocal'),
      moveNodeFinish: jasmine.createSpy('moveNodeFinish'),
      zoomIn: jasmine.createSpy('zoomIn'),
      zoomOut: jasmine.createSpy('zoomOut'),
      resetZoom: jasmine.createSpy('resetZoom'),
      zoomToward: jasmine.createSpy('zoomToward'),
      adjustPan: jasmine.createSpy('adjustPan'),
      addEdge: jasmine.createSpy('addEdge'),
      removeNode: jasmine.createSpy('removeNode'),
      removeEdge: jasmine.createSpy('removeEdge'),
      nodeById: jasmine.createSpy('nodeById').and.returnValue(undefined),
      undo: jasmine.createSpy('undo'),
      redo: jasmine.createSpy('redo'),
    };

    mockHistory = {
      canUndo: signal(false),
      canRedo: signal(false),
    };

    mockExport = {
      exportJson: jasmine.createSpy('exportJson'),
      exportSvg: jasmine.createSpy('exportSvg'),
      exportPng: jasmine.createSpy('exportPng'),
    };

    await TestBed.configureTestingModule({
      imports: [CanvasWorkspaceComponent],
      providers: [
        { provide: CanvasStoreService, useValue: mockStore },
        { provide: HistoryService, useValue: mockHistory },
        { provide: ExportService, useValue: mockExport },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasWorkspaceComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show empty state when no canvas is open', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty-state')).toBeTruthy();
    expect(el.querySelector('.workspace-toolbar')).toBeFalsy();
  });

  it('should show toolbar when canvas is open', () => {
    mockStore.currentCanvas.set(fakeCanvas);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.workspace-toolbar')).toBeTruthy();
    expect(el.querySelector('.empty-state')).toBeFalsy();
  });

  it('should have node type toolbar buttons', () => {
    mockStore.currentCanvas.set(fakeCanvas);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.toolbar-btn');
    const labels = Array.from(buttons).map((b: any) => b.textContent.trim());
    expect(labels).toContain('Start');
    expect(labels).toContain('Process');
    expect(labels).toContain('Decision');
  });

  it('should have export buttons', () => {
    mockStore.currentCanvas.set(fakeCanvas);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.toolbar-btn');
    const labels = Array.from(buttons).map((b: any) => b.textContent.trim());
    expect(labels).toContain('JSON');
    expect(labels).toContain('SVG');
    expect(labels).toContain('PNG');
  });

  it('should call export service on export button clicks', () => {
    mockStore.currentCanvas.set(fakeCanvas);
    fixture.detectChanges();
    component.exportJson();
    expect(mockExport.exportJson).toHaveBeenCalled();
    component.exportSvg();
    expect(mockExport.exportSvg).toHaveBeenCalled();
    component.exportPng();
    expect(mockExport.exportPng).toHaveBeenCalled();
  });

  it('should expose toolbarNodes with expected types', () => {
    expect(component.toolbarNodes.length).toBeGreaterThan(0);
    const types = component.toolbarNodes.map(t => t.type);
    expect(types).toContain('start');
    expect(types).toContain('process');
    expect(types).toContain('end');
  });

  it('should compute grid CSS values', () => {
    mockStore.currentCanvas.set(fakeCanvas);
    fixture.detectChanges();
    expect(component.gridSizePx()).toBe(8); // 8 * zoom(1)
  });
});

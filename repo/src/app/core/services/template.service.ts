import { Injectable } from '@angular/core';
import { Template, TemplateFamily } from '../models/template.model';
import { IndexedDbService } from './indexed-db.service';
import { LocalStorageService } from './local-storage.service';

const SEED_VERSION_KEY = 'template_seed_v';
const CURRENT_SEED_VERSION = 2;

@Injectable({ providedIn: 'root' })
export class TemplateService {
  constructor(
    private db: IndexedDbService,
    private ls: LocalStorageService,
  ) {}

  async seedBuiltInTemplates(): Promise<void> {
    const seeded = this.ls.get<number>(SEED_VERSION_KEY);
    if (seeded === CURRENT_SEED_VERSION) return;

    const existing = await this.db.getAll<Template>('templates');
    const builtInIds = new Set(existing.filter(t => t.builtIn).map(t => t.id));

    for (const tpl of BUILT_IN_TEMPLATES) {
      if (!builtInIds.has(tpl.id)) {
        await this.db.put('templates', tpl);
      }
    }

    this.ls.set(SEED_VERSION_KEY, CURRENT_SEED_VERSION);
  }

  async getByFamily(family: TemplateFamily): Promise<Template[]> {
    return this.db.getAllByIndex<Template>('templates', 'family', family);
  }

  async getAll(): Promise<Template[]> {
    return this.db.getAll<Template>('templates');
  }
}

// ──────────────────────────────────────────────────
// 20 built-in templates: 8 process, 6 mind-map, 6 page-layout
// ──────────────────────────────────────────────────

const now = Date.now();
const t = (id: string, name: string, desc: string, family: TemplateFamily, nodes: any[], edges: any[]): Template => ({
  id, name, description: desc, family, builtIn: true, thumbnail: '', createdAt: now, updatedAt: now, nodes, edges,
});

const BUILT_IN_TEMPLATES: Template[] = [

  // ═══════════════ PROCESS (8) ═══════════════

  t('tpl-basic-flowchart', 'Basic Flowchart', 'Start-to-end flowchart with a decision branch', 'process', [
    { relativeId: 'start', type: 'start', relativePosition: { x: 220, y: 40 }, size: { width: 120, height: 50 }, label: 'Start', style: {} },
    { relativeId: 'p1', type: 'process', relativePosition: { x: 200, y: 140 }, size: { width: 160, height: 80 }, label: 'Process Step', style: {} },
    { relativeId: 'd1', type: 'decision', relativePosition: { x: 210, y: 270 }, size: { width: 140, height: 80 }, label: 'Condition?', style: {} },
    { relativeId: 'p2', type: 'process', relativePosition: { x: 420, y: 270 }, size: { width: 160, height: 80 }, label: 'Alternate Path', style: {} },
    { relativeId: 'end', type: 'end', relativePosition: { x: 220, y: 410 }, size: { width: 120, height: 50 }, label: 'End', style: {} },
  ], [
    { sourceRelativeId: 'start', targetRelativeId: 'p1', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '', style: {} },
    { sourceRelativeId: 'p1', targetRelativeId: 'd1', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '', style: {} },
    { sourceRelativeId: 'd1', targetRelativeId: 'end', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: 'Yes', style: {} },
    { sourceRelativeId: 'd1', targetRelativeId: 'p2', sourcePort: 'right', targetPort: 'left', type: 'orthogonal', label: 'No', style: {} },
  ]),

  t('tpl-linear-process', 'Linear Process', 'Sequential three-step process', 'process', [
    { relativeId: 'start', type: 'start', relativePosition: { x: 220, y: 40 }, size: { width: 120, height: 50 }, label: 'Start', style: {} },
    { relativeId: 's1', type: 'process', relativePosition: { x: 200, y: 130 }, size: { width: 160, height: 80 }, label: 'Step 1', style: {} },
    { relativeId: 's2', type: 'process', relativePosition: { x: 200, y: 250 }, size: { width: 160, height: 80 }, label: 'Step 2', style: {} },
    { relativeId: 's3', type: 'process', relativePosition: { x: 200, y: 370 }, size: { width: 160, height: 80 }, label: 'Step 3', style: {} },
    { relativeId: 'end', type: 'end', relativePosition: { x: 220, y: 490 }, size: { width: 120, height: 50 }, label: 'End', style: {} },
  ], [
    { sourceRelativeId: 'start', targetRelativeId: 's1', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '', style: {} },
    { sourceRelativeId: 's1', targetRelativeId: 's2', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '', style: {} },
    { sourceRelativeId: 's2', targetRelativeId: 's3', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '', style: {} },
    { sourceRelativeId: 's3', targetRelativeId: 'end', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '', style: {} },
  ]),

  t('tpl-approval-workflow', 'Approval Workflow', 'Request, review, approve or reject', 'process', [
    { relativeId: 'req', type: 'start', relativePosition: { x: 220, y: 40 }, size: { width: 140, height: 50 }, label: 'Submit Request', style: {} },
    { relativeId: 'rev', type: 'process', relativePosition: { x: 210, y: 140 }, size: { width: 160, height: 80 }, label: 'Review', style: {} },
    { relativeId: 'dec', type: 'decision', relativePosition: { x: 220, y: 270 }, size: { width: 140, height: 80 }, label: 'Approved?', style: {} },
    { relativeId: 'ok', type: 'end', relativePosition: { x: 100, y: 400 }, size: { width: 120, height: 50 }, label: 'Approved', style: {} },
    { relativeId: 'no', type: 'end', relativePosition: { x: 360, y: 400 }, size: { width: 120, height: 50 }, label: 'Rejected', style: {} },
  ], [
    { sourceRelativeId: 'req', targetRelativeId: 'rev', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '', style: {} },
    { sourceRelativeId: 'rev', targetRelativeId: 'dec', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '', style: {} },
    { sourceRelativeId: 'dec', targetRelativeId: 'ok', sourcePort: 'left', targetPort: 'top', type: 'orthogonal', label: 'Yes', style: {} },
    { sourceRelativeId: 'dec', targetRelativeId: 'no', sourcePort: 'right', targetPort: 'top', type: 'orthogonal', label: 'No', style: {} },
  ]),

  t('tpl-swimlane-2', 'Two-Lane Process', 'Two parallel swimlanes with handoff', 'process', [
    { relativeId: 'l1', type: 'group', relativePosition: { x: 40, y: 40 }, size: { width: 260, height: 300 }, label: 'Team A', style: {} },
    { relativeId: 'l2', type: 'group', relativePosition: { x: 340, y: 40 }, size: { width: 260, height: 300 }, label: 'Team B', style: {} },
    { relativeId: 'a1', type: 'process', relativePosition: { x: 80, y: 100 }, size: { width: 160, height: 70 }, label: 'Task A1', style: {} },
    { relativeId: 'a2', type: 'process', relativePosition: { x: 80, y: 210 }, size: { width: 160, height: 70 }, label: 'Task A2', style: {} },
    { relativeId: 'b1', type: 'process', relativePosition: { x: 390, y: 100 }, size: { width: 160, height: 70 }, label: 'Task B1', style: {} },
    { relativeId: 'b2', type: 'process', relativePosition: { x: 390, y: 210 }, size: { width: 160, height: 70 }, label: 'Task B2', style: {} },
  ], [
    { sourceRelativeId: 'a1', targetRelativeId: 'a2', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '', style: {} },
    { sourceRelativeId: 'a2', targetRelativeId: 'b1', sourcePort: 'right', targetPort: 'left', type: 'orthogonal', label: 'Handoff', style: {} },
    { sourceRelativeId: 'b1', targetRelativeId: 'b2', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '', style: {} },
  ]),

  t('tpl-error-handling', 'Error Handling Flow', 'Process with error branch and retry loop', 'process', [
    { relativeId: 'start', type: 'start', relativePosition: { x: 220, y: 30 }, size: { width: 120, height: 50 }, label: 'Start', style: {} },
    { relativeId: 'proc', type: 'process', relativePosition: { x: 200, y: 120 }, size: { width: 160, height: 80 }, label: 'Process', style: {} },
    { relativeId: 'chk', type: 'decision', relativePosition: { x: 210, y: 250 }, size: { width: 140, height: 80 }, label: 'Error?', style: {} },
    { relativeId: 'err', type: 'process', relativePosition: { x: 430, y: 250 }, size: { width: 140, height: 80 }, label: 'Handle Error', style: {} },
    { relativeId: 'end', type: 'end', relativePosition: { x: 220, y: 390 }, size: { width: 120, height: 50 }, label: 'Done', style: {} },
  ], [
    { sourceRelativeId: 'start', targetRelativeId: 'proc', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '', style: {} },
    { sourceRelativeId: 'proc', targetRelativeId: 'chk', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '', style: {} },
    { sourceRelativeId: 'chk', targetRelativeId: 'end', sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: 'No', style: {} },
    { sourceRelativeId: 'chk', targetRelativeId: 'err', sourcePort: 'right', targetPort: 'left', type: 'orthogonal', label: 'Yes', style: {} },
    { sourceRelativeId: 'err', targetRelativeId: 'proc', sourcePort: 'top', targetPort: 'right', type: 'orthogonal', label: 'Retry', style: {} },
  ]),

  t('tpl-onboarding', 'User Onboarding', 'Sign-up, verify, setup, welcome', 'process', [
    { relativeId: 's', type: 'start', relativePosition: { x: 60, y: 140 }, size: { width: 100, height: 50 }, label: 'Sign Up', style: {} },
    { relativeId: 'v', type: 'process', relativePosition: { x: 200, y: 130 }, size: { width: 140, height: 70 }, label: 'Verify Email', style: {} },
    { relativeId: 'p', type: 'process', relativePosition: { x: 380, y: 130 }, size: { width: 140, height: 70 }, label: 'Setup Profile', style: {} },
    { relativeId: 'e', type: 'end', relativePosition: { x: 560, y: 140 }, size: { width: 120, height: 50 }, label: 'Welcome', style: {} },
  ], [
    { sourceRelativeId: 's', targetRelativeId: 'v', sourcePort: 'right', targetPort: 'left', type: 'orthogonal', label: '', style: {} },
    { sourceRelativeId: 'v', targetRelativeId: 'p', sourcePort: 'right', targetPort: 'left', type: 'orthogonal', label: '', style: {} },
    { sourceRelativeId: 'p', targetRelativeId: 'e', sourcePort: 'right', targetPort: 'left', type: 'orthogonal', label: '', style: {} },
  ]),

  t('tpl-cicd-pipeline', 'CI/CD Pipeline', 'Build, test, deploy stages', 'process', [
    { relativeId: 'src', type: 'start', relativePosition: { x: 40, y: 130 }, size: { width: 110, height: 50 }, label: 'Code Push', style: {} },
    { relativeId: 'build', type: 'process', relativePosition: { x: 190, y: 120 }, size: { width: 130, height: 70 }, label: 'Build', style: {} },
    { relativeId: 'test', type: 'process', relativePosition: { x: 360, y: 120 }, size: { width: 130, height: 70 }, label: 'Test', style: {} },
    { relativeId: 'dep', type: 'process', relativePosition: { x: 530, y: 120 }, size: { width: 130, height: 70 }, label: 'Deploy', style: {} },
    { relativeId: 'done', type: 'end', relativePosition: { x: 700, y: 130 }, size: { width: 110, height: 50 }, label: 'Live', style: {} },
  ], [
    { sourceRelativeId: 'src', targetRelativeId: 'build', sourcePort: 'right', targetPort: 'left', type: 'straight', label: '', style: {} },
    { sourceRelativeId: 'build', targetRelativeId: 'test', sourcePort: 'right', targetPort: 'left', type: 'straight', label: '', style: {} },
    { sourceRelativeId: 'test', targetRelativeId: 'dep', sourcePort: 'right', targetPort: 'left', type: 'straight', label: '', style: {} },
    { sourceRelativeId: 'dep', targetRelativeId: 'done', sourcePort: 'right', targetPort: 'left', type: 'straight', label: '', style: {} },
  ]),

  t('tpl-data-pipeline', 'Data Pipeline', 'Ingest, transform, load, analyze', 'process', [
    { relativeId: 'ing', type: 'data', relativePosition: { x: 60, y: 130 }, size: { width: 130, height: 70 }, label: 'Ingest', style: {} },
    { relativeId: 'trn', type: 'process', relativePosition: { x: 230, y: 130 }, size: { width: 130, height: 70 }, label: 'Transform', style: {} },
    { relativeId: 'ld', type: 'data', relativePosition: { x: 400, y: 130 }, size: { width: 130, height: 70 }, label: 'Load', style: {} },
    { relativeId: 'an', type: 'process', relativePosition: { x: 570, y: 130 }, size: { width: 130, height: 70 }, label: 'Analyze', style: {} },
  ], [
    { sourceRelativeId: 'ing', targetRelativeId: 'trn', sourcePort: 'right', targetPort: 'left', type: 'straight', label: '', style: {} },
    { sourceRelativeId: 'trn', targetRelativeId: 'ld', sourcePort: 'right', targetPort: 'left', type: 'straight', label: '', style: {} },
    { sourceRelativeId: 'ld', targetRelativeId: 'an', sourcePort: 'right', targetPort: 'left', type: 'straight', label: '', style: {} },
  ]),

  // ═══════════════ MIND MAP (6) ═══════════════

  t('tpl-central-topic', 'Central Topic', 'Central idea with four radiating branches', 'mind-map', [
    { relativeId: 'c', type: 'process', relativePosition: { x: 250, y: 200 }, size: { width: 180, height: 80 }, label: 'Central Idea', style: {} },
    { relativeId: 'b1', type: 'process', relativePosition: { x: 250, y: 40 }, size: { width: 140, height: 60 }, label: 'Branch 1', style: {} },
    { relativeId: 'b2', type: 'process', relativePosition: { x: 500, y: 200 }, size: { width: 140, height: 60 }, label: 'Branch 2', style: {} },
    { relativeId: 'b3', type: 'process', relativePosition: { x: 250, y: 360 }, size: { width: 140, height: 60 }, label: 'Branch 3', style: {} },
    { relativeId: 'b4', type: 'process', relativePosition: { x: 40, y: 200 }, size: { width: 140, height: 60 }, label: 'Branch 4', style: {} },
  ], [
    { sourceRelativeId: 'c', targetRelativeId: 'b1', sourcePort: 'top', targetPort: 'bottom', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'c', targetRelativeId: 'b2', sourcePort: 'right', targetPort: 'left', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'c', targetRelativeId: 'b3', sourcePort: 'bottom', targetPort: 'top', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'c', targetRelativeId: 'b4', sourcePort: 'left', targetPort: 'right', type: 'curved', label: '', style: {} },
  ]),

  t('tpl-brainstorm', 'Brainstorm Web', 'Central topic with six radiating ideas', 'mind-map', [
    { relativeId: 'core', type: 'process', relativePosition: { x: 270, y: 220 }, size: { width: 160, height: 70 }, label: 'Main Topic', style: {} },
    { relativeId: 't1', type: 'text', relativePosition: { x: 290, y: 60 }, size: { width: 120, height: 40 }, label: 'Idea A', style: {} },
    { relativeId: 't2', type: 'text', relativePosition: { x: 490, y: 130 }, size: { width: 120, height: 40 }, label: 'Idea B', style: {} },
    { relativeId: 't3', type: 'text', relativePosition: { x: 490, y: 310 }, size: { width: 120, height: 40 }, label: 'Idea C', style: {} },
    { relativeId: 't4', type: 'text', relativePosition: { x: 290, y: 380 }, size: { width: 120, height: 40 }, label: 'Idea D', style: {} },
    { relativeId: 't5', type: 'text', relativePosition: { x: 80, y: 310 }, size: { width: 120, height: 40 }, label: 'Idea E', style: {} },
    { relativeId: 't6', type: 'text', relativePosition: { x: 80, y: 130 }, size: { width: 120, height: 40 }, label: 'Idea F', style: {} },
  ], [
    { sourceRelativeId: 'core', targetRelativeId: 't1', sourcePort: 'top', targetPort: 'bottom', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'core', targetRelativeId: 't2', sourcePort: 'right', targetPort: 'left', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'core', targetRelativeId: 't3', sourcePort: 'right', targetPort: 'left', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'core', targetRelativeId: 't4', sourcePort: 'bottom', targetPort: 'top', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'core', targetRelativeId: 't5', sourcePort: 'left', targetPort: 'right', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'core', targetRelativeId: 't6', sourcePort: 'left', targetPort: 'right', type: 'curved', label: '', style: {} },
  ]),

  t('tpl-pros-cons', 'Pros & Cons', 'Two-sided comparison from a central topic', 'mind-map', [
    { relativeId: 'topic', type: 'process', relativePosition: { x: 250, y: 180 }, size: { width: 160, height: 70 }, label: 'Decision', style: {} },
    { relativeId: 'p1', type: 'process', relativePosition: { x: 40, y: 80 }, size: { width: 140, height: 55 }, label: 'Pro 1', style: {} },
    { relativeId: 'p2', type: 'process', relativePosition: { x: 40, y: 160 }, size: { width: 140, height: 55 }, label: 'Pro 2', style: {} },
    { relativeId: 'p3', type: 'process', relativePosition: { x: 40, y: 240 }, size: { width: 140, height: 55 }, label: 'Pro 3', style: {} },
    { relativeId: 'c1', type: 'process', relativePosition: { x: 480, y: 80 }, size: { width: 140, height: 55 }, label: 'Con 1', style: {} },
    { relativeId: 'c2', type: 'process', relativePosition: { x: 480, y: 160 }, size: { width: 140, height: 55 }, label: 'Con 2', style: {} },
    { relativeId: 'c3', type: 'process', relativePosition: { x: 480, y: 240 }, size: { width: 140, height: 55 }, label: 'Con 3', style: {} },
  ], [
    { sourceRelativeId: 'topic', targetRelativeId: 'p1', sourcePort: 'left', targetPort: 'right', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'topic', targetRelativeId: 'p2', sourcePort: 'left', targetPort: 'right', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'topic', targetRelativeId: 'p3', sourcePort: 'left', targetPort: 'right', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'topic', targetRelativeId: 'c1', sourcePort: 'right', targetPort: 'left', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'topic', targetRelativeId: 'c2', sourcePort: 'right', targetPort: 'left', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'topic', targetRelativeId: 'c3', sourcePort: 'right', targetPort: 'left', type: 'curved', label: '', style: {} },
  ]),

  t('tpl-hierarchy', 'Hierarchy Tree', 'Three-level top-down hierarchy', 'mind-map', [
    { relativeId: 'root', type: 'process', relativePosition: { x: 260, y: 40 }, size: { width: 160, height: 60 }, label: 'Root', style: {} },
    { relativeId: 'c1', type: 'process', relativePosition: { x: 100, y: 150 }, size: { width: 130, height: 55 }, label: 'Child 1', style: {} },
    { relativeId: 'c2', type: 'process', relativePosition: { x: 290, y: 150 }, size: { width: 130, height: 55 }, label: 'Child 2', style: {} },
    { relativeId: 'c3', type: 'process', relativePosition: { x: 470, y: 150 }, size: { width: 130, height: 55 }, label: 'Child 3', style: {} },
    { relativeId: 'g1', type: 'text', relativePosition: { x: 50, y: 260 }, size: { width: 110, height: 40 }, label: 'Leaf A', style: {} },
    { relativeId: 'g2', type: 'text', relativePosition: { x: 180, y: 260 }, size: { width: 110, height: 40 }, label: 'Leaf B', style: {} },
    { relativeId: 'g3', type: 'text', relativePosition: { x: 420, y: 260 }, size: { width: 110, height: 40 }, label: 'Leaf C', style: {} },
    { relativeId: 'g4', type: 'text', relativePosition: { x: 550, y: 260 }, size: { width: 110, height: 40 }, label: 'Leaf D', style: {} },
  ], [
    { sourceRelativeId: 'root', targetRelativeId: 'c1', sourcePort: 'bottom', targetPort: 'top', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'root', targetRelativeId: 'c2', sourcePort: 'bottom', targetPort: 'top', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'root', targetRelativeId: 'c3', sourcePort: 'bottom', targetPort: 'top', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'c1', targetRelativeId: 'g1', sourcePort: 'bottom', targetPort: 'top', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'c1', targetRelativeId: 'g2', sourcePort: 'bottom', targetPort: 'top', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'c3', targetRelativeId: 'g3', sourcePort: 'bottom', targetPort: 'top', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'c3', targetRelativeId: 'g4', sourcePort: 'bottom', targetPort: 'top', type: 'curved', label: '', style: {} },
  ]),

  t('tpl-swot', 'SWOT Analysis', 'Strengths, Weaknesses, Opportunities, Threats quadrants', 'mind-map', [
    { relativeId: 'center', type: 'process', relativePosition: { x: 250, y: 190 }, size: { width: 140, height: 60 }, label: 'SWOT', style: {} },
    { relativeId: 's', type: 'process', relativePosition: { x: 80, y: 60 }, size: { width: 160, height: 70 }, label: 'Strengths', style: {} },
    { relativeId: 'w', type: 'process', relativePosition: { x: 400, y: 60 }, size: { width: 160, height: 70 }, label: 'Weaknesses', style: {} },
    { relativeId: 'o', type: 'process', relativePosition: { x: 80, y: 320 }, size: { width: 160, height: 70 }, label: 'Opportunities', style: {} },
    { relativeId: 't', type: 'process', relativePosition: { x: 400, y: 320 }, size: { width: 160, height: 70 }, label: 'Threats', style: {} },
  ], [
    { sourceRelativeId: 'center', targetRelativeId: 's', sourcePort: 'left', targetPort: 'bottom', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'center', targetRelativeId: 'w', sourcePort: 'right', targetPort: 'bottom', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'center', targetRelativeId: 'o', sourcePort: 'left', targetPort: 'top', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'center', targetRelativeId: 't', sourcePort: 'right', targetPort: 'top', type: 'curved', label: '', style: {} },
  ]),

  t('tpl-project-plan', 'Project Plan', 'Project with workstreams and milestones', 'mind-map', [
    { relativeId: 'proj', type: 'process', relativePosition: { x: 40, y: 160 }, size: { width: 160, height: 70 }, label: 'Project', style: {} },
    { relativeId: 'ws1', type: 'process', relativePosition: { x: 260, y: 40 }, size: { width: 150, height: 55 }, label: 'Workstream 1', style: {} },
    { relativeId: 'ws2', type: 'process', relativePosition: { x: 260, y: 130 }, size: { width: 150, height: 55 }, label: 'Workstream 2', style: {} },
    { relativeId: 'ws3', type: 'process', relativePosition: { x: 260, y: 220 }, size: { width: 150, height: 55 }, label: 'Workstream 3', style: {} },
    { relativeId: 'm1', type: 'text', relativePosition: { x: 470, y: 50 }, size: { width: 120, height: 40 }, label: 'Milestone A', style: {} },
    { relativeId: 'm2', type: 'text', relativePosition: { x: 470, y: 140 }, size: { width: 120, height: 40 }, label: 'Milestone B', style: {} },
    { relativeId: 'm3', type: 'text', relativePosition: { x: 470, y: 230 }, size: { width: 120, height: 40 }, label: 'Milestone C', style: {} },
  ], [
    { sourceRelativeId: 'proj', targetRelativeId: 'ws1', sourcePort: 'right', targetPort: 'left', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'proj', targetRelativeId: 'ws2', sourcePort: 'right', targetPort: 'left', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'proj', targetRelativeId: 'ws3', sourcePort: 'right', targetPort: 'left', type: 'curved', label: '', style: {} },
    { sourceRelativeId: 'ws1', targetRelativeId: 'm1', sourcePort: 'right', targetPort: 'left', type: 'straight', label: '', style: {} },
    { sourceRelativeId: 'ws2', targetRelativeId: 'm2', sourcePort: 'right', targetPort: 'left', type: 'straight', label: '', style: {} },
    { sourceRelativeId: 'ws3', targetRelativeId: 'm3', sourcePort: 'right', targetPort: 'left', type: 'straight', label: '', style: {} },
  ]),

  // ═══════════════ PAGE LAYOUT (6) ═══════════════

  t('tpl-dashboard-layout', 'Dashboard Layout', 'Header, sidebar, main content, footer', 'page-layout', [
    { relativeId: 'header', type: 'group', relativePosition: { x: 40, y: 40 }, size: { width: 600, height: 60 }, label: 'Header / Navigation', style: {} },
    { relativeId: 'sidebar', type: 'group', relativePosition: { x: 40, y: 120 }, size: { width: 160, height: 300 }, label: 'Sidebar', style: {} },
    { relativeId: 'main', type: 'group', relativePosition: { x: 220, y: 120 }, size: { width: 420, height: 300 }, label: 'Main Content', style: {} },
    { relativeId: 'footer', type: 'group', relativePosition: { x: 40, y: 440 }, size: { width: 600, height: 50 }, label: 'Footer', style: {} },
  ], []),

  t('tpl-landing-page', 'Landing Page', 'Hero, features, call-to-action, footer', 'page-layout', [
    { relativeId: 'hero', type: 'group', relativePosition: { x: 60, y: 40 }, size: { width: 500, height: 120 }, label: 'Hero Section', style: {} },
    { relativeId: 'f1', type: 'process', relativePosition: { x: 60, y: 190 }, size: { width: 150, height: 80 }, label: 'Feature 1', style: {} },
    { relativeId: 'f2', type: 'process', relativePosition: { x: 235, y: 190 }, size: { width: 150, height: 80 }, label: 'Feature 2', style: {} },
    { relativeId: 'f3', type: 'process', relativePosition: { x: 410, y: 190 }, size: { width: 150, height: 80 }, label: 'Feature 3', style: {} },
    { relativeId: 'cta', type: 'process', relativePosition: { x: 180, y: 310 }, size: { width: 260, height: 60 }, label: 'Call to Action', style: {} },
    { relativeId: 'footer', type: 'group', relativePosition: { x: 60, y: 400 }, size: { width: 500, height: 50 }, label: 'Footer', style: {} },
  ], []),

  t('tpl-blog-layout', 'Blog Layout', 'Header, article area, sidebar, footer', 'page-layout', [
    { relativeId: 'nav', type: 'group', relativePosition: { x: 40, y: 40 }, size: { width: 560, height: 50 }, label: 'Navigation Bar', style: {} },
    { relativeId: 'article', type: 'group', relativePosition: { x: 40, y: 110 }, size: { width: 360, height: 280 }, label: 'Article Content', style: {} },
    { relativeId: 'aside', type: 'group', relativePosition: { x: 420, y: 110 }, size: { width: 180, height: 280 }, label: 'Sidebar / Related', style: {} },
    { relativeId: 'footer', type: 'group', relativePosition: { x: 40, y: 410 }, size: { width: 560, height: 50 }, label: 'Footer', style: {} },
  ], []),

  t('tpl-settings-page', 'Settings Page', 'Tabs, form area, action bar', 'page-layout', [
    { relativeId: 'tabs', type: 'group', relativePosition: { x: 40, y: 40 }, size: { width: 560, height: 50 }, label: 'Tab Navigation', style: {} },
    { relativeId: 'form', type: 'group', relativePosition: { x: 40, y: 110 }, size: { width: 560, height: 250 }, label: 'Settings Form', style: {} },
    { relativeId: 'actions', type: 'group', relativePosition: { x: 40, y: 380 }, size: { width: 560, height: 50 }, label: 'Save / Cancel Actions', style: {} },
  ], []),

  t('tpl-email-template', 'Email Template', 'Header, body, call-to-action, footer', 'page-layout', [
    { relativeId: 'logo', type: 'group', relativePosition: { x: 100, y: 40 }, size: { width: 400, height: 60 }, label: 'Logo / Brand Header', style: {} },
    { relativeId: 'body', type: 'group', relativePosition: { x: 100, y: 120 }, size: { width: 400, height: 180 }, label: 'Email Body', style: {} },
    { relativeId: 'cta', type: 'process', relativePosition: { x: 200, y: 320 }, size: { width: 200, height: 50 }, label: 'CTA Button', style: {} },
    { relativeId: 'footer', type: 'group', relativePosition: { x: 100, y: 390 }, size: { width: 400, height: 50 }, label: 'Unsubscribe / Footer', style: {} },
  ], []),

  t('tpl-mobile-app', 'Mobile App Screen', 'Status bar, header, content, tab bar', 'page-layout', [
    { relativeId: 'status', type: 'group', relativePosition: { x: 120, y: 30 }, size: { width: 320, height: 30 }, label: 'Status Bar', style: {} },
    { relativeId: 'header', type: 'group', relativePosition: { x: 120, y: 70 }, size: { width: 320, height: 50 }, label: 'App Header', style: {} },
    { relativeId: 'content', type: 'group', relativePosition: { x: 120, y: 130 }, size: { width: 320, height: 340 }, label: 'Scrollable Content', style: {} },
    { relativeId: 'tabbar', type: 'group', relativePosition: { x: 120, y: 480 }, size: { width: 320, height: 50 }, label: 'Tab Bar', style: {} },
  ], []),
];

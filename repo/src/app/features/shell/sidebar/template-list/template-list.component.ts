import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Template, TemplateFamily, TEMPLATE_FAMILIES } from '../../../../core/models/template.model';
import { TemplateService } from '../../../../core/services/template.service';
import { CanvasStoreService } from '../../../../core/services/canvas-store.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './template-list.component.html',
  styleUrl: './template-list.component.scss',
})
export class TemplateListComponent implements OnInit {
  readonly templates = signal<Template[]>([]);
  readonly families = TEMPLATE_FAMILIES;
  activeFamily = signal<TemplateFamily | 'all'>('all');

  constructor(
    private templateService: TemplateService,
    private store: CanvasStoreService,
    private auth: AuthService,
  ) {}

  async ngOnInit(): Promise<void> {
    const all = await this.templateService.getAll();
    this.templates.set(all);
  }

  get filtered(): Template[] {
    const fam = this.activeFamily();
    if (fam === 'all') return this.templates();
    return this.templates().filter(t => t.family === fam);
  }

  setFamily(f: TemplateFamily | 'all'): void {
    this.activeFamily.set(f);
  }

  async instantiate(template: Template): Promise<void> {
    const profile = this.auth.profile();
    if (!profile) return;
    await this.store.createCanvasFromTemplate(template, profile.id);
  }
}

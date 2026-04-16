import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CanvasStoreService } from '../../../core/services/canvas-store.service';
import { CanvasListComponent } from './canvas-list/canvas-list.component';
import { TemplateListComponent } from './template-list/template-list.component';
import { VersionTimelineComponent } from './version-timeline/version-timeline.component';
import { NotificationCenterComponent } from '../notification-center/notification-center.component';

interface SidebarItem {
  icon: string;
  label: string;
  id: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, CanvasListComponent, TemplateListComponent, VersionTimelineComponent, NotificationCenterComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Output() openImport = new EventEmitter<void>();

  activeItem = 'canvases';

  readonly navItems: SidebarItem[] = [
    { icon: 'grid', label: 'Canvases', id: 'canvases' },
    { icon: 'layout', label: 'Templates', id: 'templates' },
    { icon: 'upload', label: 'Imports', id: 'imports' },
    { icon: 'clock', label: 'Versions', id: 'versions' },
    { icon: 'bell', label: 'Notifications', id: 'notifications' },
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    protected store: CanvasStoreService,
  ) {}

  setActive(id: string): void {
    this.activeItem = id;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

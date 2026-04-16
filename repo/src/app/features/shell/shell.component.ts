import { Component, OnInit, OnDestroy, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { CanvasStoreService } from '../../core/services/canvas-store.service';
import { TemplateService } from '../../core/services/template.service';
import { AutosaveService } from '../../core/services/autosave.service';
import { VersionService } from '../../core/services/version.service';
import { NotificationService } from '../../core/services/notification.service';
import { MultiTabService } from '../../core/services/multi-tab.service';
import { SidebarComponent } from './sidebar/sidebar.component';
import { CanvasWorkspaceComponent } from './canvas-workspace/canvas-workspace.component';
import { RightDrawerComponent } from './right-drawer/right-drawer.component';
import { HistoryPanelComponent } from './history-panel/history-panel.component';
import { ImportWizardComponent } from './import-wizard/import-wizard.component';
import { PublishPanelComponent } from './publish-panel/publish-panel.component';
import { NotificationCenterComponent } from './notification-center/notification-center.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    CanvasWorkspaceComponent,
    RightDrawerComponent,
    HistoryPanelComponent,
    ImportWizardComponent,
    PublishPanelComponent,
    NotificationCenterComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  rightDrawerOpen = signal(false);
  historyPanelOpen = signal(false);
  publishPanelOpen = signal(false);
  importWizardOpen = signal(false);

  constructor(
    protected auth: AuthService,
    private session: SessionService,
    protected store: CanvasStoreService,
    private templateService: TemplateService,
    private autosave: AutosaveService,
    private versionService: VersionService,
    protected notifSvc: NotificationService,
    protected multiTab: MultiTabService,
  ) {
    effect(() => {
      if (this.store.selectedNodeId() || this.store.selectedEdgeId()) {
        this.rightDrawerOpen.set(true);
      }
    });

    effect(() => {
      const canvas = this.store.currentCanvas();
      if (canvas) {
        this.versionService.loadVersions(canvas.id);
        this.autosave.start();
      } else {
        this.autosave.stop();
        this.versionService.clearVersions();
      }
    });
  }

  ngOnInit(): void {
    this.session.startTracking();
    this.templateService.seedBuiltInTemplates();
    this.multiTab.start();
  }

  ngOnDestroy(): void {
    this.session.stopTracking();
    this.autosave.stop();
    this.multiTab.stop();
  }

  toggleRightDrawer(): void { this.rightDrawerOpen.update(v => !v); }
  toggleHistoryPanel(): void { this.historyPanelOpen.update(v => !v); }
  togglePublishPanel(): void { this.publishPanelOpen.update(v => !v); }
  openImportWizard(): void { this.importWizardOpen.set(true); }
  closeImportWizard(): void { this.importWizardOpen.set(false); }
}

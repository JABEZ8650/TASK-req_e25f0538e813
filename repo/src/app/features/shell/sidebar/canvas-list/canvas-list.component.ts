import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasStoreService } from '../../../../core/services/canvas-store.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Canvas } from '../../../../core/models/canvas.model';

@Component({
  selector: 'app-canvas-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './canvas-list.component.html',
  styleUrl: './canvas-list.component.scss',
})
export class CanvasListComponent implements OnInit {
  creating = false;
  newCanvasName = '';

  constructor(
    protected store: CanvasStoreService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    const profile = this.auth.profile();
    if (profile) {
      this.store.loadCanvasList(profile.id);
    }
  }

  startCreate(): void {
    this.creating = true;
    this.newCanvasName = '';
  }

  cancelCreate(): void {
    this.creating = false;
    this.newCanvasName = '';
  }

  async finishCreate(): Promise<void> {
    const name = this.newCanvasName.trim();
    if (!name) return;
    const profile = this.auth.profile();
    if (!profile) return;

    await this.store.createCanvas(name, profile.id);
    this.creating = false;
    this.newCanvasName = '';
  }

  async openCanvas(canvas: Canvas): Promise<void> {
    await this.store.openCanvas(canvas.id);
  }

  isActive(canvas: Canvas): boolean {
    return this.store.currentCanvas()?.id === canvas.id;
  }
}

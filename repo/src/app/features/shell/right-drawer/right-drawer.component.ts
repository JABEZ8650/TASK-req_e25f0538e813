import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasStoreService } from '../../../core/services/canvas-store.service';
import { NodePropertiesComponent } from './node-properties/node-properties.component';
import { EdgePropertiesComponent } from './edge-properties/edge-properties.component';

@Component({
  selector: 'app-right-drawer',
  standalone: true,
  imports: [CommonModule, NodePropertiesComponent, EdgePropertiesComponent],
  templateUrl: './right-drawer.component.html',
  styleUrl: './right-drawer.component.scss',
})
export class RightDrawerComponent {
  constructor(protected store: CanvasStoreService) {}
}

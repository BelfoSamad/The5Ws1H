import {Component, ElementRef, inject, Input, OnChanges, Renderer2, SimpleChanges, ViewChild} from '@angular/core';
import {Article} from '../utils/types';
import {MatCardModule} from '@angular/material/card';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatFormFieldModule} from '@angular/material/form-field';
import {ReactiveFormsModule} from '@angular/forms';
import {SummarizerService} from '../services/summarizer.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatInputModule} from '@angular/material/input';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
  ],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.scss'
})
export class SummaryComponent implements OnChanges {
  private _snackBar = inject(MatSnackBar);

  //Inputs
  @Input() isLoading: Boolean = false;
  @Input() isHome: Boolean = true;
  @Input() article: Article | null = null;

  //Data
  summaries: any[] = [];
  currentIndex = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.article != null) {
      this.summaries = Object.entries(this.article!.summary).map(([key, value]) => {
        if (value.length > 0) return {
          question: key.toUpperCase(),
          answer: value
        }; else return null;
      }).filter(item => item !== null);
    }
  }

  goToPrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  goToNext() {
    if (this.currentIndex <= this.summaries.length) {
      this.currentIndex++;
    }
  }

  isArray(element: any) {
    return Array.isArray(element)
  }

  onAnswerClick(answer: string) {
    //TODO: Use clicked answer properly
  }
}
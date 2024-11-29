import {Component, ElementRef, inject, Input, OnChanges, Renderer2, SimpleChanges, ViewChild} from '@angular/core';
import {Article, Summary} from '../utils/types';
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
import {WikipediaService} from '../services/wikipedia.service';
import {DetailsDialog} from './details/details-dialog';
import {MatDialog} from '@angular/material/dialog';

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
  @Input() article: Article | undefined | null;

  //Data
  summaries: any[] = [];
  currentIndex = 0;
  summarized = false;

  //Dialog
  readonly dialog = inject(MatDialog);

  constructor(private wikipediaService: WikipediaService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.article != null) this.prepareList(this.article!.summary)
  }

  prepareList(summary: Summary) {
    this.summaries = Object.entries(summary).map(([key, value]) => {
      if (value?.length ?? 0 > 0) return {
        question: key.toUpperCase(),
        answer: value
      }; else return null;
    }).filter(item => item !== null);
  }

  goToPrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  goToNext() {
    if (this.currentIndex < this.summaries.length - 1) {
      this.currentIndex++;
    }
  }

  isArray(element: any) {
    return Array.isArray(element)
  }

  onAnswerClick(answer: string) {
    // setup dialog
    const dialogRef = this.dialog.open(DetailsDialog);
    dialogRef.componentInstance.updateData({
      isLoading: true,
      answer: answer
    });

    // search answer
    this.wikipediaService.search(answer).subscribe({
      next: (response) => {
        dialogRef.componentInstance.updateData({
          isLoading: false,
          answer: answer,
          definition: response.extract,
          imageUrl: response.thumbnail?.source || ''
        });
      },
      error: (error) => {
        dialogRef.componentInstance.updateData({
          isLoading: false,
          answer: answer,
          error: error
        });
      },
    });
  }

  switchLanguage() {
    if (this.summarized) this.prepareList(this.article!.translation!);
    else this.prepareList(this.article!.summary!);

    // switch
    this.summarized = !this.summarized;
  }
}
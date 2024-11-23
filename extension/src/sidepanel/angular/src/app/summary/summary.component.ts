import {Component, ElementRef, EventEmitter, inject, Input, OnChanges, Output, Renderer2, SimpleChanges, ViewChild} from '@angular/core';
import {Article, Expansion} from '../utils/types';
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
  @Output() closedEvent = new EventEmitter<void>();

  //Views
  @ViewChild('conversation') private conversation!: ElementRef;

  //Inputs
  @Input() isLoading: Boolean = false;
  @Input() isHome: Boolean = true;
  @Input() article: Article | undefined;

  //Data
  summaries: [string, string][] = [];
  expansion: Expansion[] = [];
  currentIndex = 0;
  isIndexed = false;
  queryError = false;
  queryLoading = false;
  indexLoading = false;

  constructor(private summarizerService: SummarizerService, private renderer: Renderer2) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.article != null) {
      this.summaries = Object.entries(this.article!.summary).filter(item => item[1].trim() !== '');
      this.expansion = this.article!.expansion ?? []
      this.isIndexed = this.article!.indexed
    }
  }

  indexArticle() {
    this.indexLoading = true
    this.summarizerService.indexArticle(this.article?.articleId!).then(_ => {
      this.isIndexed = true
      this.indexLoading = false
    }).catch(err => {
      this._snackBar.open(err)
      this.indexLoading = false
    });;
  }

  askQuestion(query: HTMLInputElement) {
    this.queryError = false;
    if (query.value === "") this.queryError = true;
    else {
      this.queryLoading = true
      let question = query.value
      query.value = ""
      this.summarizerService.askQuestion(this.article?.articleId!!, question).then(answer => {
        if (this.expansion == undefined) this.expansion = [{question: question, answer: answer}]
        else this.expansion.push({question: question, answer: answer})
        this.queryLoading = false
        this.scrollToBottom();
      }).catch(err => {
        this._snackBar.open(err)
        this.queryLoading = false
      });
    }
  }

  scrollToBottom() {
    const div = this.conversation.nativeElement;
    div.scrollTop = div.scrollHeight;
  }

  goToPrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  goToNext() {
    if (this.currentIndex < this.summaries.length) {
      this.currentIndex++;
      if (this.currentIndex == this.summaries.length) setTimeout(() => {this.scrollToBottom();}, 1)
    }
  }

  closeSummary() {
    this.closedEvent.emit()
  }
}
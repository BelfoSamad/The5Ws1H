import {Component, inject, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {SummarizerService} from '../services/summarizer.service';
import {AuthService} from '../services/auth.service';
import {Article} from '../utils/types';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {CommonModule} from '@angular/common';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from '@angular/material/card';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit {
  private _snackBar = inject(MatSnackBar);
  monthNames: string[] = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
  ];

  //Data
  loading = true
  empty = false
  sortedKeys: string[] = []
  groupedArticles: {[key: string]: Article[]} = {};

  constructor(private router: Router, private summarizerService: SummarizerService, private authService: AuthService) { }

  ngOnInit(): void {
    this.summarizerService.getHistory().then(result => {
      this.loading = false;
      // group data
      this.groupedArticles = this.groupByDate(result.articles ?? []);
      this.empty = JSON.stringify(this.groupedArticles) === '{}'
      if (!this.empty) this.sortedKeys = Object.keys(this.groupedArticles).sort((a, b) => b.localeCompare(a));
    }).catch(err => {
      this._snackBar.open(err)
    });
  }

  groupByDate(items: Article[]): {[key: string]: Article[]} {
    return items.reduce((groups: any, item) => {
      const date = this.formatDate(new Date(item.createdAt));
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    }, {});
  }

  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0'); // Ensure two digits
    const month = this.monthNames[date.getMonth()]; // Months are 0-based
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  goArticle(article: Article) {
    this.router.navigateByUrl('/article', {state: {data: article}});
  }

  goBack() {
    this.router.navigate(['']);
  }
}
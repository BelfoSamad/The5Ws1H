import {Component, inject, OnInit, ViewChild} from '@angular/core';
import {AuthService} from '../services/auth.service';
import {SummarizerService} from '../services/summarizer.service';
import {Article} from '../utils/types';
import {MatSnackBar} from '@angular/material/snack-bar';
import {SummaryComponent} from '../summary/summary.component';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    SummaryComponent,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private _snackBar = inject(MatSnackBar);

  //Views
  @ViewChild('summary') summaryComponent!: SummaryComponent;

  //Dialog
  readonly dialog = inject(MatDialog);

  //Data
  credit: number = 0;
  url: string | undefined;
  article: Article | undefined;
  summarizeLoading: boolean | null = null;

  constructor(private router: Router, private summarizerService: SummarizerService, private authService: AuthService) { }
  
  ngOnInit(): void {
    //TODO: Get URL from chrome
  }

  summarizeArticle() {
    this.summarizeLoading = true
    this.summarizerService.getArticleViaUrl(this.url!).then(article => {
      if (article != null) {
        this.article = article
        this.summarizeLoading = false
      } else {
        this.summarizerService.summarizeArticle(this.url!).then(article => {
          if (article != null) {
            this.article = article
            this.summarizeLoading = false
          } else this.summarizeLoading = null
        }).catch(err => {
          this.summarizeLoading = null
          this._snackBar.open(err)
        });
      }
    }).catch(err => {
      this.summarizeLoading = null
      this._snackBar.open(err)
    });
  }

  summaryClosed() {
    this.summarizeLoading = null;
  }

  goHistory() {
    this.router.navigate(['history']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['login']);
  }

}

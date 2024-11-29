///<reference types="chrome"/>
import {Component, inject, NgZone, OnInit, ViewChild} from '@angular/core';
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
  url: string | undefined | null;
  title: string | undefined | null;
  article: Article | undefined | null;
  summarizeLoading = false;

  constructor(private router: Router, private zone: NgZone, private summarizerService: SummarizerService, private authService: AuthService) {
    chrome.runtime.sendMessage({target: "background", action: "init"});
  }

  async ngOnInit(): Promise<void> {
    // listen to messages
    this.summarizerService.listenToSummarization().subscribe((message: any) => {
      this.zone.run(() => {
        if (message.target == "sidepanel") switch (message.action) {
          case "tab":
            // set basic details
            const tabDetails = message.tab;
            this.summarizeLoading = tabDetails?.isLoading ?? false;
            this.url = tabDetails?.url;
            this.title = tabDetails?.title;
            this.article = tabDetails?.article; // get article (either object or null)
            if (this.article != null) this.summarizerService.saveArticleIdLocally(tabDetails.article.articleId)
            break;
          case "error":
            this.summarizeLoading = false;
            // logout if AUTH error or show the error message
            if (message.error == "ERROR::AUTH") {
              this._snackBar.open("You have been Logged out, Re-Login again!");
              setTimeout(() => {this.logout();}, 2000);
            } else if (message.error != null) this._snackBar.open(message.error);
            break;
        }
      });
    });
  }

  summarizeArticle() {
    if (this.url != undefined) this.summarizerService.summarizeArticle(this.url);
    else this._snackBar.open("No Article URL found! Reload page to get URL!");
  }

  goHistory() {
    this.router.navigate(['history']);
  }

  goSettings() {
    this.router.navigate(['settings']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['login']);
  }

}

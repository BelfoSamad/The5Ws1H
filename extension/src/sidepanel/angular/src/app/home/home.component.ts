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
  article: Article | null = null;
  summarizeLoading: Boolean | undefined;

  constructor(private router: Router, private zone: NgZone, private summarizerService: SummarizerService, private authService: AuthService) {
    chrome.runtime.sendMessage({target: "background", action: "init"});
  }

  async ngOnInit(): Promise<void> {
    // listen to messages
    this.summarizerService.listenToSummarization().subscribe((message: any) => {
      this.zone.run(() => {
        if (message.target == "sidepanel") switch (message.action) {
          case "start_animation":
            this.article = null;
            this.summarizeLoading = true;
            break;
          case "tab":
            // set basic details
            const tabDetails = message.tab;
            if (tabDetails != null) {
              this.url = tabDetails.url;
              this.title = tabDetails.title;

              // article done analzying
              if (tabDetails.article !== undefined) {
                this.summarizeLoading = false; // stop animation
                this.article = tabDetails.article; // get article (either object or null)

                // logout if AUTH error or show the error message
                if (tabDetails.error == "ERROR::AUTH") this.logout();
                else if (tabDetails.error != null) this._snackBar.open(tabDetails.error);
              }
            } else {
              this.url = undefined;
              this.title = undefined;
            }
            break;
        }
      });
    });
  }

  summarizeArticle() {
    if (this.url != undefined) this.summarizerService.summarizeArticle(this.url);
    else this._snackBar.open("No Article URL found! Reload page to get URL!");
  }

  summaryClosed() {
    this.summarizeLoading = undefined;
  }

  goHistory() {
    this.router.navigate(['history']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['login']);
  }

}

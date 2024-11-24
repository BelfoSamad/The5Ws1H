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
  url: string | undefined;
  article: Article | undefined;
  summarizeLoading: boolean | null = null;

  constructor(private router: Router, private zone: NgZone, private summarizerService: SummarizerService, private authService: AuthService) {
    chrome.runtime.sendMessage({target: "background", action: "init"});
  }

  async ngOnInit(): Promise<void> {
    // listen to messages
    this.summarizerService.listenToSummarization().subscribe((message: any) => {
      this.zone.run(() => {
        if (message.target == "sidepanel") switch (message.action) {
          case "url":
            this.url = message.url;
            break;
          case "start_animation":
            this.summarizeLoading = true;
            break;
          case "result":
            if (message.result.error != null) {
              if (message.error == "ERROR::AUTH") this.logout();
              else {
                this.summarizeLoading = null;
                this._snackBar.open(message.error);
              }
            } else {
              if (message.result.article == null) this.summarizeLoading = null;
              else {
                this.article = message.result.article;
                this.summarizeLoading = false;
              }
            }
            break;
        }
      });
    });
  }

  summarizeArticle() {
    this.summarizerService.summarizeArticle();
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

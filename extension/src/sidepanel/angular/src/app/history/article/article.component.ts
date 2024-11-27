import {Component, ViewChild} from '@angular/core';
import {SummaryComponent} from '../../summary/summary.component';
import {Article} from '../../utils/types';
import {MatToolbarModule} from '@angular/material/toolbar';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {Router} from '@angular/router';

@Component({
  selector: 'app-article',
  standalone: true,
  imports: [
    SummaryComponent,
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './article.component.html',
  styleUrl: './article.component.scss'
})
export class ArticleComponent {
  //Views
  @ViewChild('summary') summaryComponent!: SummaryComponent;

  //Data
  summarizeLoading = true;
  article: Article | null = null;

  constructor(private router: Router) { }

  ngOnInit() {
    this.article = history.state.data;
    this.summarizeLoading = false;
  }

  goBack() {
    this.router.navigate(['history']);
  }
}

import {Injectable} from '@angular/core';
import {Article} from '../utils/types';

@Injectable({
  providedIn: 'root'
})
export class SummarizerService {

  async indexArticle(articleId: string) {
  }

  async askQuestion(articleId: string, question: string): Promise<string> {
    return new Promise((resolve) => {
    });
  }

  async getArticleViaUrl(url: string): Promise<Article> {
    return new Promise((resolve) => {
    });
  }

  async summarizeArticle(url: string): Promise<Article> {
    return new Promise((resolve) => {
    });
  }

}

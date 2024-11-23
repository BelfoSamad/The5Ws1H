import { Injectable } from '@angular/core';

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
}

///<reference types="chrome"/>
import {Injectable} from '@angular/core';
import {Article} from '../utils/types';
import {fromEventPattern, map} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SummarizerService {

  listenToSummarization() {
    return fromEventPattern(
      (handler) => chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => handler(message)),
      (handler) => chrome.runtime.onMessage.removeListener(handler),
    );
  }

  summarizeArticle(url: string) {
    chrome.runtime.sendMessage({target: "background", action: "summarize", url: url});
  }

  async indexArticle(articleId: string) {
    return chrome.runtime.sendMessage({target: "offscreen", action: "index", articleId: articleId});
  }

  async askQuestion(articleId: string, question: string): Promise<string> {
    return chrome.runtime.sendMessage({target: "offscreen", action: "expand", articleId: articleId, query: question});
  }

  async getHistory() {
    return chrome.runtime.sendMessage({target: "offscreen", action: "history"});
  }

}

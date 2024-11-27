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

  async indexArticle(articleId: string): Promise<any> {
    return chrome.runtime.sendMessage({target: "offscreen", action: "index", articleId: articleId});
  }

  async askQuestion(articleId: string, question: string): Promise<any> {
    return chrome.runtime.sendMessage({target: "offscreen", action: "expand", articleId: articleId, query: question});
  }

  async getHistory() {
    const prefs = await chrome.storage.local.get(["articleIds"]);
    return chrome.runtime.sendMessage({target: "offscreen", action: "history", articleIds: prefs["articleIds"]});
  }

  async saveArticleIdLocally(articleId: string) {
    const articleIds = (await chrome.storage.local.get(["articleIds"]))["articleIds"];
    console.log(articleIds);
    if (!articleIds.includes(articleIds)) articleIds.push(articleId);
    console.log(articleIds);
    await chrome.storage.local.set({articleIds: articleIds});
  }

}

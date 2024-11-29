///<reference types="chrome"/>
import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  constructor() { }

  async isSummarizerAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({target: "offscreen", action: "summarizer_available"}, (response) => {
        resolve(response.available);
      });
    });
  }

  async isTranslatorAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({target: "offscreen", action: "translator_available"}, (response) => {
        resolve(response.available);
      });
    });
  }

  getSettings() {
    return chrome.storage.local.get(["targetLanguage", "summaryType", "summaryLength"]);
  }

  async saveSettings(settings: any) {
    chrome.storage.local.set(settings);
  }
}

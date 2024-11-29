import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatToolbarModule} from '@angular/material/toolbar';
import {Router} from '@angular/router';
import {InDeviceAiService} from '../services/in-device-ai.service';
import {AuthService} from '../services/auth.service';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    FormsModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {

  isTranslatorAvailable: boolean = false;
  isSummarizerAvailable: boolean = false;
  language: string | undefined;
  type: string | undefined;
  length: string | undefined;
  supportedLanguages = [
    {name: "Mandarin Chinese", code: "zh"},
    {name: "Japanese", code: "ja"},
    {name: "Portuguese", code: "pt"},
    {name: "Russian", code: "ru"},
    {name: "Spanish", code: "es"},
    {name: "Turkish", code: "tr"},
    {name: "Hindi", code: "hi"},
    {name: "Vietnamese", code: "vi"},
    {name: "Bengali", code: "bn"}
  ]

  constructor(private router: Router, private inDeviceAiService: InDeviceAiService, private authService: AuthService) {
    this.inDeviceAiService.isSummarizerAvailable().then(available => {this.isSummarizerAvailable = available});
    this.inDeviceAiService.isTranslatorAvailable().then(available => {this.isTranslatorAvailable = available});
  }

  ngOnInit(): void {
    this.inDeviceAiService.getSettings().then(settings => {
      this.language = settings["targetLanguage"];
      this.type = settings["summaryType"];
      this.length = settings["summaryLength"];
    });
  }

  onLanguageChanged(event: any) {
    this.inDeviceAiService.saveSettings({targetLanguage: event.value});
  }

  onTypeChanged(event: any) {
    this.inDeviceAiService.saveSettings({summaryType: event.value});
  }

  onLengthChanged(event: any) {
    this.inDeviceAiService.saveSettings({summaryLength: event.value});
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['login']);
  }

}

import {Component, OnInit} from '@angular/core';
import {Router, RouterOutlet} from '@angular/router';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = '5Ws1H';

  constructor(private router: Router) { }

  async ngOnInit(): Promise<void> {
    // Handle Boarding
    chrome.storage.local.get(["boardingCompleted"], (res) => {
      console.log(res['boardingCompleted']);
      if (res['boardingCompleted'] === true) this.router.navigate(['']);
      else this.router.navigate(['/boarding']);
    });
  }

}

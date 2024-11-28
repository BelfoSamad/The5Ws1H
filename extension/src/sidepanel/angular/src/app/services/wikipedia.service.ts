import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WikipediaService {

  private apiUrl = 'https://en.wikipedia.org/api/rest_v1/page/summary';

  constructor(private http: HttpClient) { }

  search(keyword: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${encodeURIComponent(keyword)}`);
  }

}

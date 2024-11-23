import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  async register(email: string, password: string) {
    return new Promise((resolve) => {
    });
  }

  async login(email: string, password: string) {
    return new Promise((resolve) => {
    });
  }

  async logout() {}

}

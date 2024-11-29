import {CommonModule} from '@angular/common';
import {Component, inject, OnInit} from '@angular/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {Router, RouterLink} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '../../services/auth.service';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    RouterLink,
    MatIconModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private _snackBar = inject(MatSnackBar);

  //Declarations
  loginForm: FormGroup | undefined;
  loginLoading = false;
  hidePassword = true;

  constructor(private router: Router, private fb: FormBuilder, private authService: AuthService) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm!!.valid) {
      this.loginLoading = true
      this.authService.login(
        this.loginForm!!.value.email,
        this.loginForm!!.value.password
      ).then((response: any) => {
        this.loginLoading = false
        if (response.done) {
          this.authService.saveArticleIds(response.articleIds);
          this.router.navigate(['/home']); //go home
        } else this._snackBar.open(response.error);
      });
    } else {
      this.loginForm!!.markAllAsTouched(); // Highlight validation errors
    }
  }
  
  togglePasswordVisibility(event: MouseEvent): void {
    event.preventDefault(); // Prevent form submission
    this.hidePassword = !this.hidePassword;
    this.loginForm!!.markAsPristine();
  }
}

import {Routes} from '@angular/router';
import {HomeComponent} from './home/home.component';
import {LoginComponent} from './auth/login/login.component';
import {RegisterComponent} from './auth/register/register.component';
import {HistoryComponent} from './history/history.component';
import {ArticleComponent} from './history/article/article.component';
import {AuthGuard} from './services/auth.guard';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        title: 'Home',
        canActivate: [AuthGuard]
    },
    {
        path: 'login',
        component: LoginComponent,
        title: 'Login'
    },
    {
        path: 'register',
        component: RegisterComponent,
        title: 'Register'
    },
    {
        path: 'history',
        component: HistoryComponent,
        title: 'History',
        canActivate: [AuthGuard]
    },
    {
        path: 'article',
        component: ArticleComponent,
        title: 'Article',
        canActivate: [AuthGuard]
    }
];


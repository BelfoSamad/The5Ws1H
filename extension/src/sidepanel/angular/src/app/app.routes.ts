import {Routes} from '@angular/router';
import {HomeComponent} from './home/home.component';
import {LoginComponent} from './auth/login/login.component';
import {RegisterComponent} from './auth/register/register.component';
import {HistoryComponent} from './history/history.component';
import {ArticleComponent} from './history/article/article.component';
import {AuthGuard} from './services/auth.guard';
import {BoardingComponent} from './boarding/boarding.component';
import {SettingsComponent} from './settings/settings.component';

export const routes: Routes = [
    {
        path: '',
        component: BoardingComponent,
        title: 'Boarding'
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
        path: 'home',
        component: HomeComponent,
        title: 'Home',
        canActivate: [AuthGuard]
    },
    {
        path: 'settings',
        component: SettingsComponent,
        title: 'Settings',
        canActivate: [AuthGuard]
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


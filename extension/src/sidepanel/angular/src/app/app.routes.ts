import {Routes} from '@angular/router';
import {HomeComponent} from './home/home.component';
import {LoginComponent} from './auth/login/login.component';
import {RegisterComponent} from './auth/register/register.component';
import {HistoryComponent} from './history/history.component';
import {ArticleComponent} from './history/article/article.component';
import {AuthGuard} from './services/auth.guard';
import {BoardingComponent} from './boarding/boarding.component';

export const routes: Routes = [
    {
        path: 'boarding',
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
        path: '',
        component: HomeComponent,
        title: 'Home',
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


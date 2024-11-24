import {initializeApp} from 'firebase/app';
import {firebaseConfig} from './firebase_configs';

const app = initializeApp(firebaseConfig);
export {app}
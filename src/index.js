import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';

// CSS IMPORT
import './assets/main.css'

// APP JS IMPORT
import App from './App';

// SERVICE WORKER
import * as serviceWorker from './serviceWorker';

ReactDOM.hydrate(<BrowserRouter><App /></BrowserRouter>, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.register();

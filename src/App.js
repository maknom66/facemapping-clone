import React from 'react';
import ReactDOM from 'react-dom';
import {
    StaticRouter as Router,
    Switch,
    Route
} from "react-router-dom";
import Fire from "./Fire";

// SCREENS
import Home from './screens/Home/Home'
export default props => {
    return (
        <div>
            <Switch>
                <Route path="/index" component={Home} />
                <Route path="/" component={Home} />
            </Switch>
        </div>
    )
}
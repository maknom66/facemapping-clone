import React from 'react';
import ReactDOM from 'react-dom';
import {
    StaticRouter as Router,
    Switch,
    Route
} from "react-router-dom";

// SCREENS
import Home from './Components/Home/Home'

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
import React from 'react';
import ReactDOM from 'react-dom';

import App from './components/app.jsx';

if (module.hot) {
    module.hot.accept();
}

ReactDOM.render(<App />, document.getElementById('app'));
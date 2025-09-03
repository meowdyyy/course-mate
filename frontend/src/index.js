// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import './index.css';
// import App from './App';
// import { AuthProvider } from './context/AuthContext';
// import { Toaster } from 'react-hot-toast';
// import axios from 'axios';

// //Set default axios baseURL
// axios.defaults.baseURL = 'http://localhost:5000';

// const root = ReactDOM.createRoot(document.getElementById('root'));
// root.render(
//   <React.StrictMode>
//     <AuthProvider>
//       <App />
//       <Toaster 
//         position="top-right"
//         toastOptions={{
//           duration: 4000,
//           style: {
//             background: '#363636',
//             color: '#fff',
//           },
//         }}
//       />
//     </AuthProvider>
//   </React.StrictMode>
// );
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';

// Dynamic API base (fallback to localhost for local dev)
const API_BASE = process.env.REACT_APP_API_URL || (window.__API_BASE__ || 'http://localhost:5000');
axios.defaults.baseURL = API_BASE;


class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={ hasError:false, error:null }; }
  static getDerivedStateFromError(error){ return { hasError:true, error }; }
  componentDidCatch(error, info){ console.error('App crash:', error, info); }
  render(){
    if (this.state.hasError) {
      return <div style={{padding:'2rem',fontFamily:'sans-serif'}}>
        <h1 style={{fontSize:'1.25rem'}}>Something went wrong.</h1>
        <p style={{color:'#666', marginTop:'0.5rem'}}>Reload the page or check browser console for details.</p>
      </div>;
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#363636', color: '#fff' }
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

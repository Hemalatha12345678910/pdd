import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

export default function Layout({ children }) {
  const [globalSearch, setGlobalSearch] = useState('');

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <Header globalSearch={globalSearch} setGlobalSearch={setGlobalSearch} />
        <div className="page-content">
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { globalSearch });
            }
            return child;
          })}
        </div>
      </main>
    </div>
  );
}

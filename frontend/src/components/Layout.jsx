import { Outlet } from 'react-router-dom';
import { useResponsive } from '../hooks/useResponsive';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = () => {
  const { isMobile } = useResponsive();

  return (
    <div className="app-container">
      {/* Sidebar for PC */}
      {!isMobile && <Sidebar />}

      <div className="main-content">
        <Header />
        
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

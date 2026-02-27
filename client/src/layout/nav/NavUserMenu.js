import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from 'contexts/AuthContext';
import { Link } from 'react-router-dom';

const NavUserMenu = () => {
  const { isLogin } = useSelector((state) => state.auth);
  const { user } = useAuth();

  if (!isLogin || !user) {
    return <></>;
  }

  return (
    <Link to="/profile" className="user-container d-flex">
      <div
        className="sw-5 sh-5 rounded-xl d-flex justify-content-center align-items-center mx-auto"
        style={{
          backgroundColor: '#e3f2fd',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#1976d2',
        }}
      >
        {user?.name.charAt(0).toUpperCase()}
      </div>
    </Link>
  );
};

export default React.memo(NavUserMenu);

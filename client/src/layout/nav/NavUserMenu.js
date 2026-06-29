import React from 'react';
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
      <div className="d-flex user position-relative">
        <div
          className="profile d-flex justify-content-center align-items-center rounded-circle"
          style={{
            backgroundColor: '#ffffff',
            color: '#23b3f4',
            fontWeight: 'bold',
            fontSize: '1.25rem',
          }}
        >
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="name">{user?.name || 'User'}</div>
      </div>
    </Link>
  );
};

export default React.memo(NavUserMenu);

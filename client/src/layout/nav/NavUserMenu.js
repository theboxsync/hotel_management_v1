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
    <Link to="/settings/profile" className="user-container d-flex">
      <div className="d-flex user position-relative">
        {/* <img className="profile" alt={user?.hotel_name || 'Restaurant'} src={process.env.REACT_APP_UPLOAD_DIR + user?.logo} /> */}
        <div className="name">{user?.hotel_name || 'Restaurant'}</div>
        {user?.logo ? (
          <img className="profile" alt={user?.hotel_name || 'Restaurant'} src={process.env.REACT_APP_UPLOAD_DIR + user?.logo} />
        ) : (
          <div
            style={{
              backgroundColor: 'lightgray',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              color: 'black',
            }}
          >
            {user?.hotel_name[0]}{' '}
          </div>
        )}
      </div>
    </Link>
  );
};

export default React.memo(NavUserMenu);

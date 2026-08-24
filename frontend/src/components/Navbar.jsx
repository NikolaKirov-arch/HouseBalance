import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar navbar-dark bg-primary shadow-sm">
      <div className="container d-flex flex-wrap gap-2">
        <NavLink className="navbar-brand fw-bold" to={user ? '/groups' : '/login'}>
          HouseBalance
        </NavLink>

        {user ? (
          <div className="d-flex align-items-center gap-3 ms-auto text-white">
            <NavLink className="nav-link text-white" to="/groups">My Groups</NavLink>
            <NavLink className="nav-link text-white" to="/groups/create">Create Group</NavLink>
            <span className="small d-none d-md-inline">
              {user.first_name} {user.last_name}
            </span>
            <button className="btn btn-outline-light btn-sm" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="d-flex gap-3 ms-auto">
            <NavLink className="nav-link text-white" to="/login">Login</NavLink>
            <NavLink className="nav-link text-white" to="/register">Register</NavLink>
          </div>
        )}
      </div>
    </nav>
  );
}


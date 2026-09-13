import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * MENU COMPONENT — Fixed
 *
 * BUG FIXED: Was using plain <p> tags. Clicking did nothing.
 * NOW: Uses <NavLink> from react-router-dom.
 *
 * NavLink vs Link:
 * - Link: basic navigation, no active state awareness
 * - NavLink: adds an "active" class when the current URL matches `to`
 *   We use this to visually highlight which section the user is on.
 *
 * The className prop accepts a function in React Router v6:
 *   className={({ isActive }) => isActive ? 'active-class' : 'normal-class'}
 * This is how you conditionally apply active styling.
 */
const menuItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Orders', path: '/orders' },
  { label: 'Holdings', path: '/holdings' },
  { label: 'Positions', path: '/positions' },
  { label: 'Funds', path: '/funds' },
];

const Menu = () => {
  return (
    <nav className="dashboard-menu" aria-label="Dashboard navigation">
      <ul className="list-unstyled d-flex gap-3 mb-0">
        {menuItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `nav-menu-link text-decoration-none px-2 py-1 ${
                  isActive
                    ? 'text-primary fw-semibold border-bottom border-primary border-2'
                    : 'text-secondary'
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Menu;

import React from "react";
import { Redirect, Route, RouteProps } from "react-router-dom";
import { isAuthenticated } from "../data/auth/sessionAuth";

type PrivateRouteProps = RouteProps & {
  children: React.ReactNode;
};

/**
 * Blocks unauthenticated access to app screens.
 * Public routes (login, redirect) should stay outside this wrapper.
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  ...rest
}) => {
  return (
    <Route
      {...rest}
      render={({ location }) =>
        isAuthenticated() ? (
          <>{children}</>
        ) : (
          <Redirect
            to={{
              pathname: "/login",
              state: { from: location },
            }}
          />
        )
      }
    />
  );
};

export default PrivateRoute;

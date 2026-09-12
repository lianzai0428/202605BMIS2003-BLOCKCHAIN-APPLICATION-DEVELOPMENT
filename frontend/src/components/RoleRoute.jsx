import {
  Navigate,
  useOutletContext,
} from "react-router-dom";


export default function RoleRoute({
  allowedRoles,
  children,
}) {
  const { user } =
    useOutletContext();

  const role = Number(
    user?.role ??
    user?.[1] ??
    0
  );


  if (
    !allowedRoles.includes(role)
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  return children;
}
import { useEffect, useState } from "react";
import { getSessionUser, SessionUser } from "../auth/sessionAuth";

const useUserData = () => {
  const [userData, setUserData] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUserData(getSessionUser());
  }, []);

  return userData;
};

export default useUserData;

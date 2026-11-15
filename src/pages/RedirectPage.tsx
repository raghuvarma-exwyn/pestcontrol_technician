import { IonPage } from "@ionic/react";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import { isAuthenticated } from "../data/auth/sessionAuth";

const RedirectPage: React.FC = () => {
  const history = useHistory();

  useEffect(() => {
    if (isAuthenticated()) {
      const checkInFlag = localStorage.getItem("checkInFlag");
      history.replace(checkInFlag === "true" ? "/dashboard" : "/home");
    } else {
      history.replace("/login");
    }
  }, [history]);

  return <IonPage />;
};

export default RedirectPage;

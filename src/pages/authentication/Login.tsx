import React, { useState, useEffect } from "react";
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonImg,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonIcon,
  IonProgressBar,
} from "@ionic/react";
import { useHistory } from "react-router";
import { toast } from "react-toastify";
import { loginApi, userCheckIns } from "../../data/apidata/authApi/dataApi";
import "react-toastify/dist/ReactToastify.css";
import { registerDevice } from "../../utils/pushNotiications";
import { eye, eyeOff } from "ionicons/icons";
import {
  getRememberedUsername,
  isAuthenticated,
  purgeLegacyCredentials,
  setRememberedUsername,
  setSession,
} from "../../data/auth/sessionAuth";

const Login: React.FC = () => {
  const logo = "assets/images/psd-logo.svg";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const app_version: any = localStorage.getItem("app_version");
  const app_name: any = localStorage.getItem("app_name");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isError, setIsError] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const history = useHistory();

  useEffect(() => {
    purgeLegacyCredentials();

    if (isAuthenticated()) {
      const checkInFlag = localStorage.getItem("checkInFlag");
      history.replace(checkInFlag === "true" ? "/dashboard" : "/home");
      return;
    }

    const storedUsername = getRememberedUsername();
    if (storedUsername) {
      setUsername(storedUsername);
      setRememberMe(true);
    }

    registerDevice();
  }, [history]);

  const handleLogin = async (e: React.FormEvent) => {
    setLoading(true);
    e.preventDefault();

    if (isSubmitting) return;
    setLoginMessage("");
    setIsSubmitting(true);

    if (!username) {
      setUsernameError("Please enter username");
    }
    if (!password) {
      setPasswordError("Please enter password");
    }

    if (username && password) {
      try {
        const { response, data } = await loginApi(
          username,
          password,
          app_name,
          app_version
        );

        const userData = data?.data?.[0];
        if (response.ok && userData?.api_token) {
          setRememberedUsername(rememberMe ? username : null);
          await setSession(userData);

          if (userData.last_action === "1") {
            try {
              await userCheckIns(userData);
              history.replace("/dashboard");
            } catch (error) {
              console.error("Error during check-in:", error);
              history.replace("/home");
            }
          } else {
            history.replace("/home");
          }
        } else {
          if (data?.error === "username") {
            setLoginMessage("Username is incorrect.");
          } else if (data?.error === "password") {
            setLoginMessage("Password is incorrect.");
          } else {
            setLoginMessage(data?.message || "Login failed.");
          }
          toast.error(data?.message || "Login failed.", { autoClose: 3000 });
        }
      } catch (error) {
        console.error("Login error");
        toast.error("Unable to sign in. Please try again.");
      } finally {
        setIsSubmitting(false);
        setLoading(false);
      }
      setTimeout(() => {
        setLoginMessage("");
      }, 2000);
    } else {
      setIsError(true);
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleUsernameChange = (e: any) => {
    setUsername(e.detail.value!);
    if (e.detail.value) {
      setUsernameError("");
    }
  };

  const handlePasswordChange = (e: any) => {
    setPassword(e.detail.value!);
    if (e.detail.value) {
      setPasswordError("");
    }
  };

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    if (!checked) {
      setRememberedUsername(null);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-login">
        {loading && <IonProgressBar type="indeterminate" color="success" />}
        <div className="loginwrapp">
          <IonImg
            className="loginLogo"
            src={logo}
            alt="logo"
            style={{ height: "100px" }}
          ></IonImg>
          <IonText className="loginHeading">
            <h1>Login</h1>
            <p>Enter Email / Employee ID and Password</p>
          </IonText>
          <form onSubmit={handleLogin} autoComplete="on">
            <IonLabel className="ion-label">Email / Employee ID</IonLabel>
            <IonItem lines="none">
              <IonInput
                placeholder="Email"
                value={username}
                autocomplete="username"
                onIonInput={handleUsernameChange}
              />
            </IonItem>
            {usernameError && <IonText color="danger">{usernameError}</IonText>}

            <IonLabel className="ion-label">Password</IonLabel>
            <IonItem lines="none">
              <IonInput
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                autocomplete="current-password"
                onIonInput={handlePasswordChange}
                style={{ color: "black" }}
              />
              <IonIcon
                slot="end"
                icon={showPassword ? eye : eyeOff}
                onClick={togglePasswordVisibility}
                style={{ cursor: "pointer", marginRight: "10px" }}
              />
            </IonItem>
            {passwordError && <IonText color="danger">{passwordError}</IonText>}

            <IonText className="ion-Remember">
              <IonCheckbox
                className="ionCheckbox ion-float-left"
                labelPlacement="end"
                checked={rememberMe}
                onIonChange={(e) => handleRememberMeChange(e.detail.checked)}
              >
                Remember Me
              </IonCheckbox>
            </IonText>
            <IonButton
              type="submit"
              className="ion-button"
              slot="primary"
              fill="solid"
              expand="block"
              disabled={isSubmitting}
            >
              Login
            </IonButton>
          </form>
          {loginMessage && (
            <IonText
              color={
                loginMessage === "Logged in successfully" ? "success" : "danger"
              }
            >
              {loginMessage}
            </IonText>
          )}
          <IonText className="loginVersion">
            <p>App Version &nbsp;{app_version}</p>
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;

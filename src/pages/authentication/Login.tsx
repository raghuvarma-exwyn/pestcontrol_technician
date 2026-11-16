import React, { useState, useEffect } from "react";
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonImg,
  IonInput,
  IonPage,
  IonText,
  IonIcon,
  IonProgressBar,
} from "@ionic/react";
import "./Login.css";
import { useHistory } from "react-router";
import { toast } from "react-toastify";
import { loginApi, userCheckIns } from "../../data/apidata/authApi/dataApi";
import "react-toastify/dist/ReactToastify.css";
import { registerDevice } from "../../utils/pushNotiications";
import { eye, eyeOff } from "ionicons/icons";
import { App as CapApp } from "@capacitor/app";
import { Device } from "@capacitor/device";
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
  const [appVersion, setAppVersion] = useState(
    () => localStorage.getItem("app_version") || ""
  );
  const app_name: any = localStorage.getItem("app_name") || "pest_control";
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const history = useHistory();

  useEffect(() => {
    const resolveAppVersion = async () => {
      try {
        const info = await Device.getInfo();
        if (info.platform === "ios" || info.platform === "android") {
          const appInfos = await CapApp.getInfo();
          const version = appInfos.version || "";
          if (version) {
            localStorage.setItem("app_version", version);
            setAppVersion(version);
            return;
          }
        } else {
          localStorage.setItem("app_version", "web");
          setAppVersion("web");
          return;
        }
      } catch (error) {
        console.error("Error resolving app version:", error);
      }

      const stored = localStorage.getItem("app_version");
      if (stored) setAppVersion(stored);
    };

    purgeLegacyCredentials();
    resolveAppVersion();

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
          appVersion || localStorage.getItem("app_version") || "web"
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
    <IonPage className="loginPage">
      <IonContent className="loginContent" fullscreen>
        {loading && (
          <IonProgressBar
            className="loginProgress"
            type="indeterminate"
            color="primary"
          />
        )}
        <div className="loginShell">
          <div className="loginInner">
            <div className="loginBrand">
              <IonImg className="loginLogo" src={logo} alt="PSD logo" />
              <h1 className="loginBrandMark">PSD Technician</h1>
              <p className="loginBrandSub">
                Field tools for pest control technicians
              </p>
            </div>

            <div className="loginCard">
              <div className="loginCardIntro">
                <h2>Welcome back</h2>
                <p>Sign in with your email or employee ID to continue.</p>
              </div>

              <form onSubmit={handleLogin} autoComplete="on">
                <div className="loginField">
                  <label className="loginLabel" htmlFor="login-username">
                    Email / Employee ID
                  </label>
                  <div className="loginControl">
                    <IonInput
                      id="login-username"
                      placeholder="Enter email or employee ID"
                      value={username}
                      autocomplete="username"
                      onIonInput={handleUsernameChange}
                    />
                  </div>
                  {usernameError ? (
                    <IonText className="loginError">{usernameError}</IonText>
                  ) : null}
                </div>

                <div className="loginField">
                  <label className="loginLabel" htmlFor="login-password">
                    Password
                  </label>
                  <div className="loginControl hasToggle">
                    <IonInput
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      autocomplete="current-password"
                      onIonInput={handlePasswordChange}
                    />
                    <IonButton
                      type="button"
                      fill="clear"
                      className="loginToggle"
                      onClick={togglePasswordVisibility}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      <IonIcon icon={showPassword ? eye : eyeOff} />
                    </IonButton>
                  </div>
                  {passwordError ? (
                    <IonText className="loginError">{passwordError}</IonText>
                  ) : null}
                </div>

                <div className="loginRow">
                  <IonCheckbox
                    className="loginRemember"
                    labelPlacement="end"
                    checked={rememberMe}
                    onIonChange={(e) =>
                      handleRememberMeChange(e.detail.checked)
                    }
                  >
                    Remember me
                  </IonCheckbox>
                </div>

                <IonButton
                  type="submit"
                  className="ion-button loginSubmit"
                  fill="solid"
                  expand="block"
                  color="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in…" : "Sign In"}
                </IonButton>
              </form>

              {loginMessage ? (
                <IonText
                  className={`loginAlert${
                    loginMessage === "Logged in successfully" ? " isSuccess" : ""
                  }`}
                >
                  {loginMessage}
                </IonText>
              ) : null}
            </div>

            <IonText className="loginVersion">
              <p>App Version {appVersion || "…"}</p>
            </IonText>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;

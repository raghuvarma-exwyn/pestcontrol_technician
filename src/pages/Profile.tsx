import React, { useState, useEffect } from "react";
import {
  IonButton,
  IonContent,
  IonText,
  IonThumbnail,
  IonImg,
  IonToolbar,
  IonIcon,
  IonFooter,
  IonPage,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";
import { useHistory } from "react-router";
import AvatarImage from "../../public/assets/images/avatar_image.jpeg";
import ChangePasswordForm from "../components/ChangePassword";
import { clearSession } from "../data/auth/sessionAuth";

const Profile: React.FC = () => {
  const [userData, setUserData] = useState<any>(null);
  const [avatar, setAvatar] = useState<string>(AvatarImage);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const app_version: any = localStorage.getItem("app_version");

  useEffect(() => {
    const userDataString = localStorage.getItem("userData");
    if (userDataString) {
      const parsed = JSON.parse(userDataString);
      setUserData(parsed);
      if (parsed.avatar) {
        setAvatar(parsed.avatar);
      }
    }
  }, []);

  const history = useHistory();

  const goBack = () => {
    history.goBack();
  };

  const toggleChangePasswordForm = () => {
    setShowChangePasswordForm((prev) => !prev);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCloseChangePasswordForm = () => {
    setShowChangePasswordForm(false);
  };

  const handleLogout = async () => {
    await clearSession();
    history.replace("/login");
  };

  return (
    <IonPage className="profilePage">
      <IonToolbar className="profileToolbar">
        <IonButton fill="clear" onClick={goBack} slot="start">
          <IonIcon slot="start" icon={arrowBack} />
          Profile
        </IonButton>
      </IonToolbar>
      <IonContent fullscreen className="ionContentColor">
        <div className="profileHero">
          <div className="profileAvatarWrap">
            <IonThumbnail className="profileAvatar">
              <IonImg alt="user" src={avatar} />
            </IonThumbnail>
            <input
              type="file"
              id="avatarInput"
              style={{ display: "none" }}
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </div>

          {userData && (
            <IonText>
              <h1 className="profileName">
                {userData.first_name} {userData.last_name}
              </h1>
              <h6 className="profileRole">{userData.role_name}</h6>
            </IonText>
          )}
        </div>

        {!showChangePasswordForm && (
          <div className="profileActions">
            <IonButton
              type="button"
              className="ion-button"
              fill="solid"
              expand="block"
              onClick={toggleChangePasswordForm}
            >
              Change Password
            </IonButton>
            <IonButton
              type="button"
              className="ion-button"
              color="medium"
              fill="outline"
              expand="block"
              onClick={handleLogout}
            >
              Logout
            </IonButton>
          </div>
        )}

        {showChangePasswordForm && (
          <div className="profileActions">
            <ChangePasswordForm onClose={handleCloseChangePasswordForm} />
          </div>
        )}
      </IonContent>
      <IonFooter className="ion-footer ion-no-border">
        <IonText className="loginVersionAbsolute">
          <p>App Version {app_version}</p>
        </IonText>
      </IonFooter>
    </IonPage>
  );
};

export default Profile;

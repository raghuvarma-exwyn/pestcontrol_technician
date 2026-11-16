import React, { useEffect, useState } from "react";
import { fetchNotifications } from "../data/apidata/notificationsApi/notificationsApi";
import { IonBadge, IonButton, IonImg } from "@ionic/react";
import { useHistory } from "react-router";

const NotificationLength = () => {
  const history = useHistory();
  const [notification, setNotifications] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetchNotifications();
        setNotifications(response.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const handleNotificationClick = () => {
    history.push("/notification");
  };

  return (
    <div className="headerNotifyWrap">
      <IonButton
        className="notificationsIcon"
        shape="round"
        fill="solid"
        color="light"
        onClick={handleNotificationClick}
        aria-label="Notifications"
      >
        <IonImg src="assets/images/notifications-icon.svg" />
      </IonButton>
      {notification.length > 0 && (
        <IonBadge color="danger" className="alertNotifiBadg">
          {notification.length}
        </IonBadge>
      )}
    </div>
  );
};

export default NotificationLength;

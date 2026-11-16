import { IonImg, IonText, IonThumbnail } from "@ionic/react";
import React from "react";

const OtherTaskComponent: React.FC<any> = ({
  title,
  subTitle,
  date,
  serviceDate,
  status,
  imgSrc,
}) => {
  const formatDate = (dateString: string): string => {
    const parsed = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return parsed.toLocaleString("en-US", options);
  };

  let statusClassName = "";
  switch (status) {
    case "Completed":
      statusClassName = "completedColor";
      break;
    case "Pending":
    case "Scheduled":
      statusClassName = "pendingColor";
      break;
    case "Expired":
      statusClassName = "expiredColor";
      break;
    case "Paused":
      statusClassName = "pausedColor";
      break;
    case "On Going":
      statusClassName = "ongoingColor";
      break;
    default:
      statusClassName = "";
  }

  return (
    <div className="taskCardRow">
      <IonThumbnail className="taskCardIcon">
        <IonImg src={imgSrc} />
      </IonThumbnail>
      <div className="taskCardBody">
        <IonText className="taskCardMain">
          <h3>{title}</h3>
          <h2>{subTitle}</h2>
          <p>
            <strong>Service Date :</strong>{" "}
            <span>{formatDate(serviceDate)}</span>
          </p>
          <p>
            <strong>Created On :</strong> <span>{date}</span>
          </p>
        </IonText>
        <div className="taskCardMeta">
          <span className="taskMetaItem">
            Status : <span className={statusClassName}>{status}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default OtherTaskComponent;

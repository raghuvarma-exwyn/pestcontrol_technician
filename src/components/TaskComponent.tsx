import { IonImg, IonText, IonThumbnail } from "@ionic/react";
import React from "react";

const TaskComponent: React.FC<any> = ({
  id,
  path,
  title,
  subTitle,
  date,
  serviceDate,
  time,
  reference_Number,
  priority,
  distance,
  status,
  imgSrc,
}) => {
  const formatTime = (timeValue: string | undefined) => {
    if (!timeValue) return "";
    let [hours, minutes] = timeValue.split(":").map(Number);
    hours = hours ? hours : 12;
    return `${hours}:${minutes < 10 ? "0" + minutes : minutes}`;
  };

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
            <span>
              {formatDate(serviceDate)} at {formatTime(time)}
            </span>
          </p>
          <p>
            <strong>Created On :</strong> <span>{date}</span>
          </p>
          <p>
            <strong>Reference Number :</strong> <span>{reference_Number}</span>
          </p>
        </IonText>
        <div className="taskCardMeta">
          <span className="taskMetaItem">
            Priority : <span className="highColor">{priority}</span>
          </span>
          {distance ? <span className="taskMetaItem">{distance}</span> : null}
          <span className="taskMetaItem">
            Status : <span className={statusClassName}>{status}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskComponent;

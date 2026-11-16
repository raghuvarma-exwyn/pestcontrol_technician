import { IonItem, IonThumbnail, IonImg, IonText } from "@ionic/react";
import React from "react";

const TaskDetailItems: React.FC<any> = ({ icon, labelTxt, valueTxt }) => {
  return (
    <IonItem lines="none" className="taskDetailItem">
      <IonThumbnail slot="start" className="taskDetailIcon">
        <IonImg src={"assets/images/" + icon} />
      </IonThumbnail>
      <IonText className="taskDetailText">
        <p className="taskDetailLabel">{labelTxt}</p>
        <h2 className="taskDetailValue">{valueTxt}</h2>
      </IonText>
    </IonItem>
  );
};

export default TaskDetailItems;

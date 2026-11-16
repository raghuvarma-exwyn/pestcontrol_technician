import {
  IonAlert,
  IonButton,
  IonContent,
  IonFooter,
  IonImg,
  IonItem,
  IonList,
  IonPage,
  IonText,
  IonThumbnail,
  IonToolbar,
  IonProgressBar,
} from "@ionic/react";
import { useHistory, useParams, useLocation } from "react-router";
import { useState, useEffect } from "react";
import { submitTeamAttendenceBasedOnNetwork } from "../data/offline/entity/DataTransfer";
import CommonHeader from "../components/CommonHeader";
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from "@capacitor/camera";
import {
  ProgressStatus,
  updateTaskStatus,
} from "../data/localstorage/taskStatusStorage";
import useLongitudeLocation from "../components/useLongitudeLocation";
import FullScreenLoader from "../components/FullScreenLoader";
import { Storage } from "@ionic/storage";
import { getActiveTaskData } from "../data/localstorage/taskUtils";
import { toast } from "react-toastify";

interface Technician {
  first_name: string;
  last_name: string;
  mobile_no: string;
  avatar?: string;
  user_id: string;
}

interface LocationState {
  selectedTechnicianData: Technician[];
}

const TeamAttendance: React.FC = () => {
  const Location = useLongitudeLocation();
  const [baseImage, setBaseImage] = useState<any>(null);
  const { techniciansRequired } = useParams<{ techniciansRequired: string }>();
  const [isImageUploaded, setIsImageUploaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const history = useHistory();
  const [submitting, setSubmitting] = useState(false);
  const [db, setDb] = useState<Storage | null>(null);

  const location = useLocation<LocationState>();
  const [selectedTechnicianData, setSelectedTechnicianData] = useState<
    Technician[]
  >(location.state?.selectedTechnicianData || []);

  const [showAlert, setShowAlert] = useState(false);
  const [technicianToDelete, setTechnicianToDelete] = useState<number | null>(
    null
  );

  useEffect(() => {
    async function initDb() {
      const store = new Storage();
      await store.create();
      setDb(store);
    }
    initDb();
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [selectedTechnicianData]);

  const userDataString = localStorage.getItem("userData");
  if (!userDataString) {
    throw new Error("User data is not available");
  }
  const userData = JSON.parse(userDataString);

  const handleSubmit = async () => {
    try {
      localStorage.removeItem("selectedTechnicianDataLocal");
      setSubmitting(true);

      if (!baseImage) {
        toast.error("Please upload a photo before submitting.");
        setSubmitting(false);
        return;
      }

      if (Location.latitude === null || Location.longitude === null) {
        console.error("Location data is not available");
        setSubmitting(false);
        return;
      }

      const updatedSelectedTechnicianData = [...selectedTechnicianData];
      updatedSelectedTechnicianData.unshift({
        user_id: userData.user_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        mobile_no: userData.mobile_no,
        avatar: userData.avatar,
      });

      for (const technician of updatedSelectedTechnicianData) {
        if (!technician.user_id) {
          throw new Error("Technician data missing 'user_id' property");
        }
      }

      let actTaskData = await getActiveTaskData();
      await submitTeamAttendenceBasedOnNetwork(
        actTaskData.id,
        updatedSelectedTechnicianData,
        Location.latitude,
        Location.longitude,
        baseImage
      );

      updateTaskStatus("task-id-todo", "teamAttendance", ProgressStatus.done);
      history.push("/TaskExecution");
    } catch (error) {
      console.error("Error submitting technician data:", error);
      toast.error("Server not responding. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const capturePhoto = async () => {
    const image = await Camera.getPhoto({
      quality: 25,
      allowEditing: false,
      saveToGallery: false,
      source: CameraSource.Camera,
      direction: CameraDirection.Rear,
      resultType: CameraResultType.Base64,
    });
    const imageUrl = "data:image/jpeg;base64," + image.base64String;
    setBaseImage(imageUrl);
    setIsImageUploaded(true);
  };

  const confirmDeleteTechnician = (index: number) => {
    setTechnicianToDelete(index);
    setShowAlert(true);
  };

  const handleDeleteTechnician = () => {
    if (technicianToDelete !== null) {
      const updatedTechnicians = [...selectedTechnicianData];
      updatedTechnicians.splice(technicianToDelete, 1);
      setSelectedTechnicianData(updatedTechnicians);
      localStorage.setItem(
        "selectedTechnicianDataLocal",
        JSON.stringify(updatedTechnicians)
      );
      setTechnicianToDelete(null);
    }
    setShowAlert(false);
  };

  useEffect(() => {
    const storedData = localStorage.getItem("selectedTechnicianDataLocal");
    const previouslySelectedTechnicians = storedData
      ? JSON.parse(storedData)
      : [];
    setSelectedTechnicianData(previouslySelectedTechnicians);
  }, []);

  const handleAdd = () => {
    history.push("/availabletechnicians");
  };

  const requiredCount = parseInt(techniciansRequired || "0", 10);
  const teamCount = selectedTechnicianData.length;

  return (
    <IonPage className="teamAttendancePage">
      <CommonHeader
        backToPath={"/taskexecution"}
        pageTitle={"Team Attendance"}
        showIcons={false}
      />
      <IonContent className="ionContentColor teamAttendanceContent">
        {loading ? (
          <IonProgressBar type="indeterminate" />
        ) : (
          <div className="teamAttendanceInner">
            <div className="teamLeadCard">
              <IonThumbnail className="teamLeadIcon">
                <IonImg src="assets/images/technician-icon.svg" />
              </IonThumbnail>
              <div className="teamLeadBody">
                <h2>
                  {userData.first_name} {userData.last_name}
                </h2>
                <p className="teamLeadRole">{userData.role_name}</p>
                <div className="teamLeadMeta">
                  <span>ID: {userData.user_id}</span>
                  <span>{teamCount} technician{teamCount === 1 ? "" : "s"} added</span>
                </div>
              </div>
            </div>

            <div className="teamSectionHeader">
              <div>
                <h1>Team Members</h1>
                <p>
                  {requiredCount > 0
                    ? `Required: ${requiredCount}`
                    : "Add technicians attending this visit"}
                </p>
              </div>
              <IonButton
                className="teamAddBtn"
                fill="outline"
                color="primary"
                onClick={handleAdd}
                disabled={requiredCount === 0}
              >
                Add
              </IonButton>
            </div>

            {teamCount > 0 ? (
              <IonList lines="none" className="teamMemberList">
                {selectedTechnicianData.map((technician, index) => (
                  <IonItem key={index} className="teamMemberItem" lines="none">
                    <IonThumbnail slot="start" className="teamMemberIcon">
                      <IonImg
                        src={
                          technician.avatar ||
                          "assets/images/technician-icon.svg"
                        }
                      />
                    </IonThumbnail>
                    <IonText className="teamMemberText">
                      <h3>
                        {technician.first_name} {technician.last_name}
                      </h3>
                      <p>{technician.mobile_no}</p>
                    </IonText>
                    <IonButton
                      className="teamDeleteBtn"
                      shape="round"
                      fill="clear"
                      onClick={() => confirmDeleteTechnician(index)}
                      aria-label="Remove technician"
                    >
                      <IonImg src="/assets/images/delete-icon.svg" />
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            ) : (
              <div className="teamEmptyState">
                <IonImg
                  className="teamEmptyImg"
                  src="assets/images/nodata-technician-img.svg"
                />
                <IonText>
                  <h3>No technicians added</h3>
                  <p>
                    Add available technicians who are attending this service
                    visit.
                  </p>
                </IonText>
                <IonButton
                  fill="solid"
                  color="primary"
                  className="ion-button"
                  onClick={handleAdd}
                  disabled={requiredCount === 0}
                >
                  Add Technician
                </IonButton>
              </div>
            )}

            <div className="teamPhotoSection">
              <div className="teamSectionHeader">
                <div>
                  <h1>Attendance Photo</h1>
                  <p>Capture a team photo before submitting</p>
                </div>
              </div>
              <div className="teamPhotoActions">
                <IonButton
                  className="ion-button teamPhotoBtn"
                  fill="solid"
                  color="medium"
                  expand="block"
                  onClick={capturePhoto}
                >
                  {baseImage ? "Retake Photo" : "Take a Photo"}
                </IonButton>
              </div>
              {baseImage ? (
                <div className="teamPhotoPreview">
                  <img src={baseImage} alt="Team attendance" />
                </div>
              ) : (
                <div className="teamPhotoPlaceholder">
                  <p>No photo captured yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        <FullScreenLoader isLoading={submitting} />
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={"Delete Technician"}
          message={"Are you sure you want to delete this technician?"}
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
              cssClass: "secondary",
            },
            {
              text: "Delete",
              handler: handleDeleteTechnician,
            },
          ]}
        />
      </IonContent>

      <IonFooter className="ion-footer ion-no-border">
        <IonToolbar>
          <IonButton
            className="ion-button ion-margin-horizontal"
            expand="block"
            color="primary"
            onClick={handleSubmit}
            disabled={!isImageUploaded || submitting}
          >
            Submit Attendance
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default TeamAttendance;

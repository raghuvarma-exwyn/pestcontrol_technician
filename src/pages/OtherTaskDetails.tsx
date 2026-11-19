import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonImg,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
  IonProgressBar,
} from "@ionic/react";
import { useState, useEffect } from "react";
import { useHistory } from "react-router";
import TaskDetailItems from "../components/TaskDetailItems";
import {
  checkOngoingTask,
  convertToBlob,
  fetchOtherTaskDetails,
  updateOtherTask,
  uploadOtherTaskFile,
} from "../data/apidata/taskApi/taskDataApi";
import { useParams } from "react-router-dom";
import { formatDateTime2, getDateTime } from "../utils/dateTimeUtils";
import CustomAlert from "../components/CustomAlert";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { toast, ToastContainer } from "react-toastify";
import NotificationLength from "../components/NotificationLength";
import FullScreenLoader from "../components/FullScreenLoader";
import { API_BASE_URL } from "../data/baseUrl";
import { cameraOutline, close, imageOutline } from "ionicons/icons";

const OtherTaskDetails: React.FC = () => {
  const params: any = useParams();
  // const { id } = useParams<{ id: string }>(); // Dynamically fetch taskId from URL
  const [taskDetails, setTaskDetails] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isStartingTask, setIsStartingTask] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextButton, setNextButton] = useState<string>("Start");
  const [error, setError] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  // const [taskId, settaskId] =  useState <string >();
  let taskId = "";
  const history = useHistory();

  useEffect(() => {

    loadTaskFromParams();
    fetchTDetails(taskId);
    // fetchTaskDetails(taskId)
  }, []); // Execute useEffect whenever taskId changes

  const fetchTDetails = async (taskId: any) => {
    console.log("Going to fetch Task Details for task ID ::::", taskId);
    setLoading(true); // Start loading

    try {
      const response = await fetchOtherTaskDetails(taskId);
      if (response) {
        console.log("Fetched task details:", response);
        const taskData = response.data[0];

        // Set next button based on task status
        if (taskData.start_time == null && taskData.end_time == null) {
          setNextButton("Start Task");
        } else if (taskData.start_time != null && taskData.end_time == null) {
          setNextButton("End Task"); // Assuming it should be Close for Completed
        } else {
          setNextButton("Task Completed"); // Assuming it should be Start for other statuses
        }
        setTaskDetails(taskData);
      } else {
        console.error("Failed to fetch task details. Error:", response.message);
        // toast.error('Server not responding. Please try again later.');
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
      // toast.error('Server not responding. Please try again later.');
      // Handle error state if needed
    } finally {
      setLoading(false); // End loading
    }
  };

  const loadTaskFromParams = () => {
    // console.log("id from params = ", id);
    console.log("LOADING task ID from params = ", params);
    console.log("params wise task id ", params.taskId);
    // setActiveTaskId(params.id)
    // id = params.taskId
    taskId = params.taskId;
    console.log("active task id ", taskId);
  };
  const taskData: any = [
    {
      key: "1",
      icon: "service-icon.svg",
      labelTxt: "Task Name",
      valueTxt: taskDetails.task_name || "Not available",
    },
    {
      key: "2",
      icon: "transaction-id-icon.svg",
      labelTxt: "Task Type",
      valueTxt: taskDetails.treatment_name || "Not available",
    },
    {
      key: "3",
      icon: "appointment-icon.svg",
      labelTxt: "Task Date",
      valueTxt: taskDetails.scheduled_time
        ? formatDateTime2(taskDetails.created_on)
        : "Not available",
    },
    
    {
      key: "4",
      icon: "appointment-icon.svg",
      labelTxt: "Start Time",
      valueTxt: taskDetails.start_time
        ? formatDateTime2(taskDetails.start_time)
        : "Not available",
    },
    
    {
      key: "5",
      icon: "appointment-icon.svg",
      labelTxt: "End Time",
      valueTxt: taskDetails.end_time
        ? formatDateTime2(taskDetails.end_time)
        : "Not available",
    },
    
    {
      key: "6",
      icon: "service-icon.svg",
      labelTxt: "comments",
      valueTxt: taskDetails.comments
        ? taskDetails.comments
        : "Not available",
    },
  ];

  const handleNavigateToList = () => {
    setShowAlert(false);
    setTimeout(() => {
      history.push({
        pathname: "/MaterialList",
        state: { showAlert: true },
      });
    }, 150);
  };

  const resolveImageSrc = (image: any) => {
    if (!image) return "";
    const value =
      typeof image === "string"
        ? image
        : image.file_name || image.filename || image.path || image.url || "";
    if (!value) return "";
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    const origin = API_BASE_URL.replace(/\/api\/?$/, "/");
    return `${origin}uploads/other_tasks/${value}`;
  };

  const extractImageName = (uploaded: any): string => {
    if (typeof uploaded === "string") {
      return uploaded.split(/[/\\]/).pop() || uploaded;
    }
    if (uploaded && typeof uploaded === "object") {
      const raw =
        uploaded.file_name ||
        uploaded.filename ||
        uploaded.name ||
        uploaded.path ||
        "";
      if (typeof raw === "string" && raw) {
        return raw.split(/[/\\]/).pop() || raw;
      }
    }
    return "";
  };

  const takePictureAndSubmit = async (action: "START" | "STOP") => {
    try {
      const image = await Camera.getPhoto({
        quality: 40,
        width: 1280,
        height: 1280,
        allowEditing: false,
        saveToGallery: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (!image.dataUrl) {
        toast.error("Failed to capture image");
        return;
      }

      setIsStartingTask(true);
      const imageFile = await convertToBlob(image);
      const formData = new FormData();
      formData.append("file", imageFile, "photo.jpg");

      const uploadResponse = await uploadOtherTaskFile(formData);
      if (uploadResponse?.status == 200 && uploadResponse.success) {
        const imageName = extractImageName(uploadResponse.data);
        if (!imageName) {
          toast.error("Image upload did not return a file name");
          return;
        }
        await submitTaskUpdate(action, imageName);
      } else {
        toast.error(uploadResponse?.message ?? "Image upload failed");
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      toast.error("Failed to capture or upload image");
    } finally {
      setIsStartingTask(false);
    }
  };

  const submitTaskUpdate = async (action: "START" | "STOP", imageName: string) => {
    const formattedDate = getDateTime();
    const payload =
      action === "START"
        ? {
            id: taskDetails.id,
            start_time: formattedDate,
            image: imageName,
          }
        : {
            id: taskDetails.id,
            end_time: formattedDate,
            image: imageName,
          };

    const { data } = await updateOtherTask(payload);
    if (data?.success === false) {
      toast.error(data?.message || "Failed to update task");
      return;
    }
    toast.success(data?.message || (action === "START" ? "Task started" : "Task ended"));
    fetchTDetails(taskDetails.id);
  };

  const startTask = async () => {
    if (isStartingTask) return;
    setIsStartingTask(true);
    try {
      const isOngoing: any = await checkOngoingTask();
      console.log("isOngoing", isOngoing);

      if (taskDetails.start_time == null && taskDetails.end_time == null) {
        if (isOngoing.is_user_on_job == true) {
          toast.info(
            "Please complete or pause the ongoing task before starting or resuming another one.",
            { autoClose: 3000 }
          );
          return;
        }
        setIsStartingTask(false);
        await takePictureAndSubmit("START");
        return;
      } else if (taskDetails.start_time !== null && taskDetails.end_time == null) {
        setConfirmStop(true);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsStartingTask(false);
    }
    console.log("Start or Continue Task . task data = ", taskDetails);
  };
  const handleCloseAlert = () => {
    setShowAlert(false);
  };

  // const navigateToTaskExe = () => {
  //   history.push("/taskexecution");
  // };

  const alertButtons = [
    {
      text: "Close",
      cssClass: "alert-button-cancel",
      role: "close",
      handler: () => handleCloseAlert(),
    },
  ];
  const goBack = () => {
    history.goBack();
  };
  return (
    <>
      <ToastContainer />
      <IonHeader
        translate="yes"
        className="ion-no-border ion-padding-horizontal"
      >
        <IonToolbar>
          <IonButtons slot="start" className="ion-no-padding">
            <IonBackButton defaultHref={"/"}></IonBackButton>
          </IonButtons>
          <IonTitle className="ion-float-start"> Task Details</IonTitle>
          <div className="ion-float-end headerBts">
            <IonButton shape="round" routerLink={"/"}>
              <IonImg src="assets/images/home-outline-icon.svg" />
            </IonButton>

            <NotificationLength />
            <IonButton shape="round" routerLink={"/profile"}>
              <IonImg src="assets/images/account-user.svg" />
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent
        fullscreen
        className="dashboardWrapp ionContentColor ion-padding-horizontal"
      >
        {loading && <IonProgressBar type="indeterminate" />}
        <div className="ionPaddingBottom">
          <IonList lines="full" className="ion-list-item ">
            {taskData.length > 0 &&
              taskData.map((obj: any, index: any) => {
                const { icon, labelTxt, valueTxt, key } = obj;
                return (
                  <TaskDetailItems
                    icon={icon}
                    labelTxt={labelTxt}
                    valueTxt={valueTxt}
                    key={key}
                  />
                );
              })}
          </IonList>
          {(taskDetails.start_time ||
            taskDetails.start_image ||
            taskDetails.end_image) && (
            <section className="otherTaskPhotos">
              <div className="otherTaskPhotosHead">
                <IonIcon icon={imageOutline} aria-hidden="true" />
                <h3>Captured Photos</h3>
              </div>
              <div className="otherTaskPhotoGrid">
                <article className="otherTaskPhotoCard">
                  <div className="otherTaskPhotoMeta">
                    <span className="otherTaskPhotoChip otherTaskPhotoChipStart">
                      Start
                    </span>
                    <small>
                      {taskDetails.start_time
                        ? formatDateTime2(taskDetails.start_time)
                        : "Pending"}
                    </small>
                  </div>
                  {taskDetails.start_image ? (
                    <button
                      type="button"
                      className="otherTaskPhotoHit"
                      onClick={() =>
                        setViewerSrc(resolveImageSrc(taskDetails.start_image))
                      }
                    >
                      <img
                        src={resolveImageSrc(taskDetails.start_image)}
                        alt="Start capture"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ) : (
                    <div className="otherTaskPhotoEmpty">
                      <IonIcon icon={cameraOutline} aria-hidden="true" />
                      <p>Not captured yet</p>
                    </div>
                  )}
                </article>

                <article className="otherTaskPhotoCard">
                  <div className="otherTaskPhotoMeta">
                    <span className="otherTaskPhotoChip otherTaskPhotoChipEnd">
                      End
                    </span>
                    <small>
                      {taskDetails.end_time
                        ? formatDateTime2(taskDetails.end_time)
                        : "Pending"}
                    </small>
                  </div>
                  {taskDetails.end_image ? (
                    <button
                      type="button"
                      className="otherTaskPhotoHit"
                      onClick={() =>
                        setViewerSrc(resolveImageSrc(taskDetails.end_image))
                      }
                    >
                      <img
                        src={resolveImageSrc(taskDetails.end_image)}
                        alt="End capture"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ) : (
                    <div className="otherTaskPhotoEmpty">
                      <IonIcon icon={cameraOutline} aria-hidden="true" />
                      <p>Not captured yet</p>
                    </div>
                  )}
                </article>
              </div>
            </section>
          )}
        </div>

      </IonContent>
      <IonFooter className="ion-footer">
        <IonToolbar className="ionFooter">
          <IonButton
            className="ion-button"
            expand="full"
            color={"primary"}
            disabled={nextButton === "Task Completed" || isStartingTask}
            onClick={(e) => startTask()}
          >
            {nextButton}
          </IonButton>
        </IonToolbar>
      </IonFooter>
      <FullScreenLoader isLoading={isStartingTask} />
      <IonAlert
        isOpen={confirmStop}
        header="Are you sure this task is done?"
        buttons={[
          {
            text: "No",
            cssClass: "alert-button-no",
            handler: () => setConfirmStop(false),
          },
          {
            text: "Yes",
            role: "confirm",
            cssClass: "alert-button-primary",
            handler: async () => {
              setConfirmStop(false);
              await takePictureAndSubmit("STOP");
            },
          },
        ]}
        onDidDismiss={() => setConfirmStop(false)}
      />

      <IonModal
        className="otherTaskImageViewerModal"
        isOpen={Boolean(viewerSrc)}
        onDidDismiss={() => setViewerSrc(null)}
      >
        <div
          className="otherTaskImageViewer"
          onClick={() => setViewerSrc(null)}
          role="presentation"
        >
          <button
            type="button"
            className="otherTaskImageViewerClose"
            onClick={() => setViewerSrc(null)}
            aria-label="Close image"
          >
            <IonIcon icon={close} />
          </button>
          {viewerSrc && (
            <img
              className="otherTaskImageViewerImg"
              src={viewerSrc}
              alt="Captured photo"
              decoding="async"
              onClick={(event) => event.stopPropagation()}
            />
          )}
        </div>
      </IonModal>

      <CustomAlert
        isOpen={showAlert}
        subHeader="Please collect insufficient materials at the warehouse today."
        message="click here to see the list"
        buttons={alertButtons}
        onClose={handleCloseAlert}
        onMessageClick={handleNavigateToList}
      />
    </>
  );
};

export default OtherTaskDetails;

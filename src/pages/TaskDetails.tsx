import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonImg,
  IonItem,
  IonList,
  IonPage,
  IonRow,
  IonText,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  IonProgressBar,
} from "@ionic/react";
import { useState, useEffect } from "react";
import { useHistory } from "react-router";
import CustomBackButton from "../components/CustomBackButton";
import CommonHeader from "../components/CommonHeader";
import TaskDetailItems from "../components/TaskDetailItems";
import { ellipse } from "ionicons/icons";
import {
  fetchTaskDetails,
  getVisitExecutionDetails,
} from "../data/apidata/taskApi/taskDataApi";
import { useParams } from "react-router-dom";
import { taskInit } from "../data/apidata/taskApi/taskDataApi";
import { formatDate, getDate, getDateTime } from "../utils/dateTimeUtils";
import CustomAlert from "../components/CustomAlert";
import {
  retrieveNetworkTasksDetails,
  retrieveNetworkTasksExecutionDetails,
} from "../data/offline/entity/DataRetriever";
import TaskProgress, {
  saveTaskProgress,
  setStartStatus,
  updateTaskProgressStatusFromExecDetails,
} from "../data/localstorage/taskStatusStorage";
import { pencil, arrowBack } from "ionicons/icons";
import { Network } from "@capacitor/network";
import { submitTaskStart } from "../data/offline/entity/DataTransfer";
import { toast } from "react-toastify";
import NotificationLength from "../components/NotificationLength";
import FullScreenLoaderTask from "../components/FullScreenLoaderTask";
const TaskDetails: React.FC = () => {
  const params: any = useParams();
  // const { id } = useParams<{ id: string }>(); // Dynamically fetch taskId from URL
  const [taskDetails, setTaskDetails] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isStartingTask, setIsStartingTask] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextButton, setNextButton] = useState<string>("Start");
  const [error, setError] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [allowInsufficientStock, setAllowInsufficientStock] = useState(false);

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
      const response = await retrieveNetworkTasksDetails(taskId);
      if (response) {
        console.log("Fetched task details:", response);
        const taskData = response;

        // Set next button based on task status
        if (
          taskData.service_status === "On Going" ||
          taskData.service_status === "Paused"
        ) {
          setNextButton("Continue");
        } else if (taskData.service_status === "Completed") {
          setNextButton("Close"); // Assuming it should be Close for Completed
        } else {
          setNextButton("Start"); // Assuming it should be Start for other statuses
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
      icon: "site-location-icon.svg",
      labelTxt: "Site Location",
      valueTxt: taskDetails.address || "Not available",
    },
    {
      key: "2",
      icon: "service-icon.svg",
      labelTxt: "Service",
      valueTxt: taskDetails.service_name || "Not available",
    },
    {
      key: "3",
      icon: "transaction-id-icon.svg",
      labelTxt: "Transaction ID",
      valueTxt: taskDetails.reference_number || "Not available",
    },
    {
      key: "4",
      icon: "contact-icon.svg",
      labelTxt: "Contact Person Name",
      valueTxt: taskDetails.customer_name || "Not available",
    },
    {
      key: "5",
      icon: "contact-icon.svg",
      labelTxt: "Contact Mobile",
      valueTxt: taskDetails.mobile_no || "Not available",
    },
    {
      key: "6",
      icon: "appointment-icon.svg",
      labelTxt: "Appointment Date",
      valueTxt: taskDetails.service_date
        ? formatDate(taskDetails.service_date) +
          " " +
          taskDetails.preffered_time
        : "Not available",
    },
    {
      key: "7",
      icon: "treatment-type-icon.svg",
      labelTxt: "Treatment Type",
      valueTxt: taskDetails.treatment_types
        ? taskDetails.treatment_types
            .map((type: any) => type.treatment)
            .join(", ")
        : "Not available",
    },
    {
      key: "8",
      icon: "pest-covered-icon.svg",
      labelTxt: "Pest Covered",
      valueTxt: taskDetails.pest_covered
        ? taskDetails.pest_covered.map((pest: any) => pest.pest).join(", ")
        : "Not available",
    },
    {
      key: "9",
      icon: "area-icon.svg",
      labelTxt: "Area",
      valueTxt: "Not available",
    },
  ];

  const getServiceRequestTypes = (status = taskDetails.service_status) => {
    const serviceStatus = (status || "").toLowerCase();
    const isResume = serviceStatus === "on going" || serviceStatus === "paused";
    return {
      logType: isResume ? "Service Request Resume" : "Service Request Start",
      trackingType: isResume ? "Service Resumed" : "Service Initiated",
    };
  };

  const handleNavigateToList = () => {
    const { logType, trackingType } = getServiceRequestTypes();
    setShowAlert(false);
    setTimeout(() => {
      history.push({
        pathname: "/MaterialList",
        state: {
          showAlert: true,
          logType,
          trackingType,
        },
      });
    }, 150);
  };
  const handleChemicalRequiredCheck = (response: any, data: any) => {
    console.log(
      "Response from API:----------------------------------->",
      response
    );
    console.log(
      "Response from API:----------------------------------->",
      data
    );
    if (response.ok) {
      console.log("API Response:", data);
      if (data.is_chemicals_required) {
        setAllowInsufficientStock(!!data.allow_insufficient_stock);
        setShowAlert(true);
      } else {
        history.push("/taskexecution");
      }
    } else {
      console.error("Error Checking In ", response);
      setError(data?.message);
      if (data?.is_chemicals_required) {
        setAllowInsufficientStock(!!data.allow_insufficient_stock);
        setShowAlert(true);
      }
    }
  };

  const startTask = async () => {
    if (isStartingTask) return;
    console.log("Start or Continue Task . task data = ", taskDetails);
    const serviceStatus = (taskDetails.service_status || "").toLowerCase();
    setIsStartingTask(true);
    try {
      if (serviceStatus === "on going" || serviceStatus === "paused") {
        console.log("taskData.service_status == On Going / Paused");
        try {
          const { response, data } = await retrieveNetworkTasksExecutionDetails(
            taskDetails.id
          );
          if (response.ok) {
            console.log("Visit Execution Details ::", data.data);
            const updatedTaskProgress: TaskProgress =
              updateTaskProgressStatusFromExecDetails(
                taskDetails.id,
                data.data
              );
            console.log("final progressStatus of task:", updatedTaskProgress);
            if (updatedTaskProgress) saveTaskProgress(updatedTaskProgress);
          } else {
            console.error(data.message);
            // toast.error('Server not responding. Please try again later.');
          }
        } catch (error) {
          console.error("Error:", error);
          // toast.error('Server not responding. Please try again later.');
        }

        const formattedDate = getDateTime();
        const { response, data } = await submitTaskStart(
          taskDetails.id,
          formattedDate,
          "Service Request Resume",
          "Service Resumed"
        );
        handleChemicalRequiredCheck(response, data);
      } else if (taskDetails.service_status == "Completed") {
        console.log("taskData.service_status == Completed ");
        try {
          const { response, data } = await getVisitExecutionDetails(
            taskDetails.id
          );
          if (response.ok) {
            console.log("Visit Execution Details ::", data.data);
            const updatedTaskProgress: TaskProgress =
              updateTaskProgressStatusFromExecDetails(
                taskDetails.id,
                data.data
              );
            if (updatedTaskProgress) saveTaskProgress(updatedTaskProgress);
          } else {
            console.error(data.message);
            // toast.error('Server not responding. Please try again later.');
          }
        } catch (error) {
          console.error("Error:", error);
          // toast.error('Server not responding. Please try again later.');
        }
        history.push("/taskexecution");
      } else {
        //pending
        console.log("taskData.service_status == Pending ");
        const formattedDate = getDateTime();
        const { response, data } = await submitTaskStart(
          taskDetails.id,
          formattedDate,
          "Service Request Start",
          "Service Initiated"
        );

        if (response.ok) {
          const progressStatus: TaskProgress = setStartStatus(
            "" + taskDetails.id
          );
          console.log("Start progress status:", progressStatus);
        }
        handleChemicalRequiredCheck(response, data);
      }
    } catch (error) {
      console.error("Error:", error);
      // toast.error('Server not responding. Please try again later.');
    } finally {
      setIsStartingTask(false);
    }
  };
  const handleCloseAlert = () => {
    setShowAlert(false);
    setAllowInsufficientStock(false);
  };

  const handleContinueToExecution = () => {
    setShowAlert(false);
    setAllowInsufficientStock(false);
    history.push("/taskexecution");
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
    {
      text: "Continue",
      cssClass: "alert-button-confirm",
      handler: () => handleContinueToExecution(),
    },
  ];
  const goBack = () => {
    history.goBack();
  };
  return (
    <IonPage>
      <IonHeader className="ion-no-border appPageHeader">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" text="Back" />
          </IonButtons>
          <IonTitle slot="start">Task Details</IonTitle>
          <IonButtons slot="end" className="headerBts">
            <IonButton shape="round" routerLink="/">
              <IonImg src="assets/images/home-outline-icon.svg" />
            </IonButton>
            <NotificationLength />
            <IonButton shape="round" routerLink="/profile">
              <IonImg src="assets/images/account-user.svg" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="dashboardWrapp ionContentColor ion-padding-horizontal taskDetailsContent">
        {loading && <IonProgressBar type="indeterminate" />}
        <div className="ionPaddingBottom">
          <IonList lines="none" className="ion-list-item taskDetailsList">
            {taskData.length > 0 &&
              taskData.map((obj: any) => {
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
        </div>
      </IonContent>
      <IonFooter className="ion-footer ion-no-border">
        <IonToolbar className="ionFooterTwoButtons">
          <IonButton
            className="ion-button"
            color="medium"
            routerLink="/taskreschedule"
            disabled={
              taskDetails.service_status === "On Going" ||
              taskDetails.service_status === "Paused"
            }
          >
            Reschedule
          </IonButton>
          <IonButton
            className="ion-button"
<<<<<<< HEAD
            color="primary"
            onClick={() => startTask()}
=======
            color={"primary"}
            disabled={isStartingTask}
            onClick={(e) => startTask()}
>>>>>>> 511cf74 (continue button changes)
          >
            {nextButton}
          </IonButton>
        </IonToolbar>
      </IonFooter>

      <CustomAlert
        isOpen={showAlert}
        subHeader="Please collect insufficient materials at the warehouse today."
        message="click here to see the list"
        buttons={alertButtons}
        onClose={handleCloseAlert}
        onMessageClick={handleNavigateToList}
      />
<<<<<<< HEAD
    </IonPage>
=======
      <FullScreenLoaderTask isLoading={isStartingTask} />
    </>
>>>>>>> 511cf74 (continue button changes)
  );
};

export default TaskDetails;

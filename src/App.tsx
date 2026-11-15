import {
  Redirect,
  BrowserRouter as Router,
  Route,
  Switch,
} from "react-router-dom";
import { useHistory } from "react-router-dom";

import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import Home from "./pages/Home";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/* Theme variables */
import "./theme/variables.css";
import "./global.scss";
import Login from "./pages/authentication/Login";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import TaskDetails from "./pages/TaskDetails";
import TeamAttendance from "./pages/TeamAttendance";
import AvailableTechnicians from "./pages/AvailableTechnicians";
import TaskExecution from "./pages/TaskExecution";
import PestActivityFound from "./pages/PestActivityFound";

import Recommendations from "./pages/Recommendations";
import ChemicalUsed from "./pages/ChemicalUsed";
import WorkDoneDetails from "./pages/WorkDoneDetails";
import FeedbackFollowup from "./pages/FeedbackFollowup";
import ChemicalUsedDetails from "./pages/ChemicalUsedDetails";
import Site from "./pages/Site";
import SiteViewLocation from "./pages/SiteViewLocation";
import TaskReschedule from "./pages/TaskReschedule";
import MaterialList from "./pages/MaterialList";
import TaskPreview from "./pages/TaskPreview";
import Notification from "./pages/Notification";
import Preview from "./pages/Notification";
import Profile from "./pages/Profile";
import LeaveRequestList from "./pages/leaves/LeaveRequestList";
import ApplyLeave from "./pages/leaves/ApplyLeave";

import { useEffect, useState } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { getCurrentLocation } from "./data/providers/GeoLocationProvider";
// import { IonButton, IonLoading, IonToast } from '@ionic/react';
import { appSettings, postDataToLocationTracking } from "./data/apidata/authApi/dataApi";
import ChangePasswordForm from "./components/ChangePassword";
import Forms from "./pages/Forms";
import FormData from "./pages/FormData";
import RedirectPage from "./pages/RedirectPage";
import { registerPushHandlers } from "./utils/pushNotiications";
import CreateTask from "./pages/CreateTask";

import StockTransfer from "./pages/StockTransfer";
import StockTransferredReceived from "./pages/StockTransferredReceived";
import StockTransferredDetails from "./pages/StockTransferDetails";
import PestActivityFoundPreview from "../src/pages/PestActivityFoundPreview";
import ChemicalUsedPreview from "../src/pages/ChemicalUsedPreview";
import { App as Appp } from '@capacitor/app';
import { Device } from '@capacitor/device';
import NetworkSpeedCheck from "./components/NetworkSpeedCheck";
import NetworkStatus from "./components/NetworkStatus";
import AppUpdate from "./components/AppUpdate";
import { LoadScript, useLoadScript } from "@react-google-maps/api";
import CreateCallOut from "./pages/CreateCallOut";
import OtherTasks from "./pages/OtherTasks";
import OtherTaskDetails from "./pages/OtherTaskDetails";
import { sendLocationOffNotification } from "./data/apidata/taskApi/taskDataApi";
import PrivateRoute from "./components/PrivateRoute";
import { isAuthenticated, getSessionUser } from "./data/auth/sessionAuth";

setupIonicReact();
const getUserId = () => {
  const userData = getSessionUser();
  if (userData?.user_id != null) {
    return userData.user_id;
  }
  throw new Error("User ID not available in session");
};

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [position, setPosition] = useState<any>();
  const [appInfo, setAppInfo] = useState<any>([]);
  const [googleApiKey, setGoogleApiKey] = useState<string>(localStorage.getItem('Google_Map_API_Key') || '');
  const [appVersion, setAppVersion] = useState<string>('');
  const history = useHistory();
  const libraries = ['places', 'geometry'];


  useEffect(() => {
    localStorage.setItem('app_name', 'pest_control');
    handlePlatform();
    registerPushHandlers();
    console.log("Checking User session");
    const checkInFlag = localStorage.getItem("checkInFlag");

    if (isAuthenticated()) {
      pollLocation(); // Fetch geolocation immediately
      const geolocationInterval = setInterval(pollLocation, 60000); // Fetch geolocation every 1 minute
      // User Logged in Navigate to Home or Technician Dashboard
      console.log("User session valid");
      // Clear intervals on component unmount
      return () => {
        clearInterval(geolocationInterval);
      };
    } else {
      console.log("User session NOT valid. DO NOT POLL Location.");
    }
  }, []);

  useEffect(() => {
    const handleBackButton = () => {
      if (history.length > 1) {
        // Navigate to the previous page if there is a history stack
        history.goBack();
      } else {
        // Exit the app if there's no history to go back
        Appp.exitApp();
      }
    };

    const backButtonListener: any = Appp.addListener('backButton', handleBackButton);

    return () => {
      backButtonListener.remove();
    };
  }, [history]);
  let locationFailCount = 0;
  const MAX_FAILS = 3;

  const pollLocation = async () => {
    try {
      const actTaskDataString = localStorage.getItem("activeTaskData");
      let actTaskId = "";

      if (actTaskDataString) {
        let actTaskData = JSON.parse(actTaskDataString);
        console.log("Poll - act task data = ", actTaskData);

        if (actTaskData && actTaskData.id) {
          actTaskId = actTaskData.id;
        }
      }

      const userId = getUserId();
      const position = await getCurrentLocation();

      // ❌ LOCATION FAILED
      if (!position) {
        locationFailCount++;
        console.log("Location failed count:", locationFailCount);

        if (locationFailCount >= MAX_FAILS) {
          console.log("Triggering notification after 3 failures");

          await sendLocationOffNotification({user_id : userId, app_name : "Technician"});

          // reset after notifying
          locationFailCount = 0;
        }

        return;
      }

      // ✅ LOCATION SUCCESS
      locationFailCount = 0;

      console.log("Geolocation fetched for polling:", position.coords);
      setPosition(position);

      await postDataToLocationTracking(
        position.coords.latitude,
        position.coords.longitude,
        actTaskId
      );

    } catch (e) {
      console.error("Polling error:", e);

      // Treat exception also as failure (optional but recommended)
      locationFailCount++;

      if (locationFailCount >= MAX_FAILS) {
        const userId = getUserId();
        await sendLocationOffNotification({user_id : userId, app_name : "Technician"});
        locationFailCount = 0;
      }

      setError("Geolocation Error or user not logged in.");
    }
  };
  const pollLocationn = async () => {
    try {
      const actTaskDataString = localStorage.getItem("activeTaskData");
      let actTaskId = "";
      if (actTaskDataString) {
        let actTaskData = JSON.parse(actTaskDataString);
        console.log("Poll - act task data = ", actTaskData);
        if (actTaskData && actTaskData.id) {
          actTaskId = actTaskData.id; // Accessing the id directly
        }
      }
      const position = await getCurrentLocation();
      if (position) {
        const userId = getUserId();
        console.log("Geolocation fetched for polling:", position.coords);
        setPosition(position);
        await postDataToLocationTracking(
          position.coords.latitude,
          position.coords.longitude,
          actTaskId // Active Task ID should be passed here if available
        );
      }
    } catch (e) {
      setError("Geolocation Error or user not logged in.");
    }
  };


  async function handlePlatform() {
    try {
      const AppSettings = await appSettings();
      console.log(AppSettings);
      if (AppSettings && AppSettings.data.success) {
        const GoogleKey = AppSettings.data.data.find((setting: any) => setting.title === "Google_Map_API_Key");
        console.log(GoogleKey);
        if (GoogleKey) {
          localStorage.setItem('Google_Map_API_Key', GoogleKey.description);

        }
      }
      const info = await Device.getInfo();
      const platform = info.platform;
      console.log(platform);
      if (platform === 'ios' || platform === 'android') {
        console.log('Running on Device');
        const appInfos = await Appp.getInfo();
        setAppInfo(appInfos);
        setAppVersion(appInfos.version);

        localStorage.setItem('app_version', appInfos.version);
      } else {
        console.log('Running on Web');
        setAppInfo([]);
        localStorage.setItem('app_version', 'web');
      }
    } catch (error) {
      console.error('Error getting device info:', error);
    } finally {
      console.log(appInfo);
      console.log(appVersion);
    }
  }
  return (

    <IonApp>
      <LoadScript googleMapsApiKey={googleApiKey} libraries={libraries}></LoadScript>
      <NetworkStatus />
      <AppUpdate />
      <ToastContainer />

      <IonReactRouter>
        <IonRouterOutlet>
          <NetworkSpeedCheck />
          <Switch>
            <PrivateRoute exact path="/home">
              <Home />
            </PrivateRoute>
            <PrivateRoute exact path="/ChemicalUsedPreview">
              <ChemicalUsedPreview />
            </PrivateRoute>

            <PrivateRoute exact path="/pestActivityfoundpreview">
              <PestActivityFoundPreview />
            </PrivateRoute>
            <PrivateRoute exact path="/dashboard">
              <Dashboard />
            </PrivateRoute>
            <PrivateRoute exact path="/MaterialList">
              <MaterialList />
            </PrivateRoute>
            <PrivateRoute exact path="/tasks">
              <Tasks />
            </PrivateRoute>
            <PrivateRoute exact path="/othertasks">
              <OtherTasks />
            </PrivateRoute>
            <PrivateRoute exact path="/tasks/:taskId">
              <TaskDetails />
            </PrivateRoute>
            <PrivateRoute exact path="/othertasks/:taskId">
              <OtherTaskDetails />
            </PrivateRoute>
            <PrivateRoute exact path="/formdata/:taskId">
              <FormData />
            </PrivateRoute>
            <PrivateRoute exact path="/taskreschedule">
              <TaskReschedule />
            </PrivateRoute>
            <PrivateRoute exact path="/taskexecution">
              <TaskExecution />
            </PrivateRoute>
            <PrivateRoute exact path="/taskpreview">
              <TaskPreview />
            </PrivateRoute>
            <PrivateRoute exact path="/teamattendance/:techniciansRequired">
              <TeamAttendance />
            </PrivateRoute>
            <PrivateRoute exact path="/availabletechnicians">
              <AvailableTechnicians />
            </PrivateRoute>
            <PrivateRoute exact path="/pestactivityfound">
              <PestActivityFound />
            </PrivateRoute>
            <PrivateRoute exact path="/recommendations">
              <Recommendations />
            </PrivateRoute>
            <PrivateRoute exact path="/chemicalused">
              <ChemicalUsed />
            </PrivateRoute>
            <PrivateRoute exact path="/chemicaluseddetails">
              <ChemicalUsedDetails />
            </PrivateRoute>
            <PrivateRoute exact path="/workdonedetails">
              <WorkDoneDetails />
            </PrivateRoute>
            <PrivateRoute exact path="/feedbackfollowup">
              <FeedbackFollowup />
            </PrivateRoute>
            <PrivateRoute exact path="/site">
              <Site />
            </PrivateRoute>
            <PrivateRoute exact path="/siteviewlocation/:taskId">
              <SiteViewLocation />
            </PrivateRoute>
            <PrivateRoute exact path="/notification">
              <Notification />
            </PrivateRoute>
            <PrivateRoute exact path="/preview">
              <Preview />
            </PrivateRoute>
            <PrivateRoute exact path="/profile">
              <Profile />
            </PrivateRoute>
            <PrivateRoute exact path="/leaverequestlist">
              <LeaveRequestList />
            </PrivateRoute>
            <PrivateRoute exact path="/applyleave">
              <ApplyLeave />
            </PrivateRoute>
            <Route path="/login">
              <Login />
            </Route>
            <PrivateRoute exact path="/createTask">
              <CreateTask />
            </PrivateRoute>
            <PrivateRoute exact path="/createCallOut">
              <CreateCallOut />
            </PrivateRoute>
            <PrivateRoute exact path="/stocktransferreddetails/:id">
              <StockTransferredDetails />
            </PrivateRoute>

            <PrivateRoute exact path="/stocktransferredreceived">
              <StockTransferredReceived />
            </PrivateRoute>

            <PrivateRoute exact path="/stocktransfer">
              <StockTransfer />
            </PrivateRoute>
            <Route path="/redirectpage">
              <RedirectPage />
            </Route>
            <PrivateRoute exact path="/forms">
              <Forms />
            </PrivateRoute>
            <PrivateRoute path="/changePassword">
              <ChangePasswordForm onClose={() => undefined} />
            </PrivateRoute>

            <Route exact path="/">
              <Redirect to="/redirectpage" />
            </Route>
          </Switch>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;

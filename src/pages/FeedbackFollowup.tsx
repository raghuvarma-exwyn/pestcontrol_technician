import {
  IonButton,
  IonContent,
  IonFooter,
  IonPage,
  IonText,
  IonInput,
  IonToolbar,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonBadge,
} from "@ionic/react";
import "./FeedbackFollowup.css";
import { useHistory } from "react-router";
import CommonHeader from "../components/CommonHeader";
import { useEffect, useState, useRef } from "react";
import CustomerSignature from "../components/CustomerSignature";
import TechnicianSignature from "../components/TechnicianSignature";
import swal from "sweetalert";
import useLongitudeLocation from "../components/useLongitudeLocation";
import { saveFeedBackBasedOnNetwork } from "../data/offline/entity/DataTransfer";
import { toZonedTime, format } from "date-fns-tz";
import { useForm } from "react-hook-form";
import moment from "moment-timezone";

const formatToUaeTime = (dateTime: any) => {
  const uaeTimeZone = "Asia/Dubai";
  const zonedTime = toZonedTime(dateTime, uaeTimeZone);
  return format(zonedTime, "yyyy-MM-dd HH:mm:ss");
};

const FeedbackFollowup: React.FC = () => {
  const location = useLongitudeLocation();
  const [feedback, setFeedback] = useState<string | null | undefined>("");
  const [customerSignature, setCustomerSignature] = useState<
    string | null | undefined
  >("");
  const [technicianSignature, setTechnicianSignature] = useState<
    string | null | undefined
  >("");
  const [feedbackDetails, setFeedbackDetails] = useState<
    string | null | undefined
  >("");
  const [followUpRequired, setFollowUpRequired] = useState<
    string | null | undefined
  >("");
  const [followUpDate, setFollowUpDate] = useState<string | null | undefined>(
    ""
  );
  const [completedDate, setCompletedDate] = useState<string | null | undefined>(
    ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const { clearErrors } = useForm();
  const [isCustomerSignatureSaved, setIsCustomerSignatureSaved] =
    useState<boolean>(false);
  const [isTechnicianSignatureSaved, setIsTechnicianSignatureSaved] =
    useState<boolean>(false);

  const customerSignatureRef = useRef<any>(null);
  const technicianSignatureRef = useRef<any>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const initialFormState = {
    feedback: "",
    customerSignature: "",
    technicianSignature: "",
    feedbackDetails: "",
    followUpRequired: "",
    followUpDate: "",
    completedDate: "",
  };

  const fetchUserData = () => {
    const userDataString = localStorage.getItem("userData");
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      setUserData(userData);
    } else {
      console.error("User Data is not available");
    }
  };

  useEffect(() => {
    const uaeCurrentTime = moment
      .tz("Asia/Dubai")
      .format("YYYY-MM-DDTHH:mm:ss");
    setFollowUpDate(uaeCurrentTime);
  }, []);

  const history = useHistory();

  const taskId = localStorage.getItem("activeTaskData");
  if (!taskId) {
    throw new Error("Task Data not available");
  }
  const activeTaskData = JSON.parse(taskId);

  const handleSubmit = async () => {
    setFormSubmitted(true);

    if (
      !feedback ||
      !customerSignature ||
      !technicianSignature ||
      !followUpRequired ||
      (followUpRequired === "Yes" && !followUpDate)
    ) {
      console.error("Please fill in all the required fields");
      return;
    }

    if (formSubmitted && !customerSignature) {
      console.error("Please provide customer signature");
      return;
    }

    setSubmitting(true);
    try {
      const requestBody = {
        visit_id: activeTaskData.id,
        customer_feedback: feedback,
        customer_signature: customerSignature || "",
        technician_signature: technicianSignature || "",
        feedback: feedbackDetails || "",
        is_follow_up_required: followUpRequired || "",
        next_follow_up: followUpDate
          ? formatToUaeTime(new Date(followUpDate))
          : null,
        latitude: location.latitude !== null ? location.latitude : 0,
        longitude: location.longitude !== null ? location.longitude : 0,
        visit_completed: completedDate || "",
        date_time: formatToUaeTime(new Date()),
      };

      const responseData = await saveFeedBackBasedOnNetwork(
        requestBody.visit_id,
        requestBody.customer_feedback,
        requestBody.customer_signature,
        requestBody.technician_signature,
        requestBody.feedback,
        requestBody.is_follow_up_required,
        requestBody.next_follow_up,
        requestBody.latitude,
        requestBody.longitude,
        requestBody.visit_completed,
        requestBody.date_time
      );

      console.log(responseData);

      swal("Success", "Task completed successfully!", "success").then(() => {
        history.push("/tasks");
      });
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentDateTime = (): string => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    const hours = String(currentDate.getHours()).padStart(2, "0");
    const minutes = String(currentDate.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const onFollowUpDateChange = (newFollowUpDateTime: any) => {
    const formattedDateTime = newFollowUpDateTime.replace("T", " ");
    setFollowUpDate(formattedDateTime);
  };

  const handleCancel = () => {
    swal({
      title: "Reset Form?",
      text: "Are you sure you want to reset the form? All unsaved changes will be lost.",
      buttons: ["Cancel", "OK"],
    }).then((willReset) => {
      if (willReset) {
        setFeedback(initialFormState.feedback);
        setCustomerSignature(initialFormState.customerSignature);
        setTechnicianSignature(initialFormState.technicianSignature);
        setFeedbackDetails(initialFormState.feedbackDetails);
        setFollowUpRequired(initialFormState.followUpRequired);
        setFollowUpDate(initialFormState.followUpDate);
        setCompletedDate(initialFormState.completedDate);

        clearErrors();
        setFormSubmitted(false);

        setIsCustomerSignatureSaved(false);
        setIsTechnicianSignatureSaved(false);

        if (customerSignatureRef.current) {
          customerSignatureRef.current.clearSignature();
        }
        if (technicianSignatureRef.current) {
          technicianSignatureRef.current.clearSignature();
        }
      }
    });
  };

  return (
    <IonPage className="feedbackPage">
      <CommonHeader
        backToPath={"/taskexecution"}
        pageTitle={"Feedback/Follow up"}
        showIcons={false}
      />
      <IonContent className="ionContentColor feedbackContent">
        <div className="feedbackInner">
          <div className="feedbackIntro">
            <h1>Feedback & follow-up</h1>
            <p>Capture customer feedback, signatures, and follow-up needs.</p>
          </div>

          <div className="ffuCard">
            <div className="ffuCardHeader">
              <h2>Customer feedback</h2>
              <p>Rating and optional notes</p>
            </div>

            <div className="ffuField">
              <label className="ffuLabel">
                Customer Feedback<span className="pafRequired">*</span>
              </label>
              <div className="pafControl ffuControl">
                <IonSelect
                  placeholder="Select"
                  interface="popover"
                  value={feedback}
                  onIonChange={(e: CustomEvent) =>
                    setFeedback(e.detail.value ?? "")
                  }
                >
                  <IonSelectOption value="Very Good">Very Good</IonSelectOption>
                  <IonSelectOption value="Good">Good</IonSelectOption>
                  <IonSelectOption value="Satisfied">Satisfied</IonSelectOption>
                </IonSelect>
              </div>
              {formSubmitted && !feedback && (
                <IonBadge color="danger" className="ffuError">
                  Please select customer feedback
                </IonBadge>
              )}
            </div>

            <div className="ffuField">
              <label className="ffuLabel">Feedback Details</label>
              <div className="pafControl ffuControl">
                <IonInput
                  aria-label="Feedback details"
                  placeholder="Add notes (optional)"
                  value={feedbackDetails}
                  onIonChange={(e: CustomEvent) =>
                    setFeedbackDetails(e.detail.value ?? "")
                  }
                />
              </div>
            </div>
          </div>

          <div className="ffuCard">
            <div className="ffuCardHeader">
              <h2>Signatures</h2>
              <p>Customer and technician confirmation</p>
            </div>

            <div className="ffuSigBlock">
              <CustomerSignature
                ref={customerSignatureRef}
                setCustomerSignature={(signature) => {
                  setCustomerSignature(signature);
                  setIsCustomerSignatureSaved(true);
                }}
              />
              {formSubmitted && !customerSignature && (
                <IonBadge color="danger" className="ffuError">
                  Please provide customer signature and save it.
                </IonBadge>
              )}
            </div>

            <div className="ffuSigBlock">
              <TechnicianSignature
                ref={technicianSignatureRef}
                setTechnicianSignature={(signature: any) => {
                  setTechnicianSignature(signature);
                  setIsTechnicianSignatureSaved(true);
                }}
              />
              {formSubmitted && !technicianSignature && (
                <IonBadge color="danger" className="ffuError">
                  Please provide technician signature and save it.
                </IonBadge>
              )}
            </div>
          </div>

          <div className="ffuCard">
            <div className="ffuCardHeader">
              <h2>Follow-up</h2>
              <p>Schedule next visit if needed</p>
            </div>

            <div className="ffuField">
              <label className="ffuLabel">
                Follow-up Required<span className="pafRequired">*</span>
              </label>
              <div className="pafControl ffuControl">
                <IonSelect
                  placeholder="Select"
                  interface="popover"
                  value={followUpRequired}
                  onIonChange={(e: CustomEvent) =>
                    setFollowUpRequired(e.detail.value ?? "")
                  }
                >
                  <IonSelectOption value="Yes">Yes</IonSelectOption>
                  <IonSelectOption value="No">No</IonSelectOption>
                </IonSelect>
              </div>
              {formSubmitted && !followUpRequired && (
                <IonBadge color="danger" className="ffuError">
                  Please select follow-up requirement
                </IonBadge>
              )}
            </div>

            {followUpRequired === "Yes" && (
              <div className="ffuField">
                <label className="ffuLabel">
                  Follow-up Date<span className="pafRequired">*</span>
                </label>
                <IonDatetime
                  className="ffuDatetime"
                  presentation="date-time"
                  value={followUpDate || getCurrentDateTime()}
                  min={moment().tz("Asia/Dubai").format("YYYY-MM-DDTHH:mm:ss")}
                  onIonChange={(e: CustomEvent) =>
                    onFollowUpDateChange(e.detail.value ?? "")
                  }
                />
                {formSubmitted && !followUpDate && (
                  <IonBadge color="danger" className="ffuError">
                    Please select follow-up date
                  </IonBadge>
                )}
              </div>
            )}
          </div>
        </div>
      </IonContent>

      <IonFooter className="ion-footer">
        <IonToolbar>
          <div className="footerTwoBtnRow">
            <IonButton
              className="ion-button"
              fill="outline"
              color="medium"
              onClick={handleCancel}
              disabled={submitting}
            >
              Reset
            </IonButton>
            <IonButton
              className="ion-button"
              color="primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit"}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default FeedbackFollowup;

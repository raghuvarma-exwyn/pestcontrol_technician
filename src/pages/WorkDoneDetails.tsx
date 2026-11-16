import {
  IonButton,
  IonContent,
  IonPage,
  IonText,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonTextarea,
  IonToast,
  IonToolbar,
  IonFooter,
  IonProgressBar,
} from "@ionic/react";
import "./WorkDoneDetails.css";
import { useHistory } from "react-router";
import CommonHeader from "../components/CommonHeader";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { get } from "lodash";
import FullScreenLoader from "../components/FullScreenLoader";
import {
  ProgressStatus,
  updateTaskStatus,
} from "../data/localstorage/taskStatusStorage";
import useLongitudeLocation from "../components/useLongitudeLocation";
import { API_BASE_URL } from "../data/baseUrl";
import {
  fetchQuestionnaire,
  submitWorkDoneDetail,
} from "../data/apidata/taskApi/taskDataApi";
import { retrieveQuestionnaireBasedOnNetwork } from "../data/offline/entity/DataRetriever";
import { savePestWorkdoneBasedOnNetwork } from "../data/offline/entity/DataTransfer";
import { getCurrentLocation } from "../data/providers/GeoLocationProvider";

interface FormData {
  visit_id: string;
  [key: string]: any; // Add this line to allow dynamic keys
}
interface Answer {
  id: string;
  question_id: string;
  options: string;
  had_dependency: string;
  dependency_label: string | null;
}
interface Question {
  id: string;
  service_id: string;
  question: string;
  type: string;
  selection_type: string;
  status: string;
  sort: string;
  answers?: Answer[];
}

const WorkDoneDetails: React.FC = () => {
  const location = useLongitudeLocation();
  const [isFormValid, setIsFormValid] = useState(false); // To track if the form is valid
  const [showToast, setShowToast] = useState(false); // To control the visibility of the toast
  const [toastMessage, setToastMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingProgress, setSubmittingProgress] = useState(false);
  const [dependencyReason, setDependencyReason] = useState({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOptions, setSelectedOptions] = useState<{
    [key: number]: string[];
  }>({});

  // Ensure to update selectedOptions appropriately in your code where necessary.

  const {
    handleSubmit,
    register,
    control,
    setValue,
    trigger,
    watch,
    formState: { errors, isSubmitted },
    reset,
  } = useForm({ mode: "all" });

  const taskId = localStorage.getItem("activeTaskData");

  if (!taskId) {
    throw new Error("Task data is not available");
  }
  const activeTaskData = JSON.parse(taskId);

  const [formData, setFormData] = useState<FormData>({
    visit_id: activeTaskData.id,
  });
  const [userData, setUserData] = useState<any>(null);

  const history = useHistory();

  useEffect(() => {
    const fetchQuestionnaireData = async () => {
      try {
        setSubmittingProgress(true);
        const data = await retrieveQuestionnaireBasedOnNetwork();

        setQuestions(data);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
        setSubmittingProgress(false);
      }
    };

    fetchQuestionnaireData();
  }, []);

  useEffect(() => {
    fetchUserData();
  }, []);
  const getSelectedAnswerObject = (index: any, selectedValue: any) => {
    const question = questions[index];
    return question.answers.find(
      (answer: any) => answer.options === selectedValue
    );
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

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    console.log(data);
    if (!userData) {
      console.error("User Data is not available");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const workDone = data.questions.map((question: any) => {
        console.log("Question:", question); // Debug log
        console.log("Type:", question.type); // Log the type of each question
        const questionId = question.question_id;
        const answerId = Array.isArray(question.answer_id)
          ? question.answer_id.join(",")
          : question.answer_id || "";
        const dependencyLabelText = question.reason || "";
        // const descriptive = question.answer || ""; // Assuming descriptive answers are stored in `question.answer`
        const descriptive = Array.isArray(question.answer)
          ? question.answer.join(",")
          : question.answer || "";

        // Check if either answerId or descriptive is present
        if (!answerId && !descriptive) {
          throw new Error(
            `Either option_id or descriptive must be provided for question ${questionId}`
          );
        }

        console.log("Descriptive:", descriptive); // Debug log

        return {
          question_id: questionId,
          option_id: answerId,
          dependency_label_text: dependencyLabelText,
          descriptive: descriptive,
        };
      });
      let geolocation: any = await getCurrentLocation();
      const latitude = geolocation.coords.latitude; // Assuming location is an object with latitude
      const longitude = geolocation.coords.longitude; // Assuming location is an object with longitude
      const visit_id = formData.visit_id; // Assuming formData is an object with visit_id

      console.log(workDone);
      if (latitude !== null && longitude !== null) {
        const responseData = await savePestWorkdoneBasedOnNetwork(
          latitude,
          longitude,
          visit_id,
          workDone
        );
        // Check the structure of responseData.data
        if (responseData && responseData.data) {
          // Store the data in session storage
          localStorage.setItem("workDataArray", JSON.stringify([data]));
          console.log(
            "Stored workDataArray:",
            localStorage.getItem("workDataArray")
          );
        } else {
          console.error("No data field in responseData");
        }
      } else {
        console.error("Latitude or Longitude is null");
      }
      updateTaskStatus("", "workDoneDetails", ProgressStatus.done);
      history.push("/taskexecution");
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
    }
  };

  const handleInputChange = (index: number, field: string, value: any) => {
    const selectedAnswer = Array.isArray(questions[index].answers)
      ? questions[index].answers.find((answer: any) => answer.options === value)
      : undefined;

    const selectedAnswerId = selectedAnswer ? selectedAnswer.id : null;

    // Determine if the field being updated is a reason field
    const isReasonField = field.includes('.reason');

    // Get the current answer value if we're updating the reason field
    const currentAnswer = isReasonField
      ? formData[`questions[${index}].answer`]
      : value;

    // Find the selected answer for the current answer value if we're updating the reason field
    const currentSelectedAnswer = isReasonField
      ? questions[index].answers.find((answer: any) => answer.options === currentAnswer)
      : selectedAnswer;

    const currentSelectedAnswerId = currentSelectedAnswer ? currentSelectedAnswer.id : null;

    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
      [`questions[${index}].answer_id`]: isReasonField ? currentSelectedAnswerId : selectedAnswerId,
    }));

    setValue(field, value, { shouldValidate: true });
    setValue(`questions[${index}].answer_id`, isReasonField ? currentSelectedAnswerId : selectedAnswerId, {
      shouldValidate: true,
    });

    // Clear the reason field if the answer is "No"
    if (value === "No" && !isReasonField) {
      setFormData((prevData) => ({
        ...prevData,
        [field]: value,
        [`questions[${index}].reason`]: "",
      }));
      setValue(field, value, { shouldValidate: true });
      setValue(`questions[${index}].reason`, "", { shouldValidate: true });
    }
  };

  const handleMultipleSelectionChange = (
    index: number,
    field: string,
    values: any[]
  ) => {
    const selectedAnswerIds = values
      .map((value) => {
        const selectedAnswer = questions[index].answers.find(
          (answer: any) => answer.options === value
        );
        return selectedAnswer ? selectedAnswer.id : null;
      })
      .filter((id) => id !== null);

    setSelectedOptions((prev) => ({
      ...prev,
      [index]: values,
    }));

    setValue(field, values, { shouldValidate: true });
    setValue(`questions[${index}].answer_id`, selectedAnswerIds, {
      shouldValidate: true,
    });
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setValue(field, value, { shouldValidate: true });
  };

  const handleReasonChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setValue(field, value, { shouldValidate: true });
  };

  const handleCancel = async () => {
    // Display a confirmation alert using swal
    const willReset = await swal({
      title: "Are you sure?",
      text: "Do you want to reset all changes? This action cannot be undone.",
      buttons: ["Cancel", "OK"],
    });

    // If the user confirms, proceed with the reset
    if (willReset) {
      // Reset the form using the reset method
      reset({ visit_id: activeTaskData.id });
    }
  };

  const renderSelect = (
    index: number,
    answers: any[],
    multiple: boolean,
    onChange: (value: any) => void
  ) => (
    <div className="pafControl wddControl">
      <Controller
        name={`questions[${index}].answer`}
        control={control}
        rules={{
          required: {
            value: true,
            message: "This field is required",
          },
        }}
        render={({ field }) => (
          <IonSelect
            {...field}
            className="pafSelect"
            placeholder="Select"
            multiple={multiple}
            interface="popover"
            onIonChange={(e) => {
              field.onChange(e.detail.value);
              onChange(e.detail.value);
            }}
          >
            {answers.map((answer: any) => (
              <IonSelectOption key={answer.id} value={answer.options}>
                {answer.options}
              </IonSelectOption>
            ))}
          </IonSelect>
        )}
      />
    </div>
  );

  return (
    <IonPage className="workDonePage">
      <CommonHeader
        backToPath={"/taskexecution"}
        pageTitle={"Work Done Details"}
        showIcons={false}
      />
      <form onSubmit={handleSubmit(onSubmit)} className="workDoneForm">
        <IonContent className="ionContentColor workDoneContent">
          {submittingProgress && <IonProgressBar type="indeterminate" />}
          <div className="workDoneInner">
            <div className="workDoneIntro">
              <h1>Work Done Questionnaire</h1>
              <p>Answer each question to complete this visit step.</p>
            </div>

            {questions.map((item, index) => (
              <div className="wddCard" key={index}>
                <div className="wddCardHeader">
                  <span className="wddIndex">{index + 1}</span>
                  <label className="wddLabel">
                    {item.questions.question}
                    <span className="pafRequired">*</span>
                  </label>
                </div>

                {item.questions.type.toLowerCase() === "descriptive" && (
                  <div className="pafControl wddControl wddTextarea">
                    <IonTextarea
                      aria-label="Text"
                      className="pafInput"
                      placeholder="Enter text"
                      autoGrow={true}
                      {...register(`questions[${index}].answer`, {
                        required: "This field is required",
                      })}
                      onIonChange={(e) =>
                        handleInputChange(
                          index,
                          `questions[${index}].answer`,
                          e.detail.value
                        )
                      }
                    />
                  </div>
                )}

                {(item.questions.type.toLowerCase() === "selection" ||
                  item.questions.type.toLowerCase() === "mcq") &&
                  String(item.questions.selection_type || "")
                    .toLowerCase() === "single" && (
                  <>
                    {renderSelect(index, item.answers || [], false, (value) =>
                      handleInputChange(
                        index,
                        `questions[${index}].answer`,
                        value
                      )
                    )}
                    {isSubmitted &&
                      get(errors, `questions[${index}].answer`) && (
                        <IonBadge color="danger" className="wddError">
                          {String(
                            get(errors, `questions[${index}].answer.message`)
                          )}
                        </IonBadge>
                      )}

                    {["Yes", "MCQ", "Selection Type Single"].includes(
                      watch(`questions[${index}].answer`)
                    ) &&
                      getSelectedAnswerObject(
                        index,
                        watch(`questions[${index}].answer`)
                      )?.had_dependency === "1" && (
                        <div className="wddReason">
                          <label className="wddLabel">
                            Reason for Yes
                            <span className="pafRequired">*</span>
                          </label>
                          <div className="pafControl wddControl wddTextarea">
                            <IonTextarea
                              aria-label="Reason"
                              className="pafInput"
                              placeholder="Description"
                              autoGrow={true}
                              {...register(`questions[${index}].reason`, {
                                required: {
                                  value: true,
                                  message: "Reason is required",
                                },
                              })}
                              onIonInput={(e) => {
                                handleInputChange(
                                  index,
                                  `questions[${index}].reason`,
                                  e.detail.value
                                );
                                trigger(`questions[${index}].reason`);
                              }}
                            />
                          </div>
                          {(errors?.questions as any)?.[index]?.reason && (
                            <IonBadge color="danger" className="wddError">
                              {(errors.questions as any)[index].reason.message}
                            </IonBadge>
                          )}
                        </div>
                      )}

                    {["No", "NA"].includes(
                      watch(`questions[${index}].answer`)
                    ) &&
                      getSelectedAnswerObject(
                        index,
                        watch(`questions[${index}].answer`)
                      )?.had_dependency === "1" && (
                        <div className="wddReason">
                          <label className="wddLabel">
                            Reason for{" "}
                            {watch(`questions[${index}].answer`) === "No"
                              ? "No"
                              : "NA"}
                            <span className="pafRequired">*</span>
                          </label>
                          <div className="pafControl wddControl wddTextarea">
                            <IonTextarea
                              aria-label="Reason"
                              className="pafInput"
                              placeholder="Description"
                              autoGrow={true}
                              {...register(`questions[${index}].reason`, {
                                required: {
                                  value: true,
                                  message: "Reason is required",
                                },
                              })}
                              onIonInput={(e) =>
                                handleInputChange(
                                  index,
                                  `questions[${index}].reason`,
                                  e.detail.value
                                )
                              }
                            />
                          </div>
                          {(errors?.questions as any)?.[index]?.reason && (
                            <IonBadge color="danger" className="wddError">
                              {(errors.questions as any)[index].reason.message}
                            </IonBadge>
                          )}
                        </div>
                      )}
                  </>
                )}

                {item.questions.type.toLowerCase() === "selection" &&
                  item.questions.selection_type.toLowerCase() ===
                    "multiple" && (
                    <>
                      {renderSelect(
                        index,
                        item.answers || [],
                        true,
                        (value) =>
                          handleMultipleSelectionChange(
                            index,
                            `questions[${index}].answer`,
                            value
                          )
                      )}
                      {isSubmitted &&
                        get(errors, `questions[${index}].answer`) && (
                          <IonBadge color="danger" className="wddError">
                            {String(
                              get(errors, `questions[${index}].answer.message`)
                            )}
                          </IonBadge>
                        )}
                    </>
                  )}

                {item.questions.type.toLowerCase() === "mcq" &&
                  item.questions.selection_type.toLowerCase() === "multi" && (
                    <>
                      {renderSelect(
                        index,
                        item.answers || [],
                        true,
                        (value) =>
                          handleMultipleSelectionChange(
                            index,
                            `questions[${index}].answer`,
                            value
                          )
                      )}
                      {get(errors, `questions[${index}].answer`) && (
                        <IonBadge color="danger" className="wddError">
                          {String(
                            get(errors, `questions[${index}].answer.message`)
                          )}
                        </IonBadge>
                      )}

                      {watch(`questions[${index}].answer`)?.includes(
                        "Yes"
                      ) && (
                        <div className="wddReason">
                          <label className="wddLabel">
                            Reason for Yes
                            <span className="pafRequired">*</span>
                          </label>
                          <div className="pafControl wddControl wddTextarea">
                            <IonTextarea
                              aria-label="Reason"
                              className="pafInput"
                              placeholder="Description"
                              autoGrow={true}
                              {...register(`questions[${index}].reason`, {
                                required: {
                                  value: true,
                                  message:
                                    "Reason is required when Yes is selected",
                                },
                              })}
                              onIonChange={(e) =>
                                handleInputChange(
                                  index,
                                  `questions[${index}].reason`,
                                  e.detail.value
                                )
                              }
                            />
                          </div>
                          {(errors?.questions as any)?.[index]?.reason && (
                            <IonBadge color="danger" className="wddError">
                              {(errors.questions as any)[index].reason.message}
                            </IonBadge>
                          )}
                        </div>
                      )}
                    </>
                  )}

                <input
                  type="hidden"
                  {...register(`questions[${index}].question_id`)}
                  value={item.questions.id}
                />
                <input
                  type="hidden"
                  {...register(`questions[${index}].dependency_label`)}
                  value={item.questions.dependency_label}
                />
              </div>
            ))}
          </div>
        </IonContent>

        <IonFooter className="ion-footer ion-no-border">
          <IonToolbar className="ionFooterTwoButtons">
            <IonButton
              className="ion-button"
              fill="outline"
              color="medium"
              onClick={handleCancel}
            >
              Reset
            </IonButton>
            <IonButton type="submit" className="ion-button" color="primary">
              Submit
            </IonButton>
          </IonToolbar>
        </IonFooter>
      </form>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
      />
      <FullScreenLoader isLoading={submitting} />
    </IonPage>
  );
};

export default WorkDoneDetails;

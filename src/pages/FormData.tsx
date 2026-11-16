import {
  IonBadge,
  IonContent,
  IonImg,
  IonPage,
  IonProgressBar,
  IonThumbnail,
} from "@ionic/react";
import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import CommonHeader from "../components/CommonHeader";
import { getvistexecutionApi } from "../data/apidata/taskApi/taskDataApi";
import { toast } from "react-toastify";
import { formatDate, formatTime } from "../utils/dateTimeUtils";
import GoTop from "../components/GoTop";
import "./FormData.css";

const Field = ({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) => (
  <div className="fdField">
    <span className="fdLabel">{label}</span>
    <p className={`fdValue${!value || value === "N/A" ? " fdValueMuted" : ""}`}>
      {value || "N/A"}
    </p>
  </div>
);

const FormData: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [taskId]);

  const fetchData = async () => {
    const userDataString = localStorage.getItem("userData");
    if (!userDataString) {
      console.error("User Data is not available");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const responseData = await getvistexecutionApi({ visit_id: taskId });

      if (responseData.success) {
        setFormData(responseData.data || {});
      } else {
        console.error("Failed to fetch task initiation data");
      }
    } catch (error) {
      console.error("Error fetching data", error);
      toast.error("Server not responding. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const splitPhotos = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const leadTech = formData?.team?.[0];
  const selectedTechs =
    formData?.team && formData.team.length > 1 ? formData.team.slice(1) : [];

  return (
    <IonPage className="formDataPage">
      <CommonHeader
        backToPath={"/forms"}
        pageTitle={"Form Data"}
        showIcons={false}
      />
      <IonContent className="ionContentColor formDataContent">
        {loading && <IonProgressBar type="indeterminate" />}
        <div className="formDataInner">
          <div className="formDataIntro">
            <h1>Visit form summary</h1>
            <p>Review attendance, activity, chemicals, and feedback.</p>
          </div>

          <section className="fdCard">
            <div className="fdCardHeader">
              <div>
                <h2>Site Name</h2>
                <p>Service location</p>
              </div>
            </div>
            {formData?.site_name ? (
              <h3 className="fdSiteValue">{formData.site_name}</h3>
            ) : (
              <p className="fdEmpty">No site name found.</p>
            )}
          </section>

          <section className="fdCard">
            <div className="fdCardHeader">
              <div>
                <h2>Team Attendance</h2>
                <p>Lead and selected technicians</p>
              </div>
              {formData?.team?.length > 0 ? (
                <IonBadge color="primary" className="fdBadge">
                  {formData.team.length}
                </IonBadge>
              ) : null}
            </div>

            {leadTech ? (
              <div className="fdPerson">
                <IonThumbnail className="fdPersonIcon">
                  <IonImg src="assets/images/technician-icon.svg" />
                </IonThumbnail>
                <div className="fdPersonBody">
                  <h3>{leadTech.first_name}</h3>
                  <h6>{leadTech.mobile_no || "—"}</h6>
                </div>
              </div>
            ) : (
              <p className="fdEmpty">No technicians found.</p>
            )}

            {selectedTechs.length > 0 ? (
              <>
                <div className="fdSubHead">
                  Selected Technicians
                  <IonBadge color="primary" className="fdBadge">
                    {selectedTechs.length}
                  </IonBadge>
                </div>
                {selectedTechs.map((technician: any, index: number) => (
                  <div className="fdPerson" key={technician.id || index}>
                    <IonThumbnail className="fdPersonIcon">
                      <IonImg src="assets/images/technician-icon.svg" />
                    </IonThumbnail>
                    <div className="fdPersonBody">
                      <h4>{technician.first_name}</h4>
                      <h6>{technician.mobile_no || "—"}</h6>
                    </div>
                  </div>
                ))}
              </>
            ) : null}
          </section>

          <section className="fdCard">
            <div className="fdCardHeader">
              <div>
                <h2>Task Initiation</h2>
                <p>Start tracking details</p>
              </div>
            </div>
            {formData?.task_initiation?.length > 0 ? (
              formData.task_initiation.map((initiation: any, index: number) => (
                <div className="fdEntry" key={initiation.id || index}>
                  <Field
                    label="Date and Time"
                    value={
                      initiation?.date_time
                        ? `${formatDate(initiation.date_time)} ${formatTime(
                            initiation.date_time
                          )}`
                        : "N/A"
                    }
                  />
                  <Field label="Log Type" value={initiation?.log_type} />
                  <Field
                    label="Tracking Type"
                    value={initiation?.tracking_type}
                  />
                  <Field label="Latitude" value={initiation?.latitude} />
                  <Field label="Longitude" value={initiation?.longitude} />
                </div>
              ))
            ) : (
              <p className="fdEmpty">No Task Initiation details found.</p>
            )}
          </section>

          <section className="fdCard" id="pestActivitySection">
            <div className="fdCardHeader">
              <div>
                <h2>Pest Activity Found</h2>
                <p>Observed activity and photos</p>
              </div>
            </div>
            {formData?.pests_found?.length > 0 ? (
              formData.pests_found.map((pest: any, index: number) => {
                const pestPhotos = splitPhotos(pest.pest_photo);
                const imagePath = formData.pests_found_image_path || "";
                return (
                  <div className="fdEntry" key={pest.id || index}>
                    <Field
                      label="Pest Activity Found"
                      value={pest.pest_report_type}
                    />
                    <Field label="Pest Found" value={pest.is_pest_found} />
                    <Field label="Activity Level" value={pest.pest_severity} />
                    <Field
                      label="Chemical added"
                      value={pest.is_chemical_added}
                    />
                    <Field label="Area" value={pest.pest_area} />
                    <div className="fdField">
                      <span className="fdLabel">Photo of Pest Found</span>
                      {pestPhotos.length > 0 ? (
                        <div className="fdMediaGrid">
                          {pestPhotos.map((media: string, mediaIndex: number) => (
                            <IonImg
                              key={`${pest.id || index}-photo-${mediaIndex}`}
                              src={`${imagePath}${media}`}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="fdValue fdValueMuted">No photos</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="fdEmpty">No pest activity details found.</p>
            )}
          </section>

          <section className="fdCard">
            <div className="fdCardHeader">
              <div>
                <h2>Recommendations</h2>
                <p>Suggested follow-up actions</p>
              </div>
            </div>
            {formData?.pests_recommendations?.length > 0 ? (
              formData.pests_recommendations.map(
                (recommendation: any, index: number) => {
                  const mediaList = Array.isArray(
                    recommendation.recommended_media
                  )
                    ? recommendation.recommended_media
                    : [];
                  return (
                    <div
                      className="fdEntry"
                      key={recommendation.id || index}
                    >
                      <Field
                        label="Pest Activity Found"
                        value={recommendation.pest_report_type || "N/A"}
                      />
                      <Field
                        label="Do you want to add recommendations?"
                        value={
                          recommendation.is_recommendation_added || "N/A"
                        }
                      />
                      <Field
                        label="Recommendation Type"
                        value={recommendation.recommendation_type || "N/A"}
                      />
                      <Field
                        label="Recommendation"
                        value={recommendation.recommendations || "N/A"}
                      />
                      <Field
                        label="PSD able to Provide Service?"
                        value={recommendation.is_service_available || "N/A"}
                      />
                      <div className="fdField">
                        <span className="fdLabel">
                          Photo of Recommendations
                        </span>
                        {mediaList.length > 0 ? (
                          <div className="fdMediaGrid">
                            {mediaList.map((media: any, mediaIndex: number) => (
                              <IonImg
                                key={`${recommendation.id || index}-rec-${mediaIndex}`}
                                src={`${formData.pests_recommendations_image_path || ""}${media}`}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="fdValue fdValueMuted">
                            No media available
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              )
            ) : (
              <p className="fdEmpty">No recommendations found.</p>
            )}
          </section>

          <section className="fdCard">
            <div className="fdCardHeader">
              <div>
                <h2>Chemical Used</h2>
                <p>Products and quantities</p>
              </div>
            </div>
            {formData?.materials_used?.length > 0 ? (
              <>
                <div className="fdChemHead">
                  <span>Products</span>
                  <span>Quantity</span>
                </div>
                {formData.materials_used.map((material: any) => (
                  <div className="fdChemRow" key={material.id}>
                    <p className="fdChemName">{material.item_name}</p>
                    <p className="fdChemQty">
                      {material.quantity} {material.unit_name}
                    </p>
                  </div>
                ))}
              </>
            ) : (
              <p className="fdEmpty">No chemical usage data available.</p>
            )}
          </section>

          <section className="fdCard">
            <div className="fdCardHeader">
              <div>
                <h2>Work Done Details</h2>
                <p>Questionnaire responses</p>
              </div>
            </div>
            {formData?.work_done_details?.length > 0 ? (
              formData.work_done_details.map((workDetail: any) => {
                const type = String(workDetail.type || "").toLowerCase();
                const selectionType = String(
                  workDetail.selection_type || ""
                ).toLowerCase();
                let answer: React.ReactNode = "N/A";

                if (type === "descriptive") {
                  answer = workDetail.descriptive;
                } else if (
                  (type === "selection" || type === "mcq") &&
                  (selectionType === "single" ||
                    selectionType === "multi" ||
                    selectionType === "multiple")
                ) {
                  answer = workDetail.options;
                }

                return (
                  <div className="fdEntry" key={workDetail.id}>
                    <Field label={workDetail.question} value={answer} />
                    {String(workDetail.had_dependency) === "1" ? (
                      <Field
                        label={
                          workDetail.dependency_label || "Description"
                        }
                        value={workDetail.dependency_label_text}
                      />
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="fdEmpty">No data found.</p>
            )}
          </section>

          <section className="fdCard">
            <div className="fdCardHeader">
              <div>
                <h2>Feedback & Follow-up</h2>
                <p>Customer confirmation</p>
              </div>
            </div>
            {formData?.feedback_details?.length > 0 ? (
              formData.feedback_details.map((feedbackDetail: any) => (
                <div className="fdEntry" key={feedbackDetail.id}>
                  <Field
                    label="Customer Feedback"
                    value={feedbackDetail.customer_feedback}
                  />
                  <div className="fdField">
                    <span className="fdLabel">Customer Signature</span>
                    <div className="fdSigBox">
                      <IonImg
                        src={`${formData.signature_path || ""}${
                          feedbackDetail.customer_signature || ""
                        }`}
                      />
                    </div>
                  </div>
                  <div className="fdField">
                    <span className="fdLabel">Technician Signature</span>
                    <div className="fdSigBox">
                      <IonImg
                        src={`${formData.signature_path || ""}${
                          feedbackDetail.technician_signature || ""
                        }`}
                      />
                    </div>
                  </div>
                  <Field
                    label="Feedback Details"
                    value={feedbackDetail.feedback}
                  />
                  <Field
                    label="Follow-Up Required"
                    value={feedbackDetail.is_follow_up_required}
                  />
                  {feedbackDetail.is_follow_up_required === "Yes" ? (
                    <Field
                      label="Follow-Up Date"
                      value={formatDate(feedbackDetail.next_follow_up)}
                    />
                  ) : null}
                  <Field
                    label="Completed Date"
                    value={`${formatDate(
                      feedbackDetail.created_on
                    )} ${formatTime(feedbackDetail.created_on)}`}
                  />
                </div>
              ))
            ) : (
              <p className="fdEmpty">No feedback details found.</p>
            )}
          </section>
        </div>
      </IonContent>
      <GoTop />
    </IonPage>
  );
};

export default FormData;

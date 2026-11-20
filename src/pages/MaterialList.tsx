import React, { useState, useEffect, useMemo } from "react";
import { useHistory, useLocation } from "react-router";
import { getCurrentLocation } from "../data/providers/GeoLocationProvider";
import { requestMaterials, taskInit } from "../data/apidata/taskApi/taskDataApi";
import { getDateTime } from "../utils/dateTimeUtils";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonPage,
  IonProgressBar,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { toast } from "react-toastify";
import CustomBackButton from "../components/CustomBackButton";
import { retrieveNetworkTasksExecutionDetails } from "../data/offline/entity/DataRetriever";
import {
  buildUsedQtyIndexes,
  getUsedQuantityForItem,
  materialUsageKey,
} from "../utils/visitChemicalUsage";
import "./MaterialList.css";

interface Material {
  id: number;
  item_id?: string | number;
  item_name: string;
  quantity: string;
  on_hand_quantity?: string | number;
  name: string;
  treatment_type: string;
  unit: string;
  packaging_uom: string;
}

const parseQty = (qty: string | number | undefined) => {
  if (typeof qty === "number" && Number.isFinite(qty)) return qty;
  const parsed = parseFloat(String(qty ?? "").trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatQty = (qty: string | number | undefined) => {
  const parsed = parseQty(qty);
  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(2);
};

const MaterialList: React.FC = () => {
  const history = useHistory();
  const location = useLocation<{
    showAlert?: boolean;
    logType?: string;
    trackingType?: string;
  }>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [requestButtonStatus, setRequestButtonStatus] = useState<boolean>(true);
  const [requestButtonName, setRequestButtonName] = useState<string>("Request");
  const [loading, setLoading] = useState<boolean>(true);
  const [requesting, setRequesting] = useState<boolean>(false);
  const [usedByItem, setUsedByItem] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const userDataString = localStorage.getItem("userData");
    if (!userDataString) {
      console.error("User data is not available");
      setLoading(false);
      return;
    }

    const pos = await getCurrentLocation();
    if (!pos) {
      console.error("Error fetching Location");
      setLoading(false);
      toast.error("Failed to fetch location.");
      return;
    }

    try {
      setLoading(true);
      const formattedDate = getDateTime();
      const taskDataStr = localStorage.getItem("activeTaskData");
      if (!taskDataStr) {
        throw new Error("Task data is not available");
      }
      const activeTaskData = JSON.parse(taskDataStr);
      const taskId = activeTaskData.id;
      const serviceStatus = (activeTaskData.service_status || "").toLowerCase();
      const isResume =
        serviceStatus === "on going" || serviceStatus === "paused";
      const logType =
        location.state?.logType ||
        (isResume ? "Service Request Resume" : "Service Request Start");
      const trackingType =
        location.state?.trackingType ||
        (isResume ? "Service Resumed" : "Service Initiated");

      const { response, data } = await taskInit(
        taskId,
        formattedDate,
        logType,
        trackingType
      );

      if (response.ok) {
        const itemsData = Array.isArray(data.data) ? data.data : [];
        setMaterials(itemsData);
        setRequestButtonStatus(Boolean(data.enable_request));
        setRequestButtonName(data.enable_request ? "Request" : "Requested");

        try {
          const executionDetails =
            await retrieveNetworkTasksExecutionDetails(taskId);
          const usedIndexes = buildUsedQtyIndexes(executionDetails);
          const usedMap: Record<string, number> = {};
          itemsData.forEach((item: Material) => {
            usedMap[materialUsageKey(item)] = getUsedQuantityForItem(
              usedIndexes,
              item
            );
          });
          setUsedByItem(usedMap);
        } catch (usageError) {
          console.error("Error fetching chemical usage:", usageError);
          setUsedByItem({});
        }
      } else {
        console.error("Failed to fetch items. Status:", response.status);
        toast.error("Failed to load materials.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Server not responding. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const requestMaterial = async () => {
    if (requesting || !requestButtonStatus) return;
    try {
      setRequesting(true);
      const { response, data } = await requestMaterials(materials);
      if (response.ok) {
        toast.success("Request sent");
        setRequestButtonStatus(false);
        setRequestButtonName("Requested");
      } else {
        console.error(data.message);
        toast.error(data.message || "Failed to send request.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Server not responding. Please try again later.");
    } finally {
      setRequesting(false);
    }
  };

  const handleCancel = () => {
    history.goBack();
  };

  const remainingQty = (material: Material) =>
    Math.max(
      0,
      parseQty(material.on_hand_quantity) -
        (usedByItem[materialUsageKey(material)] ?? 0)
    );

  const shortCount = useMemo(
    () =>
      materials.filter(
        (material) => remainingQty(material) < parseQty(material.quantity)
      ).length,
    [materials, usedByItem]
  );

  return (
    <IonPage className="materialListPage">
      <IonHeader className="ion-no-border ion-padding-horizontal">
        <IonToolbar>
          <IonButtons slot="start" className="ion-no-padding">
            <IonButton onClick={handleCancel}>
              <CustomBackButton />
            </IonButton>
          </IonButtons>
          <IonTitle className="ion-float-start">Material List</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ionContentColor">
        {loading && <IonProgressBar type="indeterminate" color="primary" />}

        <div className="ion-padding-horizontal ion-padding-vertical ionPaddingBottom">
          {/* {!loading && materials.length > 0 && (
            <>
              <div className="materialListSummary">
                <div className="materialListStat">
                  <span className="materialListStatLabel">Items</span>
                  <span className="materialListStatValue">
                    {materials.length}
                  </span>
                </div>
                <div className={`materialListStat ${shortCount > 0 ? "short" : ""}`}>
                  <span className="materialListStatLabel">Short</span>
                  <span className="materialListStatValue">{shortCount}</span>
                </div>
              </div>
              {shortCount > 0 && (
                <p className="materialListBanner">
                  {shortCount} item{shortCount === 1 ? "" : "s"} below required
                  quantity. Request materials before starting.
                </p>
              )}
            </>
          )} */}

          {!loading && materials.length === 0 ? (
            <div className="materialEmpty">
              <h2>No materials listed</h2>
              <p>Nothing is required for this task yet.</p>
            </div>
          ) : (
            <div className="materialList">
              {materials.map((material) => {
                const unit = material.packaging_uom || "No Units";
                const usedQty = usedByItem[materialUsageKey(material)] ?? 0;
                const availableQty = remainingQty(material);
                const isShort = availableQty < parseQty(material.quantity);
                return (
                  <div
                    key={`${material.id}_${material.item_name}_${material.treatment_type}`}
                    className="materialCard"
                  >
                    <div className="materialCardHeader">
                      <h3>{material.item_name}</h3>
                      <span className={`materialBadge ${isShort ? "short" : "ok"}`}>
                        {isShort ? "Short" : "In stock"}
                      </span>
                    </div>
                    {material.treatment_type && (
                      <p className="materialTreatment">
                        Treatment Type: {material.treatment_type}
                      </p>
                    )}
                    <div className="materialQtyRow three">
                      <div className="materialQtyBox">
                        <span className="materialQtyLabel">
                          Required
                        </span>
                        <span className="materialQtyValue">
                          {formatQty(material.quantity)}{" "}
                          <span className="materialQtyUnit">{unit}</span>
                        </span>
                      </div>
                      <div className={`materialQtyBox ${isShort ? "short" : "ok"}`}>
                        <span className="materialQtyLabel">
                          Available
                        </span>
                        <span className="materialQtyValue">
                          {formatQty(availableQty)}{" "}
                          <span className="materialQtyUnit">{unit}</span>
                        </span>
                      </div>
                      <div className="materialQtyBox">
                        <span className="materialQtyLabel">Used</span>
                        <span className="materialQtyValue">
                          {formatQty(usedQty)}{" "}
                          <span className="materialQtyUnit">{unit}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </IonContent>

      <IonFooter className="ion-footer">
        <IonToolbar className="ionFooterTwoButtons">
          <IonButton
            className="ion-button"
            fill="outline"
            color="medium"
            onClick={handleCancel}
          >
            Cancel
          </IonButton>
          <IonButton
            className="ion-button"
            fill="outline"
            color="primary"
            disabled={!requestButtonStatus || requesting || loading}
            onClick={requestMaterial}
          >
            {requesting ? "Requesting..." : requestButtonName}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default MaterialList;

import React, { useState, useEffect } from "react";
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonPage,
  IonProgressBar,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useHistory } from "react-router";
import { requestMaterials } from "../data/apidata/taskApi/taskDataApi";
import {
  retriveChemicalUsedBasedOnNetwork,
  retrieveChemicalUsedfromDB,
  retrieveNetworkTasksExecutionDetails,
} from "../data/offline/entity/DataRetriever";
import {
  buildUsedQtyIndexes,
  getUsedQuantityForItem,
  materialUsageKey,
} from "../utils/visitChemicalUsage";
import { Network } from "@capacitor/network";
import { toast } from "react-toastify";
import CustomBackButton from "../components/CustomBackButton";
import "./MaterialList.css";
import "./ChemicalUsedDetails.css";

interface ChemicalItem {
  id: string;
  item_name: string;
  available_qty: string;
  [key: string]: any;
}

interface PestOption {
  id: string;
  item_id?: string;
  unit_id?: string;
  item_name: string;
  available_qty: string;
  on_hand_quantity?: string | number;
  packaging_uom: string;
  required_qty?: string | number;
  quantity?: string | number;
}

const parseAvailableQty = (qty: string | number | undefined) => {
  if (typeof qty === "number" && Number.isFinite(qty)) return qty;
  const parsed = parseFloat(String(qty ?? "").trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatQty = (qty: string | number | undefined) => {
  const parsed = parseAvailableQty(qty);
  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(2);
};

const ChemicalUsedDetails: React.FC = () => {
  const history = useHistory();
  const [pestOptions, setPestOptions] = useState<PestOption[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<PestOption[]>([]);
  const [requestedItems, setRequestedItems] = useState<PestOption[]>([]);
  const [alreadyRequestedIds, setAlreadyRequestedIds] = useState<string[]>([]);
  const [title, setTitle] = useState<string>("Chemical List");
  const [selectedOptions, setSelectedOptions] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [requesting, setRequesting] = useState<boolean>(false);
  const [isChemicalnotFound, setChemicalnotFound] = useState<boolean>(false);
  const [usedByItem, setUsedByItem] = useState<Record<string, number>>({});

  const getOnHandQuantity = (option: PestOption) =>
    option.on_hand_quantity ?? option.available_qty;

  const getOptionKey = (option: PestOption) =>
    String(
      option.item_id != null && option.unit_id != null
        ? `${option.item_id}_${option.unit_id}`
        : option.item_id ?? option.unit_id ?? option.id
    );

  const getUsedQuantity = (option: PestOption) =>
    usedByItem[materialUsageKey(option)] ??
    usedByItem[getOptionKey(option)] ??
    0;

  const getRemainingQuantity = (option: PestOption) =>
    Math.max(
      0,
      parseAvailableQty(getOnHandQuantity(option)) - getUsedQuantity(option)
    );

  const isOutOfStock = (option: PestOption) => getRemainingQuantity(option) <= 0;

  const uniqueByUnitId = (list: PestOption[]) => {
    const uniqueMap = new Map<string, PestOption>();
    list.forEach((item) => {
      const key = `${item.item_id}_${item.unit_id}`;
      const existing = uniqueMap.get(key);
      if (
        !existing ||
        parseAvailableQty(getOnHandQuantity(item)) >
          parseAvailableQty(getOnHandQuantity(existing))
      ) {
        uniqueMap.set(key, item);
      }
    });
    return Array.from(uniqueMap.values());
  };

  useEffect(() => {
    const activeTaskData = JSON.parse(localStorage.getItem("activeTaskData")!);
    setTitle(activeTaskData.service_name);
    fetchPestOptions();
  }, []);

  const fetchPestOptions = async () => {
    try {
      setLoading(true);
      setChemicalnotFound(false);
      const loadUsedQuantities = async (list: PestOption[]) => {
        try {
          const activeTaskData = JSON.parse(
            localStorage.getItem("activeTaskData") || "{}"
          );
          const visitId = activeTaskData.id;
          if (!visitId) {
            setUsedByItem({});
            return;
          }
          const executionDetails =
            await retrieveNetworkTasksExecutionDetails(visitId);
          const usedIndexes = buildUsedQtyIndexes(executionDetails);
          const usedMap: Record<string, number> = {};
          list.forEach((item) => {
            const used = getUsedQuantityForItem(usedIndexes, item);
            usedMap[materialUsageKey(item)] = used;
            usedMap[getOptionKey(item)] = used;
          });
          setUsedByItem(usedMap);
        } catch (usageError) {
          console.error("Error fetching chemical usage:", usageError);
          setUsedByItem({});
        }
      };
      const networkStatus = await Network.getStatus();

      if (networkStatus.connected) {
        const { response, data } = await retriveChemicalUsedBasedOnNetwork();
        const chemicalList = Array.isArray(data?.data) ? data.data : [];
        const uniqueList = uniqueByUnitId(chemicalList);
        setPestOptions(uniqueList);
        if (
          response &&
          response.ok &&
          data?.success !== false &&
          chemicalList.length > 0
        ) {
          setChemicalnotFound(false);
        } else {
          setChemicalnotFound(true);
          if (data?.message) {
            toast.error(data.message, { toastId: "chemical-data-not-found" });
          }
        }
        await loadUsedQuantities(uniqueList);
      } else {
        const localData = await retrieveChemicalUsedfromDB();
        const chemicalList = Array.isArray(localData) ? localData : [];
        const uniqueList = uniqueByUnitId(chemicalList);
        setPestOptions(uniqueList);
        setChemicalnotFound(chemicalList.length === 0);
        await loadUsedQuantities(uniqueList);
      }
    } catch (error) {
      console.error("Error fetching pest options:", error);
      setPestOptions([]);
      setChemicalnotFound(true);
      toast.error("Server not responding. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (option: PestOption, checked: boolean) => {
    const optionKey = getOptionKey(option);

    if (isOutOfStock(option)) {
      if (alreadyRequestedIds.includes(optionKey)) {
        return;
      }
      if (checked) {
        setSelectedItems([]);
      }
      setRequestedItems((prev) => {
        if (checked) {
          return prev.some((item) => getOptionKey(item) === optionKey)
            ? prev
            : [...prev, option];
        }
        return prev.filter((item) => getOptionKey(item) !== optionKey);
      });
      return;
    }

    setSelectedItems((prev) => {
      if (checked) {
        return prev.some((item) => getOptionKey(item) === optionKey)
          ? prev
          : [...prev, option];
      }
      return prev.filter((item) => getOptionKey(item) !== optionKey);
    });
  };

  const requestMaterial = async () => {
    if (requestedItems.length === 0) {
      toast.error("Please select at least one out of stock material.");
      return;
    }

    try {
      setRequesting(true);
      const requestPayload = requestedItems.map(
        ({ required_qty, ...item }) => ({
          ...item,
          quantity: required_qty ?? item.quantity,
        })
      );
      const { response } = await requestMaterials(requestPayload);
      if (response.ok) {
        toast.success("Request sent");
        setAlreadyRequestedIds((prev) => [
          ...prev,
          ...requestedItems.map((item) => getOptionKey(item)),
        ]);
        setRequestedItems([]);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Server not responding. Please try again later.");
    } finally {
      setRequesting(false);
    }
  };

  useEffect(() => {
    const selectOpt = localStorage.getItem("selectedOptions");
    if (selectOpt) {
      setSelectedOptions(JSON.parse(selectOpt) || []);
    }
  }, []);

  const handleSubmit = () => {
    localStorage.setItem("selectedOptions", JSON.stringify(selectedOptions));
    const selectedPestActIndForChem = localStorage.getItem(
      "selectedPestActIndForChem"
    );

    if (!selectedPestActIndForChem) {
      console.error("No selected pest activity index found.");
      return;
    }

    if (selectedItems.length > 0) {
      const storedItems = localStorage.getItem(
        `selectedChemicalItems_${selectedPestActIndForChem}`
      );
      let selectedChemicalItems: ChemicalItem[] = storedItems
        ? JSON.parse(storedItems)
        : [];

      selectedChemicalItems = selectedChemicalItems.concat(
        selectedItems as ChemicalItem[]
      );

      const uniqueItemsMap = new Map<string, ChemicalItem>();
      selectedChemicalItems.forEach((item: ChemicalItem) => {
        uniqueItemsMap.set(getOptionKey(item as PestOption), item);
      });
      const uniqueSelectedChemicalItems = Array.from(uniqueItemsMap.values());

      localStorage.setItem(
        `selectedChemicalItems_${selectedPestActIndForChem}`,
        JSON.stringify(uniqueSelectedChemicalItems)
      );

      history.push({
        pathname: "/chemicalused",
        state: { selectedItems: uniqueSelectedChemicalItems },
      });
    } else {
      toast.error("Please select at least one chemical.");
    }
  };

  const handleSearch = (ev: CustomEvent) => {
    setSearchText((ev.target as HTMLIonSearchbarElement).value || "");
  };

  const filteredPestOptions = (
    Array.isArray(pestOptions) ? pestOptions : []
  )
    .filter((option) =>
      option.item_name?.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((a, b) => Number(isOutOfStock(a)) - Number(isOutOfStock(b)));

  const handleCancel = () => {
    history.push("/chemicalused");
  };

  const hasOutOfStock = pestOptions.some(isOutOfStock);
  const isItemChecked = (option: PestOption) => {
    const optionKey = getOptionKey(option);
    if (isOutOfStock(option)) {
      return requestedItems.some((item) => getOptionKey(item) === optionKey);
    }
    return selectedItems.some((item) => getOptionKey(item) === optionKey);
  };
  const isItemDisabled = (option: PestOption) => {
    if (isOutOfStock(option)) {
      return alreadyRequestedIds.includes(getOptionKey(option));
    }
    return requestedItems.length > 0;
  };

  return (
    <IonPage className="materialListPage chemicalUsedDetailsPage">
      <IonHeader className="ion-no-border ion-padding-horizontal">
        <IonToolbar>
          <IonButtons slot="start" className="ion-no-padding">
            <IonButton onClick={handleCancel}>
              <CustomBackButton />
            </IonButton>
          </IonButtons>
          <IonTitle className="ion-float-start">Chemical List</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ionContentColor">
        {loading && <IonProgressBar type="indeterminate" color="primary" />}

        <div className="ion-padding-horizontal ion-padding-vertical ionPaddingBottom">
          <IonSearchbar
            placeholder="Search chemicals / materials"
            value={searchText}
            debounce={500}
            onIonInput={handleSearch}
            onIonChange={(e) => setSearchText(e.detail.value || "")}
          />

          {!loading && filteredPestOptions.length === 0 ? (
            <div className="materialEmpty">
              <h2>
                {isChemicalnotFound
                  ? "Data not found"
                  : searchText
                    ? "No matching chemicals"
                    : "No chemicals available"}
              </h2>
              <p>
                {searchText
                  ? "Try a different search term."
                  : "Nothing is listed for this service yet."}
              </p>
            </div>
          ) : (
            <>
              {title && (
                <h1 className="headingH1">{title}</h1>
              )}
              <div className="materialList">
                {filteredPestOptions.map((option) => {
                  const unit = option.packaging_uom || "No Units";
                  const outOfStock = isOutOfStock(option);
                  const remaining = getRemainingQuantity(option);
                  const checked = isItemChecked(option);
                  return (
                    <div
                      key={getOptionKey(option)}
                      className={`materialCard chemicalCard${
                        outOfStock ? " outofstock" : ""
                      }${checked ? " selected" : ""}`}
                    >
                      <div className="chemicalCardBody">
                        <h3>{option.item_name}</h3>
                        <div
                          className={`chemicalAvailable${
                            outOfStock ? " short" : ""
                          }`}
                        >
                          <span className="chemicalAvailableLabel">
                            Available
                          </span>
                          <span className="chemicalAvailableValue">
                            {formatQty(remaining)}
                          </span>
                          <span className="chemicalAvailableUnit">{unit}</span>
                        </div>
                      </div>
                      <div className="chemicalCardMeta">
                        <span
                          className={`materialBadge ${
                            outOfStock ? "short" : "ok"
                          }`}
                        >
                          {outOfStock ? "Out of stock" : "In stock"}
                        </span>
                        <IonCheckbox
                          className="chemicalCardCheck"
                          value={getOptionKey(option)}
                          disabled={isItemDisabled(option)}
                          checked={checked}
                          onIonChange={(e) =>
                            handleCheckboxChange(option, !!e.detail.checked)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </IonContent>

      <IonFooter className="ion-footer">
        <IonToolbar
          className={
            hasOutOfStock ? "ionFooterThreeButtons" : "ionFooterTwoButtons"
          }
        >
          <IonButton
            className="ion-button"
            fill="outline"
            color="medium"
            onClick={handleCancel}
          >
            Cancel
          </IonButton>
          {hasOutOfStock && (
            <IonButton
              className="ion-button"
              fill="outline"
              color="primary"
              disabled={requestedItems.length === 0 || requesting}
              onClick={requestMaterial}
            >
              {requesting ? "Requesting..." : "Request"}
            </IonButton>
          )}
          <IonButton
            className="ion-button"
            color="primary"
            onClick={handleSubmit}
            disabled={selectedItems.length === 0}
          >
            Submit
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default ChemicalUsedDetails;

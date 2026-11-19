import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonFooter,
  IonPage,
  IonSearchbar,
  IonButton,
  IonItem,
  IonCheckbox,
  IonToolbar,
  IonSelect,
  IonSelectOption,
  IonList,
  IonText,
  IonProgressBar, // Import IonProgressBar
  // Import IonProgressBar
} from "@ionic/react";
import { useHistory } from "react-router";
import { fetchGetPestChemicalItems, requestMaterials } from "../data/apidata/taskApi/taskDataApi";
import {
  retriveChemicalUsedBasedOnNetwork,
  retrieveChemicalUsedfromDB,
} from "../data/offline/entity/DataRetriever";
import { Network } from "@capacitor/network";
import { retrievePestActivityBasedOnNetwork } from "../data/offline/entity/DataRetriever";
import { toast } from "react-toastify";
interface ChemicalItem {
  id: string;
  item_name: string;
  available_qty: string;
  [key: string]: any;
}

// Define a type for the pest option
interface PestOption {
  id: string;
  item_id?: string;
  unit_id?: string;
  item_name: string;
  available_qty: string;
  packaging_uom: string;
  required_qty?: string | number;
  quantity?: string | number;
}

const ChemicalUsedDetails: React.FC = () => {
  const history = useHistory();
  const [pestOptions, setPestOptions] = useState<PestOption[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<PestOption[]>([]);
  const [requestedItems, setRequestedItems] = useState<PestOption[]>([]);
  const [alreadyRequestedIds, setAlreadyRequestedIds] = useState<string[]>([]);
  const [title, setTitle] = useState<string>("Chemical List");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState("");
  const [loading, setLoading] = useState<boolean>(true); // State for loading indicator
  const [isChemicalnotFound, setChemicalnotFound] = useState<boolean>(false);

  const isOutOfStock = (option: PestOption) => Number(option.available_qty) <= 0;

  const getOptionKey = (option: PestOption) =>
    String(
      option.item_id != null && option.unit_id != null
        ? `${option.item_id}_${option.unit_id}`
        : option.unit_id ?? option.item_id ?? option.id
    );

  const uniqueByUnitId = (list: PestOption[]) => {
    const uniqueMap = new Map<string, PestOption>();
    list.forEach((item) => {
      const key = getOptionKey(item);
      if (!uniqueMap.has(key)) {
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
      setLoading(true); // Start loading indicator
      setChemicalnotFound(false);
      const networkStatus = await Network.getStatus();
      // setIsOnline(networkStatus.connected);

      if (networkStatus.connected) {
        // Online: Fetch data from API
        const { response, data } = await retriveChemicalUsedBasedOnNetwork();
        const chemicalList = Array.isArray(data?.data) ? data.data : [];
        console.log("chemicalList", chemicalList);
        if (response && response.ok && data?.success !== false && chemicalList.length > 0) {
          setPestOptions(uniqueByUnitId(chemicalList));
          setChemicalnotFound(false);
        } else {
          
         // console.log("chemicalList", chemicalList);
          setPestOptions(uniqueByUnitId(chemicalList));
          setChemicalnotFound(true);
          if (data?.message) {
            toast.error(data.message, { toastId: "chemical-data-not-found" });
          }
        }
      } else {
        // Offline: Fetch data from local storage or handle offline scenario
        const localData = await retrieveChemicalUsedfromDB();
        const chemicalList = Array.isArray(localData) ? localData : [];
        setPestOptions(uniqueByUnitId(chemicalList));
        setChemicalnotFound(chemicalList.length === 0);
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
    }
  };

  // ==================getting option(yes,no) to localstorage===============
  useEffect(() => {
    const selectOpt = localStorage.getItem("selectedOptions");
    if (selectOpt) {
      setSelectedOptions(JSON.parse(selectOpt) || []);
    }
  }, []);
  console.log(selectedOptions);
  const handleSubmit = () => {
    // ==================setting option(yes,no) to localstorage===============

    localStorage.setItem("selectedOptions", JSON.stringify(selectedOptions));
    //
    const selectedPestActIndForChem = localStorage.getItem(
      "selectedPestActIndForChem"
    );

    if (!selectedPestActIndForChem) {
      console.error("No selected pest activity index found.");
      return;
    }

    if (selectedItems.length > 0) {
      // Retrieve the existing selected items from localStorage based on the key
      const storedItems = localStorage.getItem(
        `selectedChemicalItems_${selectedPestActIndForChem}`
      );
      let selectedChemicalItems: ChemicalItem[] = storedItems
        ? JSON.parse(storedItems)
        : [];

      // Append the new selected items to the existing ones
      selectedChemicalItems = selectedChemicalItems.concat(
        selectedItems as ChemicalItem[]
      );

      // Remove duplicate items based on item_id + unit_id
      const uniqueItemsMap = new Map<string, ChemicalItem>();
      selectedChemicalItems.forEach((item: ChemicalItem) => {
        uniqueItemsMap.set(getOptionKey(item as PestOption), item);
      });
      const uniqueSelectedChemicalItems = Array.from(uniqueItemsMap.values());

      // Save the updated array back to localStorage with the correct key
      localStorage.setItem(
        `selectedChemicalItems_${selectedPestActIndForChem}`,
        JSON.stringify(uniqueSelectedChemicalItems)
      );

      // Navigate to the chemical used page with the updated state
      history.push({
        pathname: "/chemicalused",
        state: { selectedItems: uniqueSelectedChemicalItems },
      });
    } else {
      alert("Please select at least one chemical.");
    }
  };

  const handleSearch = (ev: CustomEvent) => {
    setSearchText((ev.target as HTMLIonSearchbarElement).value || "");
  };

  const filteredPestOptions = (Array.isArray(pestOptions) ? pestOptions : []).filter(
    (option) =>
      option.item_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCancel = () => {
    history.push("/chemicalused");
  };

  return (
    <IonPage>
      <IonContent
        fullscreen
        className="ionContentColor ion-padding-vertical ion-padding-horizontal"
      >
        <IonSearchbar
          placeholder="Search By Chemicals / Materials"
          value={searchText}
          debounce={500}
          onIonInput={handleSearch}
          onIonChange={(e) => setSearchText(e.detail.value || "")} // Ensure that empty string is set when no value
        />

        {loading &&   // Render loading indicator if loading is true
          <IonProgressBar type="indeterminate" color="primary" />}
        {filteredPestOptions.length === 0 ? (
          !loading && (
            <p style={{ textAlign: "center", width: "100%" }}>
              {isChemicalnotFound ? "Data Not Found" : "No Chemicals Available"}
            </p>
          )
        ) : (


          <div className="ion-padding-vertical ionPaddingBottom">
            <h1 className="headingH1 ion-padding-top">
              {title}
            </h1>
            <IonList lines="full" class="ion-list-item listItemAll">
              {filteredPestOptions.map((option: any) => (
                <IonItem key={getOptionKey(option)} className={
                  isOutOfStock(option) ? "outofstock"
                    : ""
                }>
                  <IonText className="listCont">
                    <h3>{option.item_name}</h3>

                    <p>
                      Quantity: {option.available_qty} -{" "}
                      {option.packaging_uom || "No Units"}

                    </p>
                    {isOutOfStock(option) ? <span className="noStock">Out of stock</span> : ''}
                  </IonText>
                  <IonCheckbox
                    className="listContRight"
                    slot="end"
                    justify="end"
                    value={getOptionKey(option)}
                    disabled={
                      isOutOfStock(option)
                        ? alreadyRequestedIds.includes(getOptionKey(option))
                        : requestedItems.length > 0
                    }
                    checked={
                      isOutOfStock(option)
                        ? requestedItems.some(
                            (item) => getOptionKey(item) === getOptionKey(option)
                          )
                        : selectedItems.some(
                            (item) => getOptionKey(item) === getOptionKey(option)
                          )
                    }
                    onIonChange={(e) =>
                      handleCheckboxChange(option, !!e.detail.checked)
                    }
                  />

                </IonItem>
              ))}
            </IonList>
          </div>
        )}
      </IonContent>
      <IonFooter className="ion-footer">
        <IonToolbar
          className={
            pestOptions.some(isOutOfStock)
              ? "ionFooterThreeButtons"
              : "ionFooterTwoButtons"
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
          {pestOptions.some(isOutOfStock) && (
            <IonButton
              className="ion-button"
              fill="outline"
              color="primary"
              disabled={requestedItems.length === 0}
              onClick={requestMaterial}
            >
              Request
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

/** API origin — must remain HTTPS. */
export const API_BASE_URL = "https://rpwebapps.us/clients/landscape-dev/api";

if (!API_BASE_URL.toLowerCase().startsWith("https://")) {
  throw new Error("API_BASE_URL must use HTTPS.");
}
const si = "1R46ZHMYsk0tB42ODh8bjfRLM3qXFh7M4kViAPlK3ODg";
const ak = "AIzaSyBUE3Pk5RYcKYGwN";
const ff = "-9";
const ee = "Fw4wAfNipvrYKmjQ";
const range = "Sheet2!A1";
async function fetchSheetData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${si}/values/${range}?key=${ak.concat(ff,ee)}`;
    try {
        let response = await fetch(url);
        let data = await response.json();
        console.log(data);
        if (data.values) {
            document.getElementById("cellData").innerText = 'Remaining balance: ' + data.values[0][0];
        } else {
            document.getElementById("cellData").innerText = "No Data Found";
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        document.getElementById("cellData").innerText = "Error loading data";
    }
};

window.onload = fetchSheetData;
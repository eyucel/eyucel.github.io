---
layout: page
title: topspinterrace
---

<p id="cellData">Loading...</p>

<script>
    const sheetID = "1R46ZHMYsk0tB42ODh8bjfRLM3qXFh7M4kViAPlK3ODg"; // Replace with your Google Sheet ID
    const apiKey = "AIzaSyBWAQhZW7nT-b_1tRaiIh_rD1xZb2zMU0o"; // Replace with your API Key
    const range = "Sheet2!A1"; // Cell A1
    async function fetchSheetData() {
        //const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${range}`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${range}?key=${apiKey}`;
        try {
            let response = await fetch(url);
            let data = await response.json();
            
            if (data.values) {
                document.getElementById("cellData").innerText = 'Remaining balance: ' + data.values[0][0];
            } else {
                document.getElementById("cellData").innerText = "No Data Found";
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            document.getElementById("cellData").innerText = "Error loading data";
        }
    }

    window.onload = fetchSheetData;
</script>